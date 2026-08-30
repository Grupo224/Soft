/*! Página: Organigrama Vivo (/org) — estructura + relaciones semánticas sobre OS Org Node / OS Org Relation. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;
  var TYPE_ICON = { Company: "🏢", Department: "🏛", Designation: "🎖", Employee: "🧑", Agent: "🤖", Custom: "●" };
  var TYPE_RANK = { Company: 0, Department: 1, Designation: 2, Employee: 3, Agent: 3, Custom: 2 };

  function autoLayout(nodes, relations) {
    var byRank = {};
    nodes.forEach(function (n) {
      var r = TYPE_RANK[n.node_type] != null ? TYPE_RANK[n.node_type] : 2;
      (byRank[r] = byRank[r] || []).push(n);
    });
    Object.keys(byRank).sort().forEach(function (r) {
      byRank[r].forEach(function (n, i) { n.x = 60 + i * 220; n.y = 40 + r * 150; });
    });
  }

  function label(n) {
    return n.employee || n.agent || n.designation || n.department || n.company || n.title || n.name;
  }

  function load(container, root) {
    root.innerHTML =
      '<div class="os-canvas-toolbar">' +
      '<button class="os-btn sm" data-act="fit">⤢ Ajustar</button>' +
      '<button class="os-btn sm" data-act="zin">＋</button><button class="os-btn sm" data-act="zout">－</button>' +
      '<button class="os-btn sm primary" data-act="new-node">＋ Nodo</button>' +
      '<button class="os-btn sm" data-act="new-rel">↔ Relación</button>' +
      '</div>' +
      '<div class="os-canvas-legend"></div>' +
      '<svg class="os-canvas-svg"></svg>';

    Promise.all([
      api.list("OS Org Node", { fields: ["name", "node_type", "title", "company", "department", "designation", "employee", "agent", "x", "y", "is_active"], limit: 500 }),
      api.list("OS Org Relation", { fields: ["name", "from_node", "to_node", "relation_type", "label"], limit: 1000 })
    ]).then(function (r) {
      var nodes = r[0], relations = r[1];
      var needsLayout = nodes.some(function (n) { return !n.x && !n.y; });
      if (needsLayout) autoLayout(nodes, relations);

      var canvasNodes = nodes.map(function (n) { return { id: n.name, x: n.x || 0, y: n.y || 0, w: 168, h: 58, data: n }; });
      var canvasEdges = relations.map(function (rel) { return { from: rel.from_node, to: rel.to_node, label: rel.relation_type, cls: "" }; });

      var legend = root.querySelector(".os-canvas-legend");
      legend.innerHTML = Object.keys(TYPE_ICON).map(function (t) { return '<span class="os-tag">' + TYPE_ICON[t] + " " + t + "</span>"; }).join("");

      var engine = OS.canvas.create(root.querySelector(".os-canvas-svg"), {
        edgeAnchor: "tb",
        renderNode: function (g, n) {
          var d = n.data;
          var el1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
          el1.setAttribute("x", 12); el1.setAttribute("y", 22); el1.setAttribute("class", "n-title");
          el1.textContent = TYPE_ICON[d.node_type] + " " + (label(d) || "(sin nombre)").slice(0, 20);
          g.appendChild(el1);
          var el2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
          el2.setAttribute("x", 12); el2.setAttribute("y", 40); el2.setAttribute("class", "n-sub");
          el2.textContent = d.node_type + (d.is_active === 0 ? " · inactivo" : "");
          g.appendChild(el2);
        },
        onNodeClick: function (n) { openInspector(n.data, engine, relations, nodes); },
        onNodeDragEnd: function (n) {
          api.update("OS Org Node", n.id, { x: Math.round(n.x), y: Math.round(n.y) }).catch(ui.error);
        }
      });
      engine.setData(canvasNodes, canvasEdges);
      setTimeout(function () { engine.fit(); }, 30);

      root.querySelector('[data-act="fit"]').onclick = engine.fit;
      root.querySelector('[data-act="zin"]').onclick = function () { engine.zoom(0.15); };
      root.querySelector('[data-act="zout"]').onclick = function () { engine.zoom(-0.15); };
      root.querySelector('[data-act="new-node"]').onclick = function () { openCreateNode(container, root); };
      root.querySelector('[data-act="new-rel"]').onclick = function () { openCreateRelation(container, root, nodes); };
    }).catch(function (err) {
      root.innerHTML = ui.empty("⚠️", "No se pudo cargar el organigrama", err.message);
    });
  }

  function openInspector(node, engine, relations, allNodes) {
    var rels = relations.filter(function (r) { return r.from_node === node.name || r.to_node === node.name; });
    var body = document.createElement("div");
    body.innerHTML =
      '<div class="os-section-title">Identidad</div>' +
      '<div class="os-field"><label>Tipo</label><div>' + TYPE_ICON[node.node_type] + " " + node.node_type + '</div></div>' +
      '<div class="os-field"><label>Nombre</label><div>' + U.escapeHtml(label(node)) + '</div></div>' +
      (node.company ? '<div class="os-field"><label>Empresa</label><div>' + U.escapeHtml(node.company) + '</div></div>' : "") +
      '<div class="os-section-title">Relaciones (' + rels.length + ')</div>' +
      '<div class="os-flow-list">' + (rels.length ? rels.map(function (r) {
        var other = r.from_node === node.name ? r.to_node : r.from_node;
        var dir = r.from_node === node.name ? "→" : "←";
        return '<div class="os-flow-item"><div class="n">' + dir + '</div><div style="flex:1"><b>' + U.escapeHtml(r.relation_type) + '</b><div class="muted" style="font-size:11.5px">' + U.escapeHtml(other) + '</div></div></div>';
      }).join("") : ui.empty("—", "Sin relaciones registradas")) + '</div>' +
      '<div class="os-section-title">Procesos relacionados</div>' +
      '<div id="os-org-procs">' + ui.skeleton(2) + '</div>';

    var foot = document.createElement("div");
    foot.innerHTML = '<button class="os-btn danger sm" id="os-org-del">Eliminar nodo</button><div class="os-spacer"></div>' +
      '<a class="os-btn sm" href="/app/os-org-node/' + encodeURIComponent(node.name) + '" target="_blank">Abrir en ERPNext ↗</a>';

    ui.inspector.open({ title: label(node) || node.name, subtitle: node.node_type, body: body, foot: foot });

    if (node.designation) {
      api.list("OS Process Step", { fields: ["parent"], filters: [["approval_role", "=", node.designation]], limit: 5 }).catch(function () { return []; })
        .then(function (rows) { body.querySelector("#os-org-procs").innerHTML = rows.length ? rows.map(function (r) { return '<div class="os-tag" style="margin:2px">' + U.escapeHtml(r.parent) + '</div>'; }).join("") : ui.empty("—", "Sin coincidencias directas"); });
    } else {
      body.querySelector("#os-org-procs").innerHTML = ui.empty("—", "Disponible para roles con designation vinculada");
    }

    foot.querySelector("#os-org-del").onclick = function () {
      ui.confirm("¿Eliminar el nodo \"" + label(node) + "\"? Esta acción no borra el documento ERPNext vinculado, solo su representación en el organigrama.", { danger: true }).then(function (ok) {
        if (!ok) return;
        api.remove("OS Org Node", node.name).then(function () { ui.toast("Nodo eliminado", "ok"); ui.inspector.close(); OS.router.navigate("/org"); location.reload(); }).catch(ui.error);
      });
    };
  }

  function fieldRow(labelTxt, inputHtml) { return '<div class="os-field"><label>' + labelTxt + '</label>' + inputHtml + '</div>'; }

  function openCreateNode(container, canvasRoot) {
    var body = document.createElement("div");
    body.innerHTML =
      fieldRow("Tipo de nodo", '<select class="os-select" id="f-type"><option>Department</option><option>Designation</option><option>Employee</option><option>Agent</option><option>Custom</option></select>') +
      fieldRow("Título visible", '<input class="os-input" id="f-title" placeholder="Ej. Gerencia Comercial">') +
      fieldRow("Vínculo ERPNext (opcional, nombre exacto del documento)", '<input class="os-input" id="f-link" placeholder="Se autocompleta según el tipo elegido">') +
      '<div class="hint" style="margin-top:-6px">Company/Department/Designation/Employee ya existen en ERPNext; Agent referencia un OS Agent creado en /agents.</div>';
    var linkInput = body.querySelector ? null : null;
    var m = ui.modal({
      title: "Nuevo nodo del organigrama", body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear", cls: "primary", onClick: function () {
            var type = body.querySelector("#f-type").value, title = body.querySelector("#f-title").value.trim(), link = body.querySelector("#f-link").value.trim();
            if (!title) { ui.toast("El título es obligatorio", "warn"); return false; }
            var payload = { node_type: type, title: title, x: 80, y: 80, is_active: 1 };
            var map = { Department: "department", Designation: "designation", Employee: "employee", Agent: "agent", Custom: "custom_ref" };
            if (link && map[type] && map[type] !== "custom_ref") payload[map[type]] = link;
            api.create("OS Org Node", payload).then(function () { ui.toast("Nodo creado", "ok"); OS.router.navigate("/org"); location.reload(); }).catch(ui.error);
          }
        }
      ]
    });
    function wireLink() {
      var type = body.querySelector("#f-type").value;
      var docmap = { Department: "Department", Designation: "Designation", Employee: "Employee", Agent: "OS Agent" };
      if (docmap[type]) ui.attachLinkSearch(body.querySelector("#f-link"), docmap[type]);
    }
    body.querySelector("#f-type").onchange = wireLink; wireLink();
  }

  function openCreateRelation(container, canvasRoot, nodes) {
    var opts = nodes.map(function (n) { return '<option value="' + n.name + '">' + U.escapeHtml(label(n)) + '</option>'; }).join("");
    var body = document.createElement("div");
    body.innerHTML =
      fieldRow("Desde", '<select class="os-select" id="r-from">' + opts + '</select>') +
      fieldRow("Relación", '<select class="os-select" id="r-type"><option>REPORTS_TO</option><option>OWNS</option><option>APPROVES</option><option>EXECUTES</option><option>USES</option><option>READS</option><option>WRITES</option><option>TRIGGERS</option><option>HANDOFF_TO</option><option>DEPENDS_ON</option><option>MEASURES</option></select>') +
      fieldRow("Hacia", '<select class="os-select" id="r-to">' + opts + '</select>');
    ui.modal({
      title: "Nueva relación semántica", body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear relación", cls: "primary", onClick: function () {
            var from = body.querySelector("#r-from").value, to = body.querySelector("#r-to").value, type = body.querySelector("#r-type").value;
            if (from === to) { ui.toast("El origen y destino no pueden ser el mismo nodo", "warn"); return false; }
            api.create("OS Org Relation", { from_node: from, to_node: to, relation_type: type }).then(function () { ui.toast("Relación creada", "ok"); OS.router.navigate("/org"); location.reload(); }).catch(ui.error);
          }
        }
      ]
    });
  }

  OS.router.register("/org", {
    title: "Organigrama Vivo",
    mount: function (container) {
      container.innerHTML =
        '<div class="os-page-head"><div><div class="os-page-title">Organigrama Vivo</div>' +
        '<div class="os-page-sub">Empresa → Área → Rol → Persona/Agente. Arrastra para reordenar; las relaciones se editan explícitamente.</div></div></div>' +
        '<div class="os-canvas-wrap"><div id="os-org-canvas" style="position:absolute;inset:0"></div></div>';
      load(container, container.querySelector("#os-org-canvas"));
    },
    unmount: function () {}
  });
})(window);
