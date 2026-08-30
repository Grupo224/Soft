/*! Página: Organigrama Vivo (/org) — mapa radial de nodos brillantes con líneas convergentes,
 * inspirado en el video de referencia del blueprint (§2: "mapa radial por departamentos").
 * Estructura: OS Org Node (nodos) + OS Org Relation (líneas semánticas tipadas). */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  var TYPE_ICON = { Company: "🏢", Department: "🏛", Designation: "🎖", Employee: "🧑", Agent: "🤖", Custom: "●" };
  var TYPE_CLASS = { Company: "n-company", Department: "n-department", Designation: "n-designation", Employee: "n-employee", Agent: "n-agent", Custom: "n-custom" };
  var TYPE_RANK = { Company: 0, Department: 1, Designation: 2, Employee: 3, Agent: 3, Custom: 2 };
  var TYPE_RADIUS = { Company: 34, Department: 26, Designation: 19, Employee: 15, Agent: 15, Custom: 15 };
  var PARENT_RELATIONS = ["REPORTS_TO", "EXECUTES", "OWNS", "HANDOFF_TO"]; // orden de prioridad para inferir jerarquía visual

  function label(n) { return n.employee || n.agent || n.designation || n.department || n.company || n.title || n.name; }

  /* ---------------- Layout: árbol radial (fan-out arriba, convergencia hacia el padre) ---------------- */
  function radialLayout(nodes, relations) {
    var byId = {}; nodes.forEach(function (n) { byId[n.name] = n; });
    var parentOf = {}, childrenOf = {};
    PARENT_RELATIONS.forEach(function (rt) {
      relations.filter(function (r) { return r.relation_type === rt; }).forEach(function (r) {
        if (!parentOf[r.from_node] && byId[r.from_node] && byId[r.to_node] && r.from_node !== r.to_node) parentOf[r.from_node] = r.to_node;
      });
    });
    nodes.forEach(function (n) { var p = parentOf[n.name]; if (p) (childrenOf[p] = childrenOf[p] || []).push(n.name); });
    var roots = nodes.filter(function (n) { return !parentOf[n.name]; }).map(function (n) { return n.name; });
    if (!roots.length) roots = nodes.slice(0, 1).map(function (n) { return n.name; });

    var LEVEL_H = 150, LEAF_W = 190, cursor = 0;
    function place(id, depth) {
      var kids = childrenOf[id] || [];
      var n = byId[id];
      n._depth = depth;
      if (!kids.length) {
        n._cx = cursor * LEAF_W + LEAF_W / 2; cursor++;
      } else {
        kids.forEach(function (k) { place(k, depth + 1); });
        var first = byId[kids[0]], last = byId[kids[kids.length - 1]];
        n._cx = (first._cx + last._cx) / 2;
        // Arco tipo "fan": los hijos de los extremos del grupo suben un poco respecto
        // al centro, para que converjan visualmente hacia el padre (efecto del video de referencia).
        var span = Math.max(1, last._cx - first._cx);
        kids.forEach(function (k) {
          var kn = byId[k], t = (kn._cx - n._cx) / (span / 2);
          kn._bow = Math.min(24, Math.abs(t) * 20);
        });
      }
    }
    roots.forEach(function (r) { place(r, 0); });
    nodes.forEach(function (n) {
      if (n._cx === undefined) return; // aislado (sin relación): se resuelve abajo
      n.x = Math.round(n._cx - n.w / 2);
      n.y = Math.round(n._depth * LEVEL_H + 50 - (n._bow || 0));
    });
    // Nodos sin relación alguna -> fila extra a la derecha, para no perderlos.
    var totalWidth = cursor * LEAF_W, extra = 0;
    nodes.forEach(function (n) {
      if (n.x === undefined) {
        n.x = totalWidth + 60 + (extra % 4) * LEAF_W;
        n.y = 50 + Math.floor(extra / 4) * LEVEL_H;
        extra++;
      }
    });
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
    root.parentElement.classList.add("radial");

    Promise.all([
      api.list("OS Org Node", { fields: ["name", "node_type", "title", "company", "department", "designation", "employee", "agent", "x", "y", "is_active"], limit: 500 }),
      api.list("OS Org Relation", { fields: ["name", "from_node", "to_node", "relation_type", "label"], limit: 1000 })
    ]).then(function (r) {
      var nodes = r[0], relations = r[1];
      nodes.forEach(function (n) { n.w = (TYPE_RADIUS[n.node_type] || 15) * 2; n.h = n.w; });
      var needsLayout = nodes.some(function (n) { return !n.x && !n.y; });
      if (needsLayout) { nodes.forEach(function (n) { delete n.x; delete n.y; }); radialLayout(nodes, relations); }

      var canvasNodes = nodes.map(function (n) { return { id: n.name, x: n.x || 0, y: n.y || 0, w: n.w, h: n.h, data: n, live: n.node_type === "Agent" }; });
      var canvasEdges = relations.map(function (rel) {
        var fromNode = nodes.find(function (n) { return n.name === rel.from_node; });
        return { from: rel.from_node, to: rel.to_node, label: rel.relation_type, glowClass: TYPE_CLASS[fromNode && fromNode.node_type] || "n-custom" };
      });

      var legend = root.querySelector(".os-canvas-legend");
      legend.innerHTML = Object.keys(TYPE_ICON).map(function (t) {
        return '<span class="os-tag" style="border-color:currentColor;color:var(--os-text-dim)"><span style="color:var(--os-text)">' + TYPE_ICON[t] + '</span> ' + t + '</span>';
      }).join("");

      var engine = OS.canvas.create(root.querySelector(".os-canvas-svg"), {
        edgeAnchor: "tb", nodeShape: "circle", edgeStyle: "glow",
        renderNode: function (g, n) {
          var d = n.data, r = n.w / 2, cls = TYPE_CLASS[d.node_type] || "n-custom";
          var isHub = d.node_type === "Company" || d.node_type === "Department";
          g.setAttribute("class", g.getAttribute("class") + " " + cls);
          var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("class", "core"); circle.setAttribute("cx", r); circle.setAttribute("cy", r); circle.setAttribute("r", r);
          circle.setAttribute("stroke", "currentColor");
          circle.setAttribute("fill", isHub ? "#0d1424" : "currentColor");
          circle.setAttribute("fill-opacity", isHub ? "1" : ".85");
          g.appendChild(circle);
          if (isHub) {
            var ico = document.createElementNS("http://www.w3.org/2000/svg", "text");
            ico.setAttribute("class", "n-ico"); ico.setAttribute("x", r); ico.setAttribute("y", r + 1);
            ico.textContent = TYPE_ICON[d.node_type] || "●";
            g.appendChild(ico);
          }
          var lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          lbl.setAttribute("class", "n-label"); lbl.setAttribute("x", r); lbl.setAttribute("y", n.h + 16);
          lbl.textContent = (label(d) || "(sin nombre)").slice(0, 22);
          g.appendChild(lbl);
          var cap = document.createElementNS("http://www.w3.org/2000/svg", "text");
          cap.setAttribute("class", "n-caption"); cap.setAttribute("x", r); cap.setAttribute("y", n.h + 28);
          cap.textContent = d.node_type + (d.is_active === 0 ? " · inactivo" : "");
          g.appendChild(cap);
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

  /* ---------------- Inspector: ver + AGREGAR información del nodo ---------------- */
  function openInspector(node, engine, relations, allNodes) {
    var rels = relations.filter(function (r) { return r.from_node === node.name || r.to_node === node.name; });
    var body = document.createElement("div");
    body.innerHTML =
      '<div class="os-section-title">Identidad</div>' +
      '<div class="os-field"><label>Tipo</label><div>' + TYPE_ICON[node.node_type] + " " + node.node_type + '</div></div>' +
      '<div class="os-field"><label>Nombre</label><div>' + U.escapeHtml(label(node)) + '</div></div>' +
      (node.company ? '<div class="os-field"><label>Empresa</label><div>' + U.escapeHtml(node.company) + '</div></div>' : "") +
      '<div id="os-org-rolecard"></div>' +
      '<div class="os-section-title">Relaciones (' + rels.length + ')</div>' +
      '<div class="os-flow-list">' + (rels.length ? rels.map(function (r) {
        var other = r.from_node === node.name ? r.to_node : r.from_node;
        var dir = r.from_node === node.name ? "→" : "←";
        return '<div class="os-flow-item"><div class="n">' + dir + '</div><div style="flex:1"><b>' + U.escapeHtml(r.relation_type) + '</b><div class="muted" style="font-size:11.5px">' + U.escapeHtml(other) + '</div></div></div>';
      }).join("") : ui.empty("—", "Sin relaciones registradas")) + '</div>' +
      '<div class="os-section-title">Procesos relacionados</div>' +
      '<div id="os-org-procs">' + ui.skeleton(2) + '</div>';

    // Pie fijo: Cancelar y Guardar siempre visibles (patrón obligatorio para los 3 constructores).
    var foot = document.createElement("div");
    foot.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px"><span class="os-save-state" id="os-org-state"></span></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<a class="os-btn ghost sm" href="/app/os-org-node/' + encodeURIComponent(node.name) + '" target="_blank" title="Abrir documento en ERPNext">ERPNext ↗</a>' +
      '<button class="os-btn danger sm" id="os-org-del">Eliminar nodo</button>' +
      '<button class="os-btn ghost sm" id="os-org-cancel">Cancelar</button>' +
      (node.node_type === "Designation" ? '<button class="os-btn primary sm" id="os-org-save-role">Guardar</button>' : "") +
      '</div>';

    ui.inspector.open({ title: label(node) || node.name, subtitle: node.node_type + " · clic para agregar información del rol", body: body, foot: foot });
    ui.saveState(foot.querySelector("#os-org-state"), "idle");
    foot.querySelector("#os-org-cancel").onclick = function () { ui.inspector.closeGuarded(); };

    if (node.node_type === "Designation") {
      mountRoleCardEditor(body.querySelector("#os-org-rolecard"), foot.querySelector("#os-org-save-role"), foot.querySelector("#os-org-state"), node);
    }

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

  /** Ficha operativa del rol (OS Role Card) editable directamente desde el organigrama —
   * responde al North Star de ambos SOP: abrir un nodo y ver/completar su contrato operativo. */
  function mountRoleCardEditor(host, saveBtn, stateEl, node) {
    host.innerHTML = '<div class="os-section-title">Ficha del rol — agregar información</div>' + ui.skeleton(3);
    api.list("OS Role Card", { fields: ["name", "role_title", "mission", "expected_results", "responsibilities", "kpis", "owner_user"], filters: [["designation", "=", node.designation]], limit: 1 })
      .catch(function () { return []; })
      .then(function (rows) {
        var card = rows[0] || null;
        host.innerHTML =
          '<div class="os-section-title">Ficha del rol' + (card ? "" : " — aún sin completar") + '</div>' +
          '<div class="os-field"><label>Misión</label><textarea class="os-textarea" id="rc-mission" placeholder="Para qué existe este rol">' + U.escapeHtml(card ? card.mission : "") + '</textarea></div>' +
          '<div class="os-field"><label>Resultados esperados</label><textarea class="os-textarea" id="rc-results" placeholder="Qué produce cuando funciona bien">' + U.escapeHtml(card ? card.expected_results : "") + '</textarea></div>' +
          '<div class="os-field"><label>Responsabilidades</label><textarea class="os-textarea" id="rc-resp">' + U.escapeHtml(card ? card.responsibilities : "") + '</textarea></div>' +
          '<div class="os-field"><label>KPIs del rol</label><textarea class="os-textarea" id="rc-kpis">' + U.escapeHtml(card ? card.kpis : "") + '</textarea></div>';
        saveBtn.onclick = function () {
          ui.saveState(stateEl, "saving");
          var payload = {
            role_title: label(node), designation: node.designation, owner_user: card ? card.owner_user : OS.session.user,
            mission: host.querySelector("#rc-mission").value, expected_results: host.querySelector("#rc-results").value,
            responsibilities: host.querySelector("#rc-resp").value, kpis: host.querySelector("#rc-kpis").value
          };
          var p = card ? api.update("OS Role Card", card.name, payload) : api.create("OS Role Card", payload);
          p.then(function (doc) { card = doc; ui.saveState(stateEl, "saved"); ui.inspector.markClean(); ui.toast("Ficha del rol guardada", "ok"); })
            .catch(function (e) { ui.saveState(stateEl, "error"); ui.error(e); });
        };
      });
  }

  function fieldRow(labelTxt, inputHtml) { return '<div class="os-field"><label>' + labelTxt + '</label>' + inputHtml + '</div>'; }

  function openCreateNode(container, canvasRoot) {
    var body = document.createElement("div");
    body.innerHTML =
      fieldRow("Tipo de nodo", '<select class="os-select" id="f-type"><option>Department</option><option>Designation</option><option>Employee</option><option>Agent</option><option>Custom</option></select>') +
      fieldRow("Título visible", '<input class="os-input" id="f-title" placeholder="Ej. Gerencia Comercial">') +
      fieldRow("Vínculo ERPNext (opcional, nombre exacto del documento)", '<input class="os-input" id="f-link" placeholder="Se autocompleta según el tipo elegido">') +
      '<div class="hint" style="margin-top:-6px">Company/Department/Designation/Employee ya existen en ERPNext; Agent referencia un OS Agent creado en /agents.</div>';
    ui.modal({
      title: "Nuevo nodo del organigrama", body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear", cls: "primary", onClick: function () {
            var type = body.querySelector("#f-type").value, title = body.querySelector("#f-title").value.trim(), link = body.querySelector("#f-link").value.trim();
            if (!title) { ui.toast("El título es obligatorio", "warn"); return false; }
            var payload = { node_type: type, title: title, is_active: 1 };
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
      fieldRow("Hacia", '<select class="os-select" id="r-to">' + opts + '</select>') +
      '<div class="hint">REPORTS_TO/EXECUTES/OWNS/HANDOFF_TO también definen la posición del nodo en el mapa (de quién "cuelga").</div>';
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
        '<div class="os-page-sub">Mapa radial de la empresa. Haz clic en cualquier nodo para abrir su ficha y agregar información.</div></div></div>' +
        '<div class="os-canvas-wrap"><div id="os-org-canvas" style="position:absolute;inset:0"></div></div>';
      load(container, container.querySelector("#os-org-canvas"));
    },
    unmount: function () {}
  });
})(window);
