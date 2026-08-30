/*! Página: Organigrama Vivo (/org).
 * Jerarquía vertical (con opción horizontal), tarjetas por tipo, relaciones
 * tipadas (jerarquía sólida / colaboración discontinua), prevención de
 * ciclos, arrastrar-para-reasignar con confirmación, búsqueda/filtros,
 * expandir/contraer y advertencias de nodos huérfanos o relaciones
 * duplicadas — según "Instrucción maestra de mejoras — Portal OS Altoplano". */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  var TYPE_ICON = { Company: "🏢", Department: "🏛", Designation: "🎖", Employee: "🧑", Agent: "🤖", Custom: "●" };
  var TYPE_LABEL = { Company: "Empresa", Department: "Área / Depto.", Designation: "Puesto", Employee: "Persona", Agent: "Agente de IA", Custom: "Personalizado" };
  var REL_LABEL = { REPORTS_TO: "Reporta a", COLLABORATES_WITH: "Colabora con", SUPPORTS: "Apoya a", EXECUTES: "Ejecuta", OWNS: "Es dueño de", APPROVES: "Aprueba", USES: "Usa", READS: "Lee", WRITES: "Escribe", TRIGGERS: "Dispara", HANDOFF_TO: "Entrega a", DEPENDS_ON: "Depende de", MEASURES: "Mide" };
  var HIER = "REPORTS_TO";
  var NODE_W = 208, NODE_H = 72;

  function label(n) { return n.employee || n.agent || n.designation || n.department || n.company || n.title || n.name; }
  function secondaryInfo(n) {
    if (n.node_type === "Designation") return n.department ? "Área: " + n.department : "";
    if (n.node_type === "Employee") return n.designation || n.department || "";
    if (n.node_type === "Agent") return "Agente IA";
    if (n.node_type === "Department") return n.company || "";
    return "";
  }

  /* ---------------- Jerarquía (a partir de relaciones REPORTS_TO) ---------------- */
  function buildHierarchy(nodes, relations) {
    var byId = {}; nodes.forEach(function (n) { byId[n.name] = n; });
    var parentOf = {}, childrenOf = {};
    relations.forEach(function (r) {
      if (r.relation_type !== HIER || parentOf[r.from_node] || !byId[r.from_node] || !byId[r.to_node] || r.from_node === r.to_node) return;
      // BUG-02: dos relaciones REPORTS_TO que se cierran entre sí (A→B y B→A,
      // o una cadena más larga) provocaban recursión infinita en place() y
      // subtreeIds(). Antes de aceptar esta relación, se recorre la cadena de
      // padres YA aceptada desde to_node — si llega de vuelta a from_node,
      // esta relación cerraría un ciclo y se ignora en el árbol (el registro
      // en OS Org Relation no se borra, solo no participa del layout).
      var cur = r.to_node, guard = 0, closesCycle = false;
      while (cur && guard++ <= nodes.length) {
        if (cur === r.from_node) { closesCycle = true; break; }
        cur = parentOf[cur];
      }
      if (closesCycle) return;
      parentOf[r.from_node] = r.to_node;
    });
    nodes.forEach(function (n) { var p = parentOf[n.name]; if (p) (childrenOf[p] = childrenOf[p] || []).push(n.name); });
    var roots = nodes.filter(function (n) { return !parentOf[n.name]; }).map(function (n) { return n.name; });
    return { byId: byId, parentOf: parentOf, childrenOf: childrenOf, roots: roots.length ? roots : (nodes[0] ? [nodes[0].name] : []) };
  }
  function isDescendant(hier, ancestorId, nodeId) {
    var cur = hier.parentOf[nodeId], guard = 0;
    while (cur && guard++ < 1000) { if (cur === ancestorId) return true; cur = hier.parentOf[cur]; }
    return false;
  }
  function wouldCreateCycle(hier, childId, newParentId) { return childId === newParentId || isDescendant(hier, childId, newParentId); }
  function subtreeIds(hier, rootId, _seen) {
    // Guarda de visitados (defensa en profundidad — buildHierarchy ya
    // garantiza un árbol sin ciclos, pero esta función no debe poder
    // recursión infinita aunque childrenOf llegara corrupto por otra vía).
    _seen = _seen || {};
    if (_seen[rootId]) return [];
    _seen[rootId] = true;
    var out = [rootId];
    (hier.childrenOf[rootId] || []).forEach(function (c) { out = out.concat(subtreeIds(hier, c, _seen)); });
    return out;
  }
  function computeWarnings(nodes, relations) {
    var out = [], connected = {};
    relations.forEach(function (r) { connected[r.from_node] = true; connected[r.to_node] = true; });
    nodes.forEach(function (n) { if (n.node_type !== "Company" && !connected[n.name]) out.push({ kind: "Nodo huérfano (sin relaciones)", label: label(n) }); });
    var seen = {};
    relations.forEach(function (r) {
      var k = r.from_node + "|" + r.to_node + "|" + r.relation_type;
      if (seen[k]) out.push({ kind: "Relación duplicada", label: r.from_node + " → " + r.to_node + " (" + r.relation_type + ")" });
      seen[k] = true;
    });
    return out;
  }

  /* ---------------- Layout jerárquico: vertical u horizontal ---------------- */
  function treeLayout(hier, nodes, orientation, collapsed) {
    var LEVEL = orientation === "horizontal" ? 270 : 150;
    var LEAF = orientation === "horizontal" ? 100 : 226;
    var cursor = 0;
    // Reinicia en cada pasada: un nodo que quedó visible/posicionado en el render
    // anterior no debe seguir marcado como tal si ahora su padre está contraído.
    nodes.forEach(function (n) { n._cx = undefined; n._hidden = true; });
    var visiting = {};
    function place(id, depth) {
      var n = hier.byId[id]; if (!n) return;
      // Guarda de visitados (defensa en profundidad, ver BUG-02): si un nodo
      // vuelve a aparecer en su propia rama de recursión, se trata como hoja
      // en vez de seguir bajando — nunca debe colgar el navegador.
      if (visiting[id]) { n._hidden = false; n._depth = depth; n._cx = cursor * LEAF + LEAF / 2; cursor++; return; }
      visiting[id] = true;
      n._hidden = false; n._depth = depth;
      var kids = collapsed[id] ? [] : (hier.childrenOf[id] || []);
      if (!kids.length) { n._cx = cursor * LEAF + LEAF / 2; cursor++; }
      else {
        kids.forEach(function (k) { place(k, depth + 1); });
        var first = hier.byId[kids[0]], last = hier.byId[kids[kids.length - 1]];
        n._cx = (first._cx + last._cx) / 2;
      }
      if (orientation === "horizontal") { n.y = Math.round(n._cx - NODE_H / 2); n.x = Math.round(depth * LEVEL + 40); }
      else { n.x = Math.round(n._cx - NODE_W / 2); n.y = Math.round(depth * LEVEL + 40); }
    }
    hier.roots.forEach(function (r) { place(r, 0); });
  }

  function load(container, root) {
    var state = { orientation: "vertical", collapsed: {}, q: "", type: "", dept: "", status: "" };
    var nodes = [], relations = [], hier = null, engine = null;

    root.innerHTML =
      '<div class="os-canvas-toolbar-stack">' +
      '<div class="os-canvas-toolbar">' +
      '<button class="os-btn sm" data-act="fit">⤢ Ajustar</button>' +
      '<button class="os-btn sm" data-act="zin">＋</button><button class="os-btn sm" data-act="zout">－</button>' +
      '<button class="os-btn sm" data-act="orient">↕ Vertical</button>' +
      '<button class="os-btn sm" data-act="expand">Expandir todo</button>' +
      '<button class="os-btn sm" data-act="collapse">Contraer todo</button>' +
      '<button class="os-btn sm primary" data-act="new-node">＋ Nodo</button>' +
      '<button class="os-btn sm" data-act="new-rel">↔ Relación</button>' +
      '<button class="os-btn sm" data-act="warn" style="display:none">⚠ 0 advertencias</button>' +
      '</div>' +
      '<div class="os-canvas-toolbar">' +
      '<input class="os-input" data-act="search" placeholder="Buscar por nombre…" style="width:190px">' +
      '<select class="os-select" data-act="f-type" style="width:150px"><option value="">Todos los tipos</option>' +
      Object.keys(TYPE_LABEL).map(function (t) { return '<option value="' + t + '">' + TYPE_LABEL[t] + '</option>'; }).join("") + '</select>' +
      '<select class="os-select" data-act="f-status" style="width:130px"><option value="">Cualquier estado</option><option value="1">Activo</option><option value="0">Inactivo</option></select>' +
      '</div>' +
      '</div>' +
      '<div class="os-canvas-legend"></div>' +
      '<div class="os-canvas-hint">Sólida = jerarquía (Reporta a) · Discontinua = colaboración/apoyo. Arrastra un nodo sobre otro para reasignar su jerarquía.</div>' +
      '<svg class="os-canvas-svg"></svg>';

    function refetch() {
      return Promise.all([
        api.list("OS Org Node", { fields: ["name", "node_type", "title", "company", "department", "designation", "employee", "agent", "is_active", "modified", "modified_by", "owner"], limit: 500 }),
        api.list("OS Org Relation", { fields: ["name", "from_node", "to_node", "relation_type", "label"], limit: 1000 })
      ]).then(function (r) { nodes = r[0]; relations = r[1]; computeAndRender(); }).catch(function (err) {
        root.innerHTML = ui.empty("⚠️", "No se pudo cargar el organigrama", err.message);
      });
    }

    function matches(n) {
      if (state.q && label(n).toLowerCase().indexOf(state.q.toLowerCase()) === -1) return false;
      if (state.type && n.node_type !== state.type) return false;
      if (state.status !== "" && String(n.is_active != null ? n.is_active : 1) !== state.status) return false;
      return true;
    }

    function computeAndRender() {
      nodes.forEach(function (n) { n.w = NODE_W; n.h = NODE_H; });
      hier = buildHierarchy(nodes, relations);
      treeLayout(hier, nodes, state.orientation, state.collapsed);

      var visible = nodes.filter(function (n) { return !n._hidden; });
      var canvasNodes = visible.map(function (n) { return { id: n.name, x: n.x, y: n.y, w: n.w, h: n.h, data: n, live: n.node_type === "Agent" && n.is_active !== 0 }; });
      var visibleIds = {}; visible.forEach(function (n) { visibleIds[n.name] = true; });
      var canvasEdges = relations.filter(function (r) { return visibleIds[r.from_node] && visibleIds[r.to_node]; }).map(function (r) {
        return { id: r.name, data: r, from: r.from_node, to: r.to_node, label: REL_LABEL[r.relation_type] || r.relation_type, cls: r.relation_type === HIER ? "" : "secondary" };
      });

      if (!engine) {
        engine = OS.canvas.create(root.querySelector(".os-canvas-svg"), {
          edgeAnchor: state.orientation === "horizontal" ? "lr" : "tb", nodeShape: "rect", onEdgeClick: openRelationInspector, padTop: 110,
          renderNode: renderOrgCard,
          onNodeClick: function (n) { openInspector(n.data); },
          onNodeDragEnd: handleDragEnd
        });
      }
      engine.setData(canvasNodes, canvasEdges);

      var hasFilter = state.q || state.type || state.status !== "";
      if (hasFilter) engine.highlightDim(visible.filter(matches).map(function (n) { return n.name; }));
      else engine.highlightDim(null);

      var warnings = computeWarnings(nodes, relations);
      var warnBtn = root.querySelector('[data-act="warn"]');
      warnBtn.style.display = warnings.length ? "" : "none";
      warnBtn.textContent = "⚠ " + warnings.length + " advertencia" + (warnings.length === 1 ? "" : "s");
      warnBtn.onclick = function () { showWarnings(warnings); };

      var legend = root.querySelector(".os-canvas-legend");
      legend.innerHTML = Object.keys(TYPE_ICON).map(function (t) { return '<span class="os-tag">' + TYPE_ICON[t] + " " + TYPE_LABEL[t] + '</span>'; }).join("");
    }

    function renderOrgCard(g, n) {
      var d = n.data;
      var svgNS = "http://www.w3.org/2000/svg";
      function txt(x, y, cls, content) { var t = document.createElementNS(svgNS, "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("class", cls); t.textContent = content; g.appendChild(t); return t; }
      // DIS-01: el punto de estado y el chevron viven en el borde derecho de la
      // tarjeta; un título/subtítulo largo se dibujaba encima. Se trunca con
      // elipsis según el ancho REAL de texto (getComputedTextLength), no un
      // conteo de caracteres fijo, reservando el espacio de cada control.
      function ellipsize(t, maxWidth) {
        try {
          if (t.textContent.length > 80) t.textContent = t.textContent.slice(0, 80); // cota barata antes de medir
          if (t.getComputedTextLength() <= maxWidth) return;
          var full = t.textContent;
          for (var i = full.length - 1; i > 0; i--) {
            t.textContent = full.slice(0, i) + "…";
            if (t.getComputedTextLength() <= maxWidth) return;
          }
          t.textContent = "…";
        } catch (e) { /* getComputedTextLength puede no estar disponible; el conteo previo de caracteres ya acota el peor caso */ }
      }
      var kids = hier.childrenOf[d.name] || [];
      var DOT_RESERVE = 22, CHEV_RESERVE = 34;
      var typeT = txt(14, 22, "n-sub", TYPE_ICON[d.node_type] + " " + TYPE_LABEL[d.node_type]);
      ellipsize(typeT, n.w - 14 - DOT_RESERVE);
      var titleT = txt(14, 42, "n-title", label(d) || "(sin nombre)");
      ellipsize(titleT, n.w - 14 - 8);
      var sec = secondaryInfo(d);
      if (sec) {
        var subT = txt(14, 58, "n-sub", sec);
        ellipsize(subT, n.w - 14 - (kids.length ? CHEV_RESERVE : 8));
      }
      // Estado (punto de color arriba a la derecha) — nunca solo color: el texto del badge también lo dice.
      var dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", n.w - 14); dot.setAttribute("cy", 14); dot.setAttribute("r", 5);
      dot.setAttribute("fill", d.is_active === 0 ? "#8a8478" : "#1F9D6B");
      g.appendChild(dot);
      // Chevron expandir/contraer si tiene hijos.
      if (kids.length) {
        var chev = document.createElementNS(svgNS, "g");
        chev.setAttribute("transform", "translate(" + (n.w - 26) + "," + (n.h - 20) + ")");
        chev.style.cursor = "pointer";
        var bg = document.createElementNS(svgNS, "circle"); bg.setAttribute("cx", 8); bg.setAttribute("cy", 8); bg.setAttribute("r", 10); bg.setAttribute("fill", "var(--os-border-soft)");
        chev.appendChild(bg);
        var lbl = document.createElementNS(svgNS, "text"); lbl.setAttribute("x", 8); lbl.setAttribute("y", 11); lbl.setAttribute("text-anchor", "middle");
        lbl.setAttribute("class", "n-badge"); lbl.style.fill = "var(--os-text-dim)";
        lbl.textContent = state.collapsed[d.name] ? "+" + kids.length : "−";
        chev.appendChild(lbl);
        chev.addEventListener("click", function (ev) { ev.stopPropagation(); state.collapsed[d.name] = !state.collapsed[d.name]; computeAndRender(); });
        g.appendChild(chev);
      }
    }

    /* ---- Arrastrar: sobre otro nodo = reasignar jerarquía (con confirmación); sobre vacío = solo reordena visualmente ---- */
    function handleDragEnd(n, x, y) {
      var cx = x + n.w / 2, cy = y + n.h / 2;
      var selfSubtree = subtreeIds(hier, n.id);
      var target = nodes.find(function (o) {
        if (o._hidden || selfSubtree.indexOf(o.name) !== -1) return false;
        return cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h;
      });
      if (!target) { computeAndRender(); return; } // sin objetivo válido: vuelve a la posición jerárquica calculada
      if (wouldCreateCycle(hier, n.id, target.name)) {
        ui.toast("Eso crearía un ciclo jerárquico (un nodo no puede depender de sí mismo ni de uno de sus antecesores).", "warn");
        computeAndRender(); return;
      }
      var movedNode = hier.byId[n.id], oldParentId = hier.parentOf[n.id];
      var oldSnapshot = oldParentId ? { from_node: n.id, to_node: oldParentId, relation_type: HIER } : null;
      var newSnapshot = { from_node: n.id, to_node: target.name, relation_type: HIER };
      var msg = "¿Hacer que \"" + label(movedNode) + "\" reporte a \"" + label(target) + "\"?" +
        (oldParentId ? " Antes reportaba a \"" + label(hier.byId[oldParentId]) + "\"." : "");
      ui.confirm(msg).then(function (ok) {
        if (!ok) { computeAndRender(); return; }
        applyHierarchySnapshot(n.id, newSnapshot).then(function () {
          ui.toast("Jerarquía actualizada", "ok");
          OS.history.push({ label: "reasignar jerarquía", undo: function () { applyHierarchySnapshot(n.id, oldSnapshot); }, redo: function () { applyHierarchySnapshot(n.id, newSnapshot); } });
        }).catch(function (e) { ui.error(e); computeAndRender(); });
      });
    }

    /** Reemplaza (o quita, si snapshot es null) la relación REPORTS_TO vigente de fromId. Usado por
     * el arrastre y su deshacer/rehacer — siempre simétrico, nunca depende de un `name` ya borrado. */
    function applyHierarchySnapshot(fromId, snapshot) {
      var current = relations.find(function (r) { return r.from_node === fromId && r.relation_type === HIER; });
      return (current ? api.remove("OS Org Relation", current.name).then(function () { relations.splice(relations.indexOf(current), 1); }) : Promise.resolve())
        .then(function () { return snapshot ? api.create("OS Org Relation", snapshot) : null; })
        .then(function (r) { if (r) relations.push(r); computeAndRender(); });
    }

    function showWarnings(list) {
      var body = document.createElement("div");
      body.innerHTML = list.map(function (w) { return '<div class="os-flow-item"><div class="n">⚠</div><div style="flex:1"><b>' + U.escapeHtml(w.kind) + '</b><div class="muted" style="font-size:11.5px">' + U.escapeHtml(w.label) + '</div></div></div>'; }).join("");
      ui.modal({ title: "Advertencias del organigrama", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
    }

    /* ---- Inspector de relación: tipo/etiqueta + eliminar, con prevención de ciclo al reeditar a REPORTS_TO ---- */
    function openRelationInspector(edge) {
      var r = edge.data;
      var body = document.createElement("div");
      body.innerHTML =
        ui.fieldRow("Desde", '<div class="os-tag">' + U.escapeHtml(label(hier.byId[r.from_node] || {}) || r.from_node) + '</div>') +
        ui.fieldRow("Hacia", '<div class="os-tag">' + U.escapeHtml(label(hier.byId[r.to_node] || {}) || r.to_node) + '</div>') +
        ui.fieldRow("Tipo de relación", '<select class="os-select" f="relation_type">' + ui.opt(Object.keys(REL_LABEL), r.relation_type) + '</select>') +
        ui.fieldRow("Etiqueta", '<input class="os-input" f="label" value="' + U.escapeHtml(r.label || "") + '">');
      var foot = document.createElement("div");
      foot.innerHTML = '<span class="os-save-state" id="rel-state"></span><div style="display:flex;gap:8px">' +
        '<button class="os-btn danger sm" id="rel-del">Eliminar</button><button class="os-btn ghost sm" id="rel-cancel">Cancelar</button>' +
        '<button class="os-btn primary sm" id="rel-save">Guardar</button></div>';
      ui.inspector.open({ title: "Relación", subtitle: REL_LABEL[r.relation_type], body: body, foot: foot, onClose: function () { engine.clearSelection(); } });
      ui.saveState(foot.querySelector("#rel-state"), "idle");
      foot.querySelector("#rel-cancel").onclick = function () { ui.inspector.closeGuarded(); };
      foot.querySelector("#rel-save").onclick = function () {
        var newType = body.querySelector('[f="relation_type"]').value;
        if (newType === HIER && wouldCreateCycle(hier, r.from_node, r.to_node)) { ui.toast("Ese cambio crearía un ciclo jerárquico.", "warn"); return; }
        ui.saveState(foot.querySelector("#rel-state"), "saving");
        api.update("OS Org Relation", r.name, { relation_type: newType, label: body.querySelector('[f="label"]').value })
          .then(function (doc) { Object.assign(r, doc); ui.saveState(foot.querySelector("#rel-state"), "saved"); ui.inspector.markClean(); ui.toast("Relación actualizada", "ok"); computeAndRender(); })
          .catch(function (e) { ui.saveState(foot.querySelector("#rel-state"), "error"); ui.error(e); });
      };
      foot.querySelector("#rel-del").onclick = function () {
        ui.confirm("¿Eliminar esta relación?", { danger: true }).then(function (ok) {
          if (!ok) return;
          api.remove("OS Org Relation", r.name).then(function () {
            relations.splice(relations.indexOf(r), 1);
            ui.inspector.markClean(); ui.inspector.close(); ui.toast("Relación eliminada", "ok"); computeAndRender();
          }).catch(ui.error);
        });
      };
    }

    /* ---------------- Inspector de nodo: identidad editable + ficha de rol + relaciones + auditoría ---------------- */
    function openInspector(node) {
      var rels = relations.filter(function (r) { return r.from_node === node.name || r.to_node === node.name; });
      var body = document.createElement("div");
      body.innerHTML =
        '<div class="os-section-title">Identidad</div>' +
        ui.fieldRow("Tipo", '<div>' + TYPE_ICON[node.node_type] + " " + TYPE_LABEL[node.node_type] + '</div>') +
        ui.fieldRow("Nombre visible", '<input class="os-input" id="on-title" value="' + U.escapeHtml(node.title || label(node) || "") + '">') +
        ui.fieldRow("Estado", '<div class="os-check"><input type="checkbox" id="on-active" ' + (node.is_active !== 0 ? "checked" : "") + '> Activo</div>') +
        (node.company ? ui.fieldRow("Empresa vinculada", '<div>' + U.escapeHtml(node.company) + '</div>') : "") +
        '<div id="os-org-rolecard"></div>' +
        '<div class="os-section-title">Relaciones (' + rels.length + ')</div>' +
        '<div class="os-flow-list">' + (rels.length ? rels.map(function (r) {
          var other = r.from_node === node.name ? r.to_node : r.from_node;
          var dir = r.from_node === node.name ? "→" : "←";
          var otherLbl = (hier.byId[other] && label(hier.byId[other])) || other;
          return '<div class="os-flow-item" data-rel="' + r.name + '"><div class="n">' + dir + '</div><div style="flex:1"><b>' + U.escapeHtml(REL_LABEL[r.relation_type] || r.relation_type) + '</b><div class="muted" style="font-size:11.5px">' + U.escapeHtml(otherLbl) + '</div></div></div>';
        }).join("") : ui.empty("—", "Sin relaciones registradas")) + '</div>' +
        '<div class="os-section-title">Auditoría</div>' +
        '<div class="hint">Últ. modificación: ' + U.timeAgo(node.modified) + ' por ' + U.escapeHtml(node.modified_by || node.owner || "—") + '</div>';

      var foot = document.createElement("div");
      foot.innerHTML =
        '<span class="os-save-state" id="os-org-state"></span>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<a class="os-btn ghost sm" href="/app/os-org-node/' + encodeURIComponent(node.name) + '" target="_blank">ERPNext ↗</a>' +
        '<button class="os-btn ghost sm" id="os-org-addchild">+ Agregar debajo</button>' +
        '<button class="os-btn danger sm" id="os-org-del">Eliminar</button>' +
        '<button class="os-btn ghost sm" id="os-org-cancel">Cancelar</button>' +
        '<button class="os-btn primary sm" id="os-org-save">Guardar</button></div>';

      ui.inspector.open({ title: label(node) || node.name, subtitle: TYPE_LABEL[node.node_type] + " · clic para editar", body: body, foot: foot, onClose: function () { engine.clearSelection(); } });
      ui.saveState(foot.querySelector("#os-org-state"), "idle");
      foot.querySelector("#os-org-cancel").onclick = function () { ui.inspector.closeGuarded(); };

      body.querySelectorAll("[data-rel]").forEach(function (elx) {
        elx.onclick = function () {
          var r = relations.find(function (x) { return x.name === elx.dataset.rel; });
          if (r) { ui.inspector.closeGuarded(); setTimeout(function () { openRelationInspector({ data: r }); }, 220); }
        };
      });

      var roleCardRef = null;
      if (node.node_type === "Designation") roleCardRef = mountRoleCardEditor(body.querySelector("#os-org-rolecard"), node);

      foot.querySelector("#os-org-save").onclick = function () {
        ui.saveState(foot.querySelector("#os-org-state"), "saving");
        var tasks = [api.update("OS Org Node", node.name, { title: body.querySelector("#on-title").value, is_active: body.querySelector("#on-active").checked ? 1 : 0 })];
        if (roleCardRef) tasks.push(roleCardRef.save());
        Promise.all(tasks).then(function (r) {
          Object.assign(node, r[0]); ui.saveState(foot.querySelector("#os-org-state"), "saved"); ui.inspector.markClean();
          ui.toast("Guardado", "ok"); computeAndRender();
        }).catch(function (e) { ui.saveState(foot.querySelector("#os-org-state"), "error"); ui.error(e); });
      };
      foot.querySelector("#os-org-addchild").onclick = function () { ui.inspector.closeGuarded(); openCreateNode(node); };
      foot.querySelector("#os-org-del").onclick = function () {
        ui.confirm("¿Eliminar el nodo \"" + label(node) + "\"? No borra el documento ERPNext vinculado, solo su representación aquí.", { danger: true }).then(function (ok) {
          if (!ok) return;
          api.remove("OS Org Node", node.name).then(function () {
            nodes.splice(nodes.indexOf(node), 1);
            relations = relations.filter(function (r) { return r.from_node !== node.name && r.to_node !== node.name; });
            ui.toast("Nodo eliminado", "ok"); ui.inspector.markClean(); ui.inspector.close(); computeAndRender();
          }).catch(ui.error);
        });
      };
    }

    /** Ficha operativa del rol (OS Role Card). Devuelve {save()} para integrarse al Guardar general del nodo. */
    function mountRoleCardEditor(host, node) {
      host.innerHTML = '<div class="os-section-title">Ficha del rol — agregar información</div>' + ui.skeleton(3);
      var card = null, ready = api.list("OS Role Card", { fields: ["name", "mission", "expected_results", "responsibilities", "kpis", "owner_user"], filters: [["designation", "=", node.designation]], limit: 1 })
        .catch(function () { return []; })
        .then(function (rows) {
          card = rows[0] || null;
          host.innerHTML =
            '<div class="os-section-title">Ficha del rol' + (card ? "" : " — aún sin completar") + '</div>' +
            ui.fieldRow("Misión", '<textarea class="os-textarea" id="rc-mission" placeholder="Para qué existe este rol">' + U.escapeHtml(card ? card.mission : "") + '</textarea>') +
            ui.fieldRow("Resultados esperados", '<textarea class="os-textarea" id="rc-results">' + U.escapeHtml(card ? card.expected_results : "") + '</textarea>') +
            ui.fieldRow("Responsabilidades", '<textarea class="os-textarea" id="rc-resp">' + U.escapeHtml(card ? card.responsibilities : "") + '</textarea>') +
            ui.fieldRow("KPIs del rol", '<textarea class="os-textarea" id="rc-kpis">' + U.escapeHtml(card ? card.kpis : "") + '</textarea>');
        });
      return {
        save: function () {
          return ready.then(function () {
            var payload = {
              role_title: label(node), designation: node.designation, owner_user: card ? card.owner_user : OS.session.user,
              mission: host.querySelector("#rc-mission").value, expected_results: host.querySelector("#rc-results").value,
              responsibilities: host.querySelector("#rc-resp").value, kpis: host.querySelector("#rc-kpis").value
            };
            return card ? api.update("OS Role Card", card.name, payload) : api.create("OS Role Card", payload);
          });
        }
      };
    }

    /* ---------------- Crear nodo / relación ---------------- */
    function openCreateNode(parentNode) {
      var body = document.createElement("div");
      body.innerHTML =
        ui.fieldRow("Tipo de nodo", '<select class="os-select" id="f-type">' + ui.opt(["Department", "Designation", "Employee", "Agent", "Custom"]) + '</select>') +
        ui.fieldRow("Título visible", '<input class="os-input" id="f-title" placeholder="Ej. Gerencia Comercial">') +
        ui.fieldRow("Vínculo ERPNext (opcional)", '<input class="os-input" id="f-link" placeholder="Se autocompleta según el tipo">') +
        (parentNode ? '<div class="hint">Se creará reportando a "' + U.escapeHtml(label(parentNode)) + '".</div>' : "");
      ui.modal({
        title: parentNode ? "Nuevo nodo bajo \"" + label(parentNode) + "\"" : "Nuevo nodo del organigrama", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear", cls: "primary", onClick: function () {
            var type = body.querySelector("#f-type").value, title = body.querySelector("#f-title").value.trim(), link = body.querySelector("#f-link").value.trim();
            if (!title) { ui.toast("El título es obligatorio", "warn"); return false; }
            var payload = { node_type: type, title: title, is_active: 1 };
            var map = { Department: "department", Designation: "designation", Employee: "employee", Agent: "agent" };
            if (link && map[type]) payload[map[type]] = link;
            api.create("OS Org Node", payload).then(function (doc) {
              nodes.push(doc);
              if (parentNode) return api.create("OS Org Relation", { from_node: doc.name, to_node: parentNode.name, relation_type: HIER }).then(function (rel) { relations.push(rel); });
            }).then(function () { ui.toast("Nodo creado", "ok"); computeAndRender(); }).catch(ui.error);
          }
        }]
      });
      function wireLink() {
        var type = body.querySelector("#f-type").value;
        var docmap = { Department: "Department", Designation: "Designation", Employee: "Employee", Agent: "OS Agent" };
        if (docmap[type]) ui.attachLinkSearch(body.querySelector("#f-link"), docmap[type]);
      }
      body.querySelector("#f-type").onchange = wireLink; wireLink();
    }

    function openCreateRelation() {
      var opts = nodes.map(function (n) { return '<option value="' + n.name + '">' + U.escapeHtml(label(n)) + '</option>'; }).join("");
      var body = document.createElement("div");
      body.innerHTML =
        ui.fieldRow("Desde", '<select class="os-select" id="r-from">' + opts + '</select>') +
        ui.fieldRow("Relación", '<select class="os-select" id="r-type">' + ui.opt(Object.keys(REL_LABEL)) + '</select>') +
        ui.fieldRow("Hacia", '<select class="os-select" id="r-to">' + opts + '</select>') +
        '<div class="hint">"Reporta a" define la jerarquía visual; las demás son relaciones secundarias (línea discontinua).</div>';
      ui.modal({
        title: "Nueva relación", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear relación", cls: "primary", onClick: function () {
            var from = body.querySelector("#r-from").value, to = body.querySelector("#r-to").value, type = body.querySelector("#r-type").value;
            if (from === to) { ui.toast("El origen y destino no pueden ser el mismo nodo", "warn"); return false; }
            if (type === HIER && wouldCreateCycle(hier, from, to)) { ui.toast("Esa relación crearía un ciclo jerárquico.", "warn"); return false; }
            api.create("OS Org Relation", { from_node: from, to_node: to, relation_type: type }).then(function (rel) {
              relations.push(rel); ui.toast("Relación creada", "ok"); computeAndRender();
            }).catch(ui.error);
          }
        }]
      });
    }

    /* ---------------- Toolbar ---------------- */
    root.querySelector('[data-act="fit"]').onclick = function () { engine && engine.fit(); };
    root.querySelector('[data-act="zin"]').onclick = function () { engine && engine.zoom(0.15); };
    root.querySelector('[data-act="zout"]').onclick = function () { engine && engine.zoom(-0.15); };
    root.querySelector('[data-act="new-node"]').onclick = function () { openCreateNode(null); };
    root.querySelector('[data-act="new-rel"]').onclick = openCreateRelation;
    root.querySelector('[data-act="orient"]').onclick = function (e) {
      state.orientation = state.orientation === "vertical" ? "horizontal" : "vertical";
      e.target.textContent = state.orientation === "vertical" ? "↕ Vertical" : "↔ Horizontal";
      engine = null; root.querySelector(".os-canvas-svg").outerHTML = '<svg class="os-canvas-svg"></svg>';
      computeAndRender(); setTimeout(function () { engine.fit(); }, 30);
    };
    root.querySelector('[data-act="expand"]').onclick = function () { state.collapsed = {}; computeAndRender(); };
    root.querySelector('[data-act="collapse"]').onclick = function () {
      Object.keys(hier.childrenOf).forEach(function (id) { state.collapsed[id] = true; });
      computeAndRender();
    };
    root.querySelector('[data-act="search"]').oninput = function (e) { state.q = e.target.value; computeAndRender(); };
    root.querySelector('[data-act="f-type"]').onchange = function (e) { state.type = e.target.value; computeAndRender(); };
    root.querySelector('[data-act="f-status"]').onchange = function (e) { state.status = e.target.value; computeAndRender(); };

    refetch().then(function () { setTimeout(function () { engine && engine.fit(); }, 30); });
  }

  OS.router.register("/org", {
    title: "Organigrama Vivo",
    mount: function (container) {
      container.innerHTML =
        '<div class="os-page-head"><div><div class="os-page-title">Organigrama Vivo</div>' +
        '<div class="os-page-sub">Empresa → Área → Puesto → Persona/Agente. Un clic abre la ficha; arrastra un nodo sobre otro para reasignar su jerarquía.</div></div></div>' +
        '<div class="os-canvas-wrap"><div id="os-org-canvas" style="position:absolute;inset:0"></div></div>';
      load(container, container.querySelector("#os-org-canvas"));
    },
    unmount: function () {}
  });
})(window);
