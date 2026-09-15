/*!
 * Organigrama Vivo 2.0
 * --------------------
 * Nueva experiencia recomendada sobre el mismo modelo OS Org Node / OS Org Relation.
 * Se carga ANTES de os-page-org.js; el router resuelve la primera ruta /org registrada,
 * por lo que la implementación 1.x permanece intacta y recuperable sin duplicar datos.
 *
 * Principios:
 * - Empresa -> Departamento -> Puesto -> Persona/Agente.
 * - Designation (puesto) y Employee (persona) son entidades distintas.
 * - `title` es el nombre visual; los links ERPNext son la fuente vinculada y no pisan el display.
 * - La UI evita relaciones jerárquicas absurdas antes de enviarlas.
 * - Las relaciones históricas se conservan: se advierten, nunca se migran/borran automáticamente.
 */
(function (global) {
  "use strict";

  var OS = global.OS;
  if (!OS || !OS.api || !OS.ui || !OS.util || !OS.canvas || !OS.router) return;
  var api = OS.api, ui = OS.ui, U = OS.util;

  var HIER = "REPORTS_TO";
  var NODE_W = 236, NODE_H = 86;
  var TYPE_ICON = { Company: "🏢", Department: "🏛", Designation: "🎖", Employee: "🧑", Agent: "🤖", Custom: "●" };
  var TYPE_LABEL = { Company: "Empresa", Department: "Departamento", Designation: "Puesto", Employee: "Persona", Agent: "Agente IA", Custom: "Personalizado" };
  var REL_LABEL = {
    REPORTS_TO: "Reporta a", COLLABORATES_WITH: "Colabora con", SUPPORTS: "Apoya a", EXECUTES: "Ejecuta",
    OWNS: "Es dueño de", APPROVES: "Aprueba", USES: "Usa", READS: "Lee", WRITES: "Escribe",
    TRIGGERS: "Dispara", HANDOFF_TO: "Entrega a", DEPENDS_ON: "Depende de", MEASURES: "Mide"
  };

  /* Matriz semántica padre -> hijos permitidos en la experiencia principal. */
  var CHILD_RULES = {
    Company: ["Department"],
    Department: ["Department", "Designation"],
    Designation: ["Designation", "Employee", "Agent"],
    Employee: [],
    Agent: [],
    Custom: ["Custom"]
  };

  function sourceField(node) {
    if (!node) return "";
    if (node.node_type === "Company") return node.company || "";
    if (node.node_type === "Department") return node.department || "";
    if (node.node_type === "Designation") return node.designation || "";
    if (node.node_type === "Employee") return node.employee || "";
    if (node.node_type === "Agent") return node.agent || "";
    return node.custom_ref || "";
  }

  /* Nombre de la entidad original vinculada. Nunca se usa como override del nombre visual. */
  function getSourceLabel(node) {
    var value = sourceField(node);
    return value ? (TYPE_LABEL[node.node_type] || node.node_type) + " · " + value : "Sin vínculo ERPNext";
  }

  /* BUGFIX 2.0: `title` es canónico para la card. El vínculo ERPNext queda separado. */
  function getDisplayTitle(node) {
    if (!node) return "";
    return String(node.title || sourceField(node) || node.name || "").trim();
  }

  function getSearchLabel(node) {
    return [getDisplayTitle(node), sourceField(node), node.department, node.designation, node.employee, node.company]
      .filter(Boolean).join(" ").toLowerCase();
  }

  function isAllowedParentChild(parentType, childType) {
    return (CHILD_RULES[parentType] || []).indexOf(childType) !== -1;
  }

  function hierarchyValidationMessage(parent, child) {
    if (!parent || !child) return "Falta el padre o el elemento a mover.";
    if (!isAllowedParentChild(parent.node_type, child.node_type)) {
      return "Una " + (TYPE_LABEL[child.node_type] || child.node_type) + " no puede depender de " +
        (TYPE_LABEL[parent.node_type] || parent.node_type) + " en la jerarquía principal.";
    }
    return "";
  }

  function buildHierarchy(nodes, relations) {
    var byId = {}, parentOf = {}, childrenOf = {}, duplicateParents = {};
    nodes.forEach(function (n) { byId[n.name] = n; });
    relations.forEach(function (r) {
      if (r.relation_type !== HIER || !byId[r.from_node] || !byId[r.to_node] || r.from_node === r.to_node) return;
      if (parentOf[r.from_node]) { duplicateParents[r.from_node] = true; return; }
      var cur = r.to_node, guard = 0, closesCycle = false;
      while (cur && guard++ <= nodes.length) {
        if (cur === r.from_node) { closesCycle = true; break; }
        cur = parentOf[cur];
      }
      if (!closesCycle) parentOf[r.from_node] = r.to_node;
    });
    nodes.forEach(function (n) {
      var p = parentOf[n.name];
      if (p) (childrenOf[p] = childrenOf[p] || []).push(n.name);
    });
    var roots = nodes.filter(function (n) { return !parentOf[n.name]; }).map(function (n) { return n.name; });
    return { byId: byId, parentOf: parentOf, childrenOf: childrenOf, roots: roots, duplicateParents: duplicateParents };
  }

  function isDescendant(hier, ancestorId, nodeId) {
    var cur = hier.parentOf[nodeId], guard = 0;
    while (cur && guard++ < 1000) {
      if (cur === ancestorId) return true;
      cur = hier.parentOf[cur];
    }
    return false;
  }

  function wouldCreateCycle(hier, childId, parentId) {
    return childId === parentId || isDescendant(hier, childId, parentId);
  }

  function subtreeIds(hier, id, seen) {
    seen = seen || {};
    if (seen[id]) return [];
    seen[id] = true;
    var out = [id];
    (hier.childrenOf[id] || []).forEach(function (c) { out = out.concat(subtreeIds(hier, c, seen)); });
    return out;
  }

  function computeWarnings(nodes, relations, hier) {
    var out = [], connected = {}, seen = {};
    relations.forEach(function (r) { connected[r.from_node] = true; connected[r.to_node] = true; });
    nodes.forEach(function (n) {
      if (n.node_type !== "Company" && !connected[n.name]) out.push({ kind: "Elemento sin ubicación", label: getDisplayTitle(n) });
      if (hier.duplicateParents[n.name]) out.push({ kind: "Más de un padre jerárquico", label: getDisplayTitle(n) });
    });
    relations.forEach(function (r) {
      var key = r.from_node + "|" + r.to_node + "|" + r.relation_type;
      if (seen[key]) out.push({ kind: "Relación duplicada", label: r.from_node + " → " + r.to_node });
      seen[key] = true;
      if (r.relation_type === HIER && hier.byId[r.from_node] && hier.byId[r.to_node]) {
        var child = hier.byId[r.from_node], parent = hier.byId[r.to_node];
        if (!isAllowedParentChild(parent.node_type, child.node_type)) {
          out.push({ kind: "Relación histórica fuera del modelo 2.0", label: getDisplayTitle(child) + " → " + getDisplayTitle(parent) });
        }
      }
    });
    return out;
  }

  function treeLayout(hier, nodes, orientation, collapsed) {
    var LEVEL = orientation === "horizontal" ? 300 : 164;
    var LEAF = orientation === "horizontal" ? 112 : 258;
    var cursor = 0, visiting = {};
    nodes.forEach(function (n) { n._cx = undefined; n._hidden = true; });

    function place(id, depth) {
      var n = hier.byId[id];
      if (!n) return;
      if (visiting[id]) {
        n._hidden = false; n._depth = depth; n._cx = cursor * LEAF + LEAF / 2; cursor++; return;
      }
      visiting[id] = true;
      n._hidden = false; n._depth = depth;
      var kids = collapsed[id] ? [] : (hier.childrenOf[id] || []);
      if (!kids.length) {
        n._cx = cursor * LEAF + LEAF / 2; cursor++;
      } else {
        kids.forEach(function (k) { place(k, depth + 1); });
        var first = hier.byId[kids[0]], last = hier.byId[kids[kids.length - 1]];
        n._cx = (first._cx + last._cx) / 2;
      }
      if (orientation === "horizontal") {
        n.x = Math.round(depth * LEVEL + 48); n.y = Math.round(n._cx - NODE_H / 2);
      } else {
        n.x = Math.round(n._cx - NODE_W / 2); n.y = Math.round(depth * LEVEL + 54);
      }
      visiting[id] = false;
    }

    var roots = hier.roots.slice();
    roots.sort(function (a, b) {
      var na = hier.byId[a], nb = hier.byId[b];
      if (na.node_type === "Company" && nb.node_type !== "Company") return -1;
      if (nb.node_type === "Company" && na.node_type !== "Company") return 1;
      return getDisplayTitle(na).localeCompare(getDisplayTitle(nb));
    });
    roots.forEach(function (r) { place(r, 0); });
  }

  function mount(container, root) {
    var state = { orientation: "vertical", collapsed: {}, q: "", type: "", status: "" };
    var nodes = [], relations = [], roleCards = [], kpis = [], processes = [], sops = [];
    var hier = null, engine = null;

    root.innerHTML =
      '<div class="os-orgv2-toolbar">' +
        '<div class="os-orgv2-primary-actions">' +
          '<button class="os-btn primary" data-act="new-dept">＋ Departamento</button>' +
          '<button class="os-btn" data-act="fit">⤢ Ajustar</button>' +
          '<button class="os-btn icon" data-act="zin" title="Acercar" aria-label="Acercar">＋</button>' +
          '<button class="os-btn icon" data-act="zout" title="Alejar" aria-label="Alejar">－</button>' +
          '<button class="os-btn ghost" data-act="view">Vista ▾</button>' +
          '<button class="os-btn ghost" data-act="advanced">Avanzado ▾</button>' +
          '<button class="os-btn ghost" data-act="warn" style="display:none">⚠ 0</button>' +
        '</div>' +
        '<div class="os-orgv2-filters">' +
          '<input class="os-input" data-act="search" placeholder="Buscar departamento, puesto o persona…">' +
          '<select class="os-select" data-act="f-type"><option value="">Todos</option>' +
            ['Company','Department','Designation','Employee','Agent'].map(function (t) { return '<option value="' + t + '">' + TYPE_LABEL[t] + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="os-orgv2-empty" data-empty style="display:none"></div>' +
      '<svg class="os-canvas-svg os-orgv2-canvas"></svg>';

    function loadAll() {
      return Promise.all([
        api.list("OS Org Node", { fields: ["name","node_type","title","company","department","designation","employee","agent","custom_ref","is_active","modified","modified_by","owner"], limit: 500 }),
        api.list("OS Org Relation", { fields: ["name","from_node","to_node","relation_type","label"], limit: 1000 }),
        api.list("OS Role Card", { fields: ["name","role_title","designation","org_node","purpose","mission","objectives","expected_results","responsibilities","functions","competencies","tools","kpis","process_refs","sop_refs","owner_user","modified"], limit: 500 }).catch(function () { return []; }),
        api.list("OS KPI Definition", { fields: ["name","kpi_title","kpi_code","entity_type","formula","frequency","owner_user","role_card","org_node","designation","threshold_warning","threshold_critical"], limit: 1000 }).catch(function () { return []; }),
        api.list("OS Process", { fields: ["name","process_title","process_code","org_area","responsible_node","department","status"], limit: 1000 }).catch(function () { return []; }),
        api.list("OS SOP", { fields: ["name","sop_title","sop_code","responsible_node","department","status","process_ref"], limit: 1000 }).catch(function () { return []; })
      ]).then(function (r) {
        nodes = r[0]; relations = r[1]; roleCards = r[2]; kpis = r[3]; processes = r[4]; sops = r[5];
        computeAndRender();
      }).catch(function (err) {
        root.innerHTML = ui.empty("⚠", "No se pudo cargar el Organigrama Vivo", err.message || "Revisa permisos y conexión.");
      });
    }

    function childrenOfType(nodeId, type) {
      return (hier.childrenOf[nodeId] || []).map(function (id) { return hier.byId[id]; }).filter(function (n) { return n && (!type || n.node_type === type); });
    }

    function assignedPeople(positionNode) { return childrenOfType(positionNode.name, "Employee"); }
    function assignedAgents(positionNode) { return childrenOfType(positionNode.name, "Agent"); }

    function roleCardFor(node) {
      if (!node || node.node_type !== "Designation") return null;
      return roleCards.find(function (c) { return c.org_node === node.name; }) ||
        roleCards.find(function (c) { return node.designation && c.designation === node.designation; }) || null;
    }

    function kpisFor(node) {
      var card = roleCardFor(node);
      return kpis.filter(function (k) {
        return k.org_node === node.name || (card && k.role_card === card.name) || (node.designation && k.designation === node.designation);
      });
    }

    function processesFor(node) {
      return processes.filter(function (p) { return p.responsible_node === node.name || p.org_area === node.name; });
    }

    function sopsFor(node) {
      return sops.filter(function (s) { return s.responsible_node === node.name; });
    }

    function nodeMeta(node) {
      if (node.node_type === "Department") {
        var positions = childrenOfType(node.name, "Designation");
        var peopleCount = 0;
        positions.forEach(function (p) { peopleCount += assignedPeople(p).length; });
        return positions.length + " puesto" + (positions.length === 1 ? "" : "s") + " · " + peopleCount + " persona" + (peopleCount === 1 ? "" : "s");
      }
      if (node.node_type === "Designation") {
        var ppl = assignedPeople(node), ks = kpisFor(node).length, ps = processesFor(node).length;
        if (ppl.length === 0) return "Vacante · " + ks + " KPI · " + ps + " proceso" + (ps === 1 ? "" : "s");
        if (ppl.length === 1) return getDisplayTitle(ppl[0]) + " · " + ks + " KPI · " + ps + " proceso" + (ps === 1 ? "" : "s");
        return ppl.length + " personas · " + ks + " KPI · " + ps + " proceso" + (ps === 1 ? "" : "s");
      }
      if (node.node_type === "Employee") return node.designation || "Persona asignada";
      if (node.node_type === "Company") return childrenOfType(node.name, "Department").length + " departamentos";
      if (node.node_type === "Agent") return "Agente IA";
      return getSourceLabel(node);
    }

    function computeAndRender() {
      nodes.forEach(function (n) { n.w = NODE_W; n.h = NODE_H; });
      hier = buildHierarchy(nodes, relations);
      treeLayout(hier, nodes, state.orientation, state.collapsed);
      renderEmptyState();

      var visible = nodes.filter(function (n) { return !n._hidden; });
      var visibleIds = {}; visible.forEach(function (n) { visibleIds[n.name] = true; });
      var canvasNodes = visible.map(function (n) { return { id: n.name, x: n.x, y: n.y, w: n.w, h: n.h, data: n, live: n.is_active !== 0 }; });
      var canvasEdges = relations.filter(function (r) { return visibleIds[r.from_node] && visibleIds[r.to_node]; }).map(function (r) {
        return { id: r.name, data: r, from: r.from_node, to: r.to_node, label: r.relation_type === HIER ? "" : (REL_LABEL[r.relation_type] || r.relation_type), cls: r.relation_type === HIER ? "" : "secondary" };
      });

      if (!engine) {
        engine = OS.canvas.create(root.querySelector(".os-orgv2-canvas"), {
          edgeAnchor: state.orientation === "horizontal" ? "lr" : "tb",
          nodeShape: "rect",
          padTop: 126,
          renderNode: renderCard,
          onNodeClick: function (n) { openInspector(n.data); },
          onEdgeClick: function (e) { openRelationInspector(e.data); },
          onNodeDragEnd: handleDragEnd
        });
      }
      engine.setData(canvasNodes, canvasEdges);

      var keep = [];
      if (state.q || state.type) {
        keep = visible.filter(function (n) {
          var qOk = !state.q || getSearchLabel(n).indexOf(state.q.toLowerCase()) !== -1;
          var tOk = !state.type || n.node_type === state.type;
          return qOk && tOk;
        }).map(function (n) { return n.name; });
        engine.highlightDim(keep);
      } else engine.highlightDim(null);

      var warnings = computeWarnings(nodes, relations, hier);
      var wb = root.querySelector('[data-act="warn"]');
      wb.style.display = warnings.length ? "" : "none";
      wb.textContent = "⚠ " + warnings.length;
      wb.onclick = function () { showWarnings(warnings); };
    }

    function renderEmptyState() {
      var host = root.querySelector("[data-empty]");
      if (!nodes.length) {
        host.style.display = "flex";
        host.innerHTML = '<div class="os-orgv2-empty-card"><div class="ico">🏢</div><h3>Construye cómo funciona tu empresa</h3>' +
          '<p>Empieza vinculando la empresa y creando su primer departamento.</p><button class="os-btn primary" data-empty-company>Configurar empresa</button></div>';
        host.querySelector("[data-empty-company]").onclick = openCompanySetup;
        return;
      }
      var departments = nodes.filter(function (n) { return n.node_type === "Department"; });
      if (!departments.length) {
        host.style.display = "flex";
        host.innerHTML = '<div class="os-orgv2-empty-card"><div class="ico">🏛</div><h3>Aún no tienes departamentos</h3>' +
          '<p>Crea el primer departamento para comenzar la estructura.</p><button class="os-btn primary" data-empty-dept>＋ Crear departamento</button></div>';
        host.querySelector("[data-empty-dept]").onclick = createTopDepartment;
      } else {
        host.style.display = "none";
        host.innerHTML = "";
      }
    }

    function svgText(g, x, y, cls, value) {
      var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("class", cls); t.textContent = value || ""; g.appendChild(t); return t;
    }

    function ellipsize(t, maxWidth) {
      try {
        if (t.textContent.length > 90) t.textContent = t.textContent.slice(0, 90);
        if (t.getComputedTextLength() <= maxWidth) return;
        var full = t.textContent;
        for (var i = full.length - 1; i > 0; i--) {
          t.textContent = full.slice(0, i) + "…";
          if (t.getComputedTextLength() <= maxWidth) return;
        }
      } catch (e) {}
    }

    function renderCard(g, n) {
      var d = n.data, title = getDisplayTitle(d), meta = nodeMeta(d);
      var type = svgText(g, 14, 21, "n-sub os-orgv2-card-type", TYPE_ICON[d.node_type] + " " + TYPE_LABEL[d.node_type]);
      ellipsize(type, n.w - 52);
      var titleT = svgText(g, 14, 44, "n-title", title || "(sin nombre)");
      ellipsize(titleT, n.w - 28);
      var metaT = svgText(g, 14, 66, "n-sub os-orgv2-card-meta", meta);
      ellipsize(metaT, n.w - 40);

      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", n.w - 16); dot.setAttribute("cy", 16); dot.setAttribute("r", 5);
      dot.setAttribute("fill", d.is_active === 0 ? "#8a8478" : "#1F9D6B"); g.appendChild(dot);

      var kids = hier.childrenOf[d.name] || [];
      if (kids.length) {
        var ch = document.createElementNS("http://www.w3.org/2000/svg", "g");
        ch.setAttribute("transform", "translate(" + (n.w - 34) + "," + (n.h - 28) + ")"); ch.style.cursor = "pointer";
        var bg = document.createElementNS("http://www.w3.org/2000/svg", "circle"); bg.setAttribute("cx", 10); bg.setAttribute("cy", 10); bg.setAttribute("r", 11); bg.setAttribute("fill", "var(--os-border-soft)"); ch.appendChild(bg);
        var tx = svgText(ch, 10, 14, "n-badge", state.collapsed[d.name] ? "+" + kids.length : "−"); tx.setAttribute("text-anchor", "middle");
        ch.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
        ch.addEventListener("click", function (ev) { ev.stopPropagation(); state.collapsed[d.name] = !state.collapsed[d.name]; computeAndRender(); });
        g.appendChild(ch);
      }
    }

    function handleDragEnd(n, x, y) {
      var cx = x + n.w / 2, cy = y + n.h / 2, subtree = subtreeIds(hier, n.id);
      var target = nodes.find(function (o) {
        if (o._hidden || subtree.indexOf(o.name) !== -1) return false;
        return cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h;
      });
      if (!target) { computeAndRender(); return; }
      var moved = hier.byId[n.id];
      var semantic = hierarchyValidationMessage(target, moved);
      if (semantic) { ui.toast(semantic, "warn", 5200); computeAndRender(); return; }
      if (wouldCreateCycle(hier, n.id, target.name)) { ui.toast("Ese movimiento crearía un ciclo jerárquico.", "warn"); computeAndRender(); return; }
      var oldParent = hier.parentOf[n.id];
      ui.confirm("¿Mover \"" + getDisplayTitle(moved) + "\" debajo de \"" + getDisplayTitle(target) + "\"?").then(function (ok) {
        if (!ok) { computeAndRender(); return; }
        replaceHierarchy(n.id, target.name).then(function () { ui.toast("Jerarquía actualizada", "ok"); }).catch(function (e) { ui.error(e); computeAndRender(); });
      });
    }

    function replaceHierarchy(childId, parentId) {
      var current = relations.find(function (r) { return r.from_node === childId && r.relation_type === HIER; });
      var remove = current ? api.remove("OS Org Relation", current.name).then(function () { relations.splice(relations.indexOf(current), 1); }) : Promise.resolve();
      return remove.then(function () {
        if (!parentId) return null;
        return api.create("OS Org Relation", { from_node: childId, to_node: parentId, relation_type: HIER });
      }).then(function (rel) { if (rel) relations.push(rel); computeAndRender(); return rel; });
    }

    function showWarnings(list) {
      var body = document.createElement("div");
      body.innerHTML = list.length ? list.map(function (w) {
        return '<div class="os-flow-item"><div class="n">⚠</div><div><b>' + U.escapeHtml(w.kind) + '</b><div class="muted">' + U.escapeHtml(w.label) + '</div></div></div>';
      }).join("") : ui.empty("✓", "Sin advertencias");
      ui.modal({ title: "Revisión de estructura", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
    }

    function chooseParentCompany() {
      var companies = nodes.filter(function (n) { return n.node_type === "Company"; });
      if (!companies.length) return openCompanySetup();
      if (companies.length === 1) return openCreateContextual(companies[0], "Department");
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Empresa", '<select class="os-select" id="orgv2-company">' + companies.map(function (c) {
        return '<option value="' + U.escapeHtml(c.name) + '">' + U.escapeHtml(getDisplayTitle(c)) + '</option>';
      }).join("") + '</select>');
      ui.modal({ title: "¿En qué empresa?", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Continuar", cls: "primary", onClick: function () { var c = hier.byId[body.querySelector("#orgv2-company").value]; if (c) setTimeout(function () { openCreateContextual(c, "Department"); }, 0); return true; } }
      ]});
    }

    function createTopDepartment() { chooseParentCompany(); }

    function openCompanySetup() {
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Empresa ERPNext", '<input class="os-input" id="orgv2-company-link" placeholder="Selecciona Company">') +
        ui.fieldRow("Nombre visible", '<input class="os-input" id="orgv2-company-title" placeholder="Ej. Grupo Altoplano">') +
        '<div class="hint">LivingOrg crea una representación visual; no modifica el maestro Company.</div>';
      ui.attachLinkSearch(body.querySelector("#orgv2-company-link"), "Company");
      ui.modal({ title: "Configurar empresa", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Guardar empresa", cls: "primary", keepOpen: true, onClick: function (close) {
          var link = body.querySelector("#orgv2-company-link").value.trim(), title = body.querySelector("#orgv2-company-title").value.trim() || link;
          if (!link || !title) { ui.toast("Selecciona una Company y define el nombre visible.", "warn"); return false; }
          api.create("OS Org Node", { node_type: "Company", title: title, company: link, is_active: 1 }).then(function (doc) {
            nodes.push(doc); close(); computeAndRender(); ui.toast("Empresa configurada", "ok"); setTimeout(function () { openCreateContextual(doc, "Department"); }, 80);
          }).catch(ui.error);
          return false;
        } }
      ]});
    }

    function openCreateContextual(parent, childType) {
      if (!isAllowedParentChild(parent.node_type, childType)) { ui.toast("Esa acción no es válida en esta parte del organigrama.", "warn"); return; }
      var body = document.createElement("div"), label = TYPE_LABEL[childType];
      if (childType === "Employee") {
        body.innerHTML = ui.fieldRow("Persona (Employee)", '<input class="os-input" id="orgv2-link" placeholder="Buscar Employee">') +
          '<div class="hint">La persona se asignará al puesto sin cambiar automáticamente su maestro Employee.</div>';
        ui.attachLinkSearch(body.querySelector("#orgv2-link"), "Employee");
      } else {
        var dt = childType === "Department" ? "Department" : (childType === "Designation" ? "Designation" : "OS Agent");
        body.innerHTML = ui.fieldRow("Nombre", '<input class="os-input" id="orgv2-title" placeholder="' + (childType === "Department" ? "Ej. Comercial" : "Ej. Director Comercial") + '">') +
          ui.fieldRow("Vincular con " + dt + " (opcional)", '<input class="os-input" id="orgv2-link" placeholder="Buscar existente">') +
          '<div class="hint">Puedes construir primero la estructura y vincular ERPNext después.</div>';
        ui.attachLinkSearch(body.querySelector("#orgv2-link"), dt);
      }
      ui.modal({ title: childType === "Employee" ? "Asignar persona" : "Crear " + label.toLowerCase(), body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: childType === "Employee" ? "Asignar" : "Crear", cls: "primary", keepOpen: true, onClick: function (close) {
          var link = body.querySelector("#orgv2-link").value.trim();
          if (childType === "Employee") {
            if (!link) { ui.toast("Selecciona un Employee.", "warn"); return false; }
            api.get("Employee", link).then(function (emp) {
              return createNodeUnder(parent, { node_type: "Employee", title: emp.employee_name || emp.name, employee: emp.name, designation: emp.designation || "", department: emp.department || "", company: emp.company || "", is_active: 1 });
            }).then(function () { close(); ui.toast("Persona asignada", "ok"); }).catch(ui.error);
            return false;
          }
          var title = body.querySelector("#orgv2-title").value.trim() || link;
          if (!title) { ui.toast("Escribe un nombre.", "warn"); return false; }
          var payload = { node_type: childType, title: title, is_active: 1 };
          if (childType === "Department" && link) payload.department = link;
          if (childType === "Designation" && link) payload.designation = link;
          if (childType === "Agent" && link) payload.agent = link;
          if (childType === "Designation" && parent.node_type === "Department") payload.department = parent.department || "";
          if (childType === "Department" && parent.node_type === "Company") payload.company = parent.company || "";
          createNodeUnder(parent, payload).then(function () { close(); ui.toast(label + " creado", "ok"); }).catch(ui.error);
          return false;
        } }
      ]});
    }

    function createNodeUnder(parent, payload) {
      var fake = { node_type: payload.node_type };
      var semantic = hierarchyValidationMessage(parent, fake);
      if (semantic) return Promise.reject({ message: semantic });
      return api.create("OS Org Node", payload).then(function (doc) {
        nodes.push(doc);
        return api.create("OS Org Relation", { from_node: doc.name, to_node: parent.name, relation_type: HIER }).then(function (rel) { relations.push(rel); computeAndRender(); return doc; });
      });
    }

    function openAdvancedCreateNode() {
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Tipo técnico", '<select class="os-select" id="adv-type">' + Object.keys(TYPE_LABEL).map(function (t) { return '<option value="' + t + '">' + TYPE_LABEL[t] + '</option>'; }).join("") + '</select>') +
        ui.fieldRow("Nombre visible", '<input class="os-input" id="adv-title">') +
        '<div class="hint">Modo avanzado: crea una representación sin relación. Úsalo sólo para compatibilidad o modelado excepcional.</div>';
      ui.modal({ title: "Crear elemento avanzado", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Crear", cls: "primary", keepOpen: true, onClick: function (close) {
          var t = body.querySelector("#adv-type").value, title = body.querySelector("#adv-title").value.trim();
          if (!title) { ui.toast("El nombre es obligatorio", "warn"); return false; }
          api.create("OS Org Node", { node_type: t, title: title, is_active: 1 }).then(function (doc) { nodes.push(doc); close(); computeAndRender(); }).catch(ui.error); return false;
        } }
      ]});
    }

    function openAdvancedRelation() {
      var opts = nodes.map(function (n) { return '<option value="' + U.escapeHtml(n.name) + '">' + U.escapeHtml(getDisplayTitle(n)) + ' · ' + TYPE_LABEL[n.node_type] + '</option>'; }).join("");
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Desde", '<select class="os-select" id="adv-from">' + opts + '</select>') +
        ui.fieldRow("Tipo", '<select class="os-select" id="adv-rel">' + Object.keys(REL_LABEL).map(function (r) { return '<option value="' + r + '">' + REL_LABEL[r] + '</option>'; }).join("") + '</select>') +
        ui.fieldRow("Hacia", '<select class="os-select" id="adv-to">' + opts + '</select>') +
        '<div class="hint">REPORTS_TO sigue sujeto a reglas semánticas y prevención de ciclos. Otras relaciones son secundarias.</div>';
      ui.modal({ title: "Relación avanzada", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Crear relación", cls: "primary", keepOpen: true, onClick: function (close) {
          var from = body.querySelector("#adv-from").value, to = body.querySelector("#adv-to").value, type = body.querySelector("#adv-rel").value;
          if (from === to) { ui.toast("Origen y destino no pueden ser iguales.", "warn"); return false; }
          if (type === HIER) {
            var child = hier.byId[from], parent = hier.byId[to], msg = hierarchyValidationMessage(parent, child);
            if (msg) { ui.toast(msg, "warn"); return false; }
            if (wouldCreateCycle(hier, from, to)) { ui.toast("La relación crearía un ciclo.", "warn"); return false; }
          }
          api.create("OS Org Relation", { from_node: from, to_node: to, relation_type: type }).then(function (rel) { relations.push(rel); close(); computeAndRender(); }).catch(ui.error); return false;
        } }
      ]});
    }

    function openAdvancedMenu() {
      var body = document.createElement("div");
      body.innerHTML = '<div class="os-orgv2-action-grid"><button class="os-btn" data-x="node">＋ Elemento técnico</button><button class="os-btn" data-x="rel">↔ Relación</button></div>' +
        '<div class="hint" style="margin-top:12px">La experiencia principal usa acciones contextuales. Este menú conserva capacidades 1.x para casos avanzados.</div>';
      var m = ui.modal({ title: "Avanzado", body: body, actions: [{ label: "Cerrar", cls: "ghost", onClick: function () { return true; } }] });
      body.querySelector('[data-x="node"]').onclick = function () { m.close(); openAdvancedCreateNode(); };
      body.querySelector('[data-x="rel"]').onclick = function () { m.close(); openAdvancedRelation(); };
    }

    function openViewMenu() {
      var body = document.createElement("div");
      body.innerHTML = '<div class="os-orgv2-action-grid">' +
        '<button class="os-btn" data-v="orient">' + (state.orientation === "vertical" ? "↔ Vista horizontal" : "↕ Vista vertical") + '</button>' +
        '<button class="os-btn" data-v="expand">Expandir todo</button><button class="os-btn" data-v="collapse">Contraer todo</button></div>';
      var m = ui.modal({ title: "Vista", body: body, actions: [{ label: "Cerrar", cls: "ghost", onClick: function () { return true; } }] });
      body.querySelector('[data-v="orient"]').onclick = function () {
        state.orientation = state.orientation === "vertical" ? "horizontal" : "vertical"; m.close();
        engine = null; root.querySelector(".os-orgv2-canvas").outerHTML = '<svg class="os-canvas-svg os-orgv2-canvas"></svg>'; computeAndRender(); setTimeout(function () { if (engine) engine.fit(); }, 40);
      };
      body.querySelector('[data-v="expand"]').onclick = function () { state.collapsed = {}; m.close(); computeAndRender(); };
      body.querySelector('[data-v="collapse"]').onclick = function () { Object.keys(hier.childrenOf).forEach(function (id) { state.collapsed[id] = true; }); m.close(); computeAndRender(); };
    }

    function openRelationInspector(rel) {
      var from = hier.byId[rel.from_node], to = hier.byId[rel.to_node];
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Desde", '<div class="os-tag">' + U.escapeHtml(getDisplayTitle(from) || rel.from_node) + '</div>') +
        ui.fieldRow("Hacia", '<div class="os-tag">' + U.escapeHtml(getDisplayTitle(to) || rel.to_node) + '</div>') +
        ui.fieldRow("Tipo", '<div>' + U.escapeHtml(REL_LABEL[rel.relation_type] || rel.relation_type) + '</div>') +
        '<div class="hint">Las relaciones técnicas se administran desde Avanzado. La jerarquía principal también puede cambiarse arrastrando una card.</div>';
      ui.inspector.open({ title: "Relación", subtitle: REL_LABEL[rel.relation_type] || rel.relation_type, body: body, foot: document.createElement("div"), onClose: function () { if (engine) engine.clearSelection(); } });
    }

    function openInspector(node) {
      var body = document.createElement("div"), foot = document.createElement("div");
      var tabs = [{ id: "summary", label: "Resumen" }];
      if (node.node_type === "Designation") tabs = tabs.concat([
        { id: "role", label: "Rol" }, { id: "people", label: "Personas" }, { id: "kpis", label: "KPIs" },
        { id: "processes", label: "Procesos" }, { id: "sops", label: "SOPs" }, { id: "docs", label: "Documentos" }
      ]);
      if (node.node_type === "Department") tabs.push({ id: "structure", label: "Estructura" });
      if (node.node_type === "Employee") tabs.push({ id: "person", label: "Persona" });

      body.innerHTML = '<div class="os-orgv2-tabs">' + tabs.map(function (t, i) { return '<button class="os-orgv2-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>'; }).join('') + '</div>' +
        '<div class="os-orgv2-panes">' + tabs.map(function (t, i) { return '<section class="os-orgv2-pane' + (i === 0 ? ' active' : '') + '" data-pane="' + t.id + '"></section>'; }).join('') + '</div>';

      foot.innerHTML = '<span class="os-save-state" id="orgv2-save-state"></span><div class="os-orgv2-foot-actions">' +
        '<button class="os-btn ghost sm" id="orgv2-actions">Acciones ▾</button>' +
        '<a class="os-btn ghost sm" href="/app/os-org-node/' + encodeURIComponent(node.name) + '" target="_blank">Ficha completa ↗</a>' +
        '<button class="os-btn ghost sm" id="orgv2-cancel">Cancelar</button>' +
        '<button class="os-btn primary sm" id="orgv2-save">Guardar</button></div>';

      renderSummaryPane(body.querySelector('[data-pane="summary"]'), node);
      if (node.node_type === "Designation") {
        renderRolePane(body.querySelector('[data-pane="role"]'), node);
        renderPeoplePane(body.querySelector('[data-pane="people"]'), node);
        renderKpiPane(body.querySelector('[data-pane="kpis"]'), node);
        renderProcessPane(body.querySelector('[data-pane="processes"]'), node);
        renderSopPane(body.querySelector('[data-pane="sops"]'), node);
        renderDocsPane(body.querySelector('[data-pane="docs"]'), node);
      }
      if (node.node_type === "Department") renderStructurePane(body.querySelector('[data-pane="structure"]'), node);
      if (node.node_type === "Employee") renderPersonPane(body.querySelector('[data-pane="person"]'), node);

      ui.inspector.open({ title: getDisplayTitle(node), subtitle: TYPE_LABEL[node.node_type] + " · " + getSourceLabel(node), body: body, foot: foot, onClose: function () { if (engine) engine.clearSelection(); } });
      ui.saveState(foot.querySelector("#orgv2-save-state"), "idle");

      body.querySelectorAll("[data-tab]").forEach(function (btn) {
        btn.onclick = function () {
          body.querySelectorAll("[data-tab]").forEach(function (b) { b.classList.toggle("active", b === btn); });
          body.querySelectorAll("[data-pane]").forEach(function (p) { p.classList.toggle("active", p.dataset.pane === btn.dataset.tab); });
          if (btn.dataset.tab === "docs") refreshDocuments(node, body.querySelector('[data-pane="docs"]'));
        };
      });
      foot.querySelector("#orgv2-cancel").onclick = function () { ui.inspector.closeGuarded(); };
      foot.querySelector("#orgv2-actions").onclick = function () { openContextActions(node); };
      foot.querySelector("#orgv2-save").onclick = function () { saveInspector(node, body, foot); };
    }

    function renderSummaryPane(pane, node) {
      pane.innerHTML = '<div class="os-section-title">Identidad</div>' +
        ui.fieldRow("Nombre visible", '<input class="os-input" data-f="display-title" value="' + U.escapeHtml(getDisplayTitle(node)) + '">') +
        ui.fieldRow("Entidad vinculada", '<div class="os-orgv2-source">' + U.escapeHtml(getSourceLabel(node)) + '</div>') +
        ui.fieldRow("Estado", '<label class="os-check"><input type="checkbox" data-f="active" ' + (node.is_active !== 0 ? 'checked' : '') + '> Activo</label>') +
        '<div class="os-section-title">Contexto</div><div class="os-orgv2-summary-grid">' + summaryItems(node).join('') + '</div>' +
        '<div class="os-section-title">Auditoría</div><div class="hint">Últ. modificación: ' + U.timeAgo(node.modified) + ' por ' + U.escapeHtml(node.modified_by || node.owner || "—") + '</div>';
    }

    function summaryItems(node) {
      var items = [];
      function item(label, value) { items.push('<div class="os-orgv2-summary-item"><span>' + U.escapeHtml(label) + '</span><b>' + U.escapeHtml(String(value)) + '</b></div>'); }
      if (node.node_type === "Department") { item("Puestos directos", childrenOfType(node.name, "Designation").length); item("Subdepartamentos", childrenOfType(node.name, "Department").length); }
      if (node.node_type === "Designation") { item("Personas", assignedPeople(node).length); item("KPIs", kpisFor(node).length); item("Procesos", processesFor(node).length); item("SOPs", sopsFor(node).length); }
      if (node.node_type === "Company") item("Departamentos", childrenOfType(node.name, "Department").length);
      if (node.node_type === "Employee") item("Puesto visual", hier.parentOf[node.name] && hier.byId[hier.parentOf[node.name]] ? getDisplayTitle(hier.byId[hier.parentOf[node.name]]) : "Sin asignar");
      return items;
    }

    function renderRolePane(pane, node) {
      var card = roleCardFor(node) || {};
      pane.innerHTML = '<div class="os-section-title">Perfil del puesto</div>' +
        ui.fieldRow("Propósito", '<textarea class="os-textarea" data-rc="purpose" placeholder="Por qué existe este puesto">' + U.escapeHtml(card.purpose || "") + '</textarea>') +
        ui.fieldRow("Misión", '<textarea class="os-textarea" data-rc="mission" placeholder="Qué contribución principal realiza">' + U.escapeHtml(card.mission || "") + '</textarea>') +
        ui.fieldRow("Objetivos", '<textarea class="os-textarea" data-rc="objectives">' + U.escapeHtml(card.objectives || "") + '</textarea>') +
        ui.fieldRow("Resultados esperados", '<textarea class="os-textarea" data-rc="expected_results">' + U.escapeHtml(card.expected_results || "") + '</textarea>') +
        ui.fieldRow("Responsabilidades", '<textarea class="os-textarea" data-rc="responsibilities">' + U.escapeHtml(card.responsibilities || "") + '</textarea>') +
        ui.fieldRow("Funciones", '<textarea class="os-textarea" data-rc="functions">' + U.escapeHtml(card.functions || "") + '</textarea>') +
        ui.fieldRow("Competencias", '<textarea class="os-textarea" data-rc="competencies">' + U.escapeHtml(card.competencies || "") + '</textarea>') +
        ui.fieldRow("Herramientas", '<textarea class="os-textarea" data-rc="tools">' + U.escapeHtml(card.tools || "") + '</textarea>') +
        '<div class="hint">KPIs, Procesos, SOPs y Documentos se administran en sus pestañas para no saturar esta ficha.</div>';
    }

    function renderPeoplePane(pane, node) {
      var people = assignedPeople(node), agents = assignedAgents(node);
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>Personas asignadas</b><div class="hint">El puesto existe aunque quede vacante.</div></div><button class="os-btn primary sm" data-add-person>Asignar persona</button></div>' +
        (people.length ? '<div class="os-flow-list">' + people.map(function (p) {
          return '<div class="os-flow-item"><div class="n">🧑</div><div style="flex:1"><b>' + U.escapeHtml(getDisplayTitle(p)) + '</b><div class="muted">' + U.escapeHtml(p.employee || "") + '</div></div><button class="os-btn ghost sm" data-unassign="' + U.escapeHtml(p.name) + '">Quitar</button></div>';
        }).join('') + '</div>' : ui.empty("👤", "Puesto vacante", "Asigna una persona cuando corresponda.")) +
        (agents.length ? '<div class="os-section-title">Agentes IA</div><div class="os-flow-list">' + agents.map(function (a) { return '<div class="os-flow-item"><div class="n">🤖</div><div><b>' + U.escapeHtml(getDisplayTitle(a)) + '</b></div></div>'; }).join('') + '</div>' : '');
      pane.querySelector("[data-add-person]").onclick = function () { openCreateContextual(node, "Employee"); };
      pane.querySelectorAll("[data-unassign]").forEach(function (b) { b.onclick = function () {
        var person = hier.byId[b.dataset.unassign]; if (!person) return;
        ui.confirm("¿Quitar a \"" + getDisplayTitle(person) + "\" de este puesto? La persona y el puesto se conservan.").then(function (ok) {
          if (!ok) return;
          replaceHierarchy(person.name, null).then(function () { ui.toast("Asignación eliminada; ambos registros se conservaron.", "ok"); ui.inspector.close(); }).catch(ui.error);
        });
      }; });
    }

    function renderKpiPane(pane, node) {
      var rows = kpisFor(node);
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>KPIs del puesto</b><div class="hint">Los KPIs permanecen aunque cambie la persona.</div></div><button class="os-btn primary sm" data-add-kpi>＋ KPI</button></div>' +
        (rows.length ? '<div class="os-flow-list">' + rows.map(function (k) { return '<div class="os-flow-item"><div class="n">◎</div><div style="flex:1"><b>' + U.escapeHtml(k.kpi_title) + '</b><div class="muted">' + U.escapeHtml(k.frequency || k.kpi_code || "") + '</div></div><a class="os-btn ghost sm" href="/app/os-kpi-definition/' + encodeURIComponent(k.name) + '" target="_blank">Abrir ↗</a></div>'; }).join('') + '</div>' : ui.empty("◎", "Sin KPIs", "Define cómo se mide el resultado de este puesto."));
      pane.querySelector("[data-add-kpi]").onclick = function () { openAddKpi(node); };
    }

    function openAddKpi(node) {
      var card = roleCardFor(node), body = document.createElement("div");
      body.innerHTML = ui.fieldRow("KPI", '<input class="os-input" id="kpi-title" placeholder="Ej. Conversión de oportunidades">') +
        ui.fieldRow("Fórmula / definición", '<textarea class="os-textarea" id="kpi-formula"></textarea>') +
        ui.fieldRow("Frecuencia", '<input class="os-input" id="kpi-frequency" placeholder="Semanal / Mensual">');
      ui.modal({ title: "Agregar KPI al puesto", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Crear KPI", cls: "primary", keepOpen: true, onClick: function (close) {
          var title = body.querySelector("#kpi-title").value.trim(); if (!title) { ui.toast("Escribe el KPI.", "warn"); return false; }
          var payload = { kpi_title: title, kpi_code: "KPI-" + Date.now().toString(36).toUpperCase(), entity_type: "Position", formula: body.querySelector("#kpi-formula").value, frequency: body.querySelector("#kpi-frequency").value, org_node: node.name, designation: node.designation || "", role_card: card ? card.name : "", owner_user: OS.session.user };
          api.create("OS KPI Definition", payload).then(function (doc) { kpis.push(doc); close(); computeAndRender(); ui.toast("KPI creado", "ok"); }).catch(ui.error); return false;
        } }
      ]});
    }

    function renderProcessPane(pane, node) {
      var rows = processesFor(node);
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>Procesos relacionados</b><div class="hint">El diagrama se edita en Process Studio.</div></div><button class="os-btn primary sm" data-link-process>Vincular proceso</button></div>' +
        (rows.length ? '<div class="os-flow-list">' + rows.map(function (p) { return '<div class="os-flow-item"><div class="n">⇄</div><div style="flex:1"><b>' + U.escapeHtml(p.process_title) + '</b><div class="muted">' + U.escapeHtml(p.status || "") + '</div></div><button class="os-btn ghost sm" data-open-process="' + U.escapeHtml(p.name) + '">Process Studio →</button></div>'; }).join('') + '</div>' : ui.empty("⇄", "Sin procesos vinculados", "Relaciona el puesto con los procesos que ejecuta o gobierna."));
      pane.querySelector("[data-link-process]").onclick = function () { openLinkProcess(node); };
      pane.querySelectorAll("[data-open-process]").forEach(function (b) { b.onclick = function () { ui.inspector.close(); OS.router.navigate("/processes/" + b.dataset.openProcess); }; });
    }

    function openLinkProcess(node) {
      var available = processes.filter(function (p) { return p.responsible_node !== node.name; });
      var body = document.createElement("div");
      body.innerHTML = available.length ? ui.fieldRow("Proceso", '<select class="os-select" id="link-process">' + available.map(function (p) { return '<option value="' + U.escapeHtml(p.name) + '">' + U.escapeHtml(p.process_title) + '</option>'; }).join('') + '</select>') : ui.empty("⇄", "No hay procesos disponibles");
      ui.modal({ title: "Vincular proceso", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Vincular", cls: "primary", keepOpen: true, onClick: function (close) {
          var sel = body.querySelector("#link-process"); if (!sel) return true;
          api.update("OS Process", sel.value, { responsible_node: node.name }).then(function (doc) { var old = processes.find(function (p) { return p.name === doc.name; }); if (old) Object.assign(old, doc); close(); computeAndRender(); ui.toast("Proceso vinculado", "ok"); }).catch(ui.error); return false;
        } }
      ]});
    }

    function renderSopPane(pane, node) {
      var rows = sopsFor(node);
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>SOPs relacionados</b><div class="hint">El procedimiento continúa administrándose en el módulo SOP.</div></div><button class="os-btn primary sm" data-link-sop>Vincular SOP</button></div>' +
        (rows.length ? '<div class="os-flow-list">' + rows.map(function (s) { return '<div class="os-flow-item"><div class="n">▤</div><div style="flex:1"><b>' + U.escapeHtml(s.sop_title) + '</b><div class="muted">' + U.escapeHtml(s.status || "") + '</div></div><a class="os-btn ghost sm" href="/app/os-sop/' + encodeURIComponent(s.name) + '" target="_blank">Abrir ↗</a></div>'; }).join('') + '</div>' : ui.empty("▤", "Sin SOPs vinculados", "Vincula los procedimientos que respaldan este puesto."));
      pane.querySelector("[data-link-sop]").onclick = function () { openLinkSop(node); };
    }

    function openLinkSop(node) {
      var available = sops.filter(function (s) { return s.responsible_node !== node.name; });
      var body = document.createElement("div");
      body.innerHTML = available.length ? ui.fieldRow("SOP", '<select class="os-select" id="link-sop">' + available.map(function (s) { return '<option value="' + U.escapeHtml(s.name) + '">' + U.escapeHtml(s.sop_title) + '</option>'; }).join('') + '</select>') : ui.empty("▤", "No hay SOPs disponibles");
      ui.modal({ title: "Vincular SOP", body: body, actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Vincular", cls: "primary", keepOpen: true, onClick: function (close) {
          var sel = body.querySelector("#link-sop"); if (!sel) return true;
          api.update("OS SOP", sel.value, { responsible_node: node.name }).then(function (doc) { var old = sops.find(function (s) { return s.name === doc.name; }); if (old) Object.assign(old, doc); close(); computeAndRender(); ui.toast("SOP vinculado", "ok"); }).catch(ui.error); return false;
        } }
      ]});
    }

    function renderDocsPane(pane, node) {
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>Documentos del puesto</b><div class="hint">Los archivos se adjuntan a la Role Card, no a la persona.</div></div><label class="os-btn primary sm">Subir archivo<input type="file" data-role-file hidden></label></div><div data-doc-list>' + ui.skeleton(3) + '</div>';
      var inp = pane.querySelector("[data-role-file]");
      inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        ensureRoleCard(node, pane.closest(".os-orgv2-panes")).then(function (card) {
          return api.uploadFile(inp.files[0], { isPrivate: true, doctype: "OS Role Card", docname: card.name });
        }).then(function () { ui.toast("Documento cargado", "ok"); refreshDocuments(node, pane); }).catch(ui.error);
      };
      refreshDocuments(node, pane);
    }

    function refreshDocuments(node, pane) {
      if (!pane) return;
      var listHost = pane.querySelector("[data-doc-list]"); if (!listHost) return;
      var card = roleCardFor(node);
      if (!card) { listHost.innerHTML = ui.empty("📎", "Aún no hay ficha del puesto", "Guarda el perfil del rol antes de adjuntar documentos."); return; }
      api.list("File", { fields: ["name","file_name","file_url","is_private","modified"], filters: [["attached_to_doctype","=","OS Role Card"],["attached_to_name","=",card.name]], orderBy: "modified desc", limit: 100 }).then(function (files) {
        listHost.innerHTML = files.length ? '<div class="os-flow-list">' + files.map(function (f) { return '<div class="os-flow-item"><div class="n">📎</div><div style="flex:1"><b>' + U.escapeHtml(f.file_name) + '</b><div class="muted">' + U.timeAgo(f.modified) + '</div></div>' + (f.file_url ? '<a class="os-btn ghost sm" href="' + U.escapeHtml(f.file_url) + '" target="_blank">Abrir ↗</a>' : '') + '</div>'; }).join('') + '</div>' : ui.empty("📎", "Sin documentos", "Sube manuales, perfiles, políticas o materiales del puesto.");
      }).catch(function (e) { listHost.innerHTML = ui.empty("⚠", "No se pudieron cargar documentos", e.message || ""); });
    }

    function renderStructurePane(pane, node) {
      var depts = childrenOfType(node.name, "Department"), positions = childrenOfType(node.name, "Designation");
      pane.innerHTML = '<div class="os-orgv2-pane-head"><div><b>Construir estructura</b><div class="hint">Agrega únicamente elementos válidos para un departamento.</div></div></div>' +
        '<div class="os-orgv2-action-grid"><button class="os-btn primary" data-add-position>＋ Puesto</button><button class="os-btn" data-add-subdept>＋ Subdepartamento</button></div>' +
        '<div class="os-section-title">Resumen</div><div class="hint">' + depts.length + ' subdepartamento(s) · ' + positions.length + ' puesto(s).</div>';
      pane.querySelector("[data-add-position]").onclick = function () { openCreateContextual(node, "Designation"); };
      pane.querySelector("[data-add-subdept]").onclick = function () { openCreateContextual(node, "Department"); };
    }

    function renderPersonPane(pane, node) {
      var parent = hier.parentOf[node.name] ? hier.byId[hier.parentOf[node.name]] : null;
      pane.innerHTML = ui.fieldRow("Employee", '<div class="os-orgv2-source">' + U.escapeHtml(node.employee || "Sin vínculo") + '</div>') +
        ui.fieldRow("Puesto en el organigrama", '<div>' + U.escapeHtml(parent ? getDisplayTitle(parent) : "Sin asignar") + '</div>') +
        ui.fieldRow("Designation en Employee", '<div>' + U.escapeHtml(node.designation || "—") + '</div>') +
        ui.fieldRow("Departamento en Employee", '<div>' + U.escapeHtml(node.department || "—") + '</div>') +
        (node.employee ? '<a class="os-btn" href="/app/employee/' + encodeURIComponent(node.employee) + '" target="_blank">Abrir Employee ↗</a>' : '');
    }

    function ensureRoleCard(node, panesHost) {
      var existing = roleCardFor(node); if (existing) return Promise.resolve(existing);
      var rolePane = panesHost ? panesHost.querySelector('[data-pane="role"]') : null;
      var payload = { role_title: getDisplayTitle(node), designation: node.designation || "", org_node: node.name, owner_user: OS.session.user };
      if (rolePane) {
        ["purpose","mission","objectives","expected_results","responsibilities","functions","competencies","tools"].forEach(function (f) { var el = rolePane.querySelector('[data-rc="' + f + '"]'); if (el) payload[f] = el.value; });
      }
      return api.create("OS Role Card", payload).then(function (doc) { roleCards.push(doc); return doc; });
    }

    function saveInspector(node, body, foot) {
      var stateEl = foot.querySelector("#orgv2-save-state"); ui.saveState(stateEl, "saving");
      var title = body.querySelector('[data-f="display-title"]').value.trim();
      if (!title) { ui.saveState(stateEl, "error"); ui.toast("El nombre visible es obligatorio.", "warn"); return; }
      var tasks = [api.update("OS Org Node", node.name, { title: title, is_active: body.querySelector('[data-f="active"]').checked ? 1 : 0 })];
      if (node.node_type === "Designation") {
        var rolePane = body.querySelector('[data-pane="role"]'), existing = roleCardFor(node);
        var rcPayload = { role_title: title, designation: node.designation || "", org_node: node.name, owner_user: existing ? existing.owner_user : OS.session.user };
        ["purpose","mission","objectives","expected_results","responsibilities","functions","competencies","tools"].forEach(function (f) { var el = rolePane.querySelector('[data-rc="' + f + '"]'); rcPayload[f] = el ? el.value : ""; });
        tasks.push(existing ? api.update("OS Role Card", existing.name, rcPayload) : api.create("OS Role Card", rcPayload));
      }
      Promise.all(tasks).then(function (result) {
        Object.assign(node, result[0]);
        if (node.node_type === "Designation" && result[1]) {
          var old = roleCards.find(function (c) { return c.name === result[1].name; }); if (old) Object.assign(old, result[1]); else roleCards.push(result[1]);
        }
        ui.saveState(stateEl, "saved"); ui.inspector.markClean(); ui.toast("Guardado", "ok"); computeAndRender();
      }).catch(function (e) { ui.saveState(stateEl, "error"); ui.error(e); });
    }

    function openContextActions(node) {
      var actions = [];
      if (node.node_type === "Company") actions.push({ label: "＋ Departamento", fn: function () { openCreateContextual(node, "Department"); } });
      if (node.node_type === "Department") {
        actions.push({ label: "＋ Puesto", fn: function () { openCreateContextual(node, "Designation"); } });
        actions.push({ label: "＋ Subdepartamento", fn: function () { openCreateContextual(node, "Department"); } });
      }
      if (node.node_type === "Designation") {
        actions.push({ label: "Asignar persona", fn: function () { openCreateContextual(node, "Employee"); } });
        actions.push({ label: "＋ Puesto subordinado", fn: function () { openCreateContextual(node, "Designation"); } });
        actions.push({ label: "＋ Agente IA", fn: function () { openCreateContextual(node, "Agent"); } });
      }
      if (node.node_type === "Employee" && hier.parentOf[node.name]) actions.push({ label: "Quitar asignación", fn: function () { replaceHierarchy(node.name, null).then(function () { ui.inspector.close(); ui.toast("Asignación eliminada", "ok"); }); } });
      var body = document.createElement("div");
      body.innerHTML = actions.length ? '<div class="os-orgv2-action-grid">' + actions.map(function (a, i) { return '<button class="os-btn" data-a="' + i + '">' + U.escapeHtml(a.label) + '</button>'; }).join('') + '</div>' : ui.empty("—", "Sin acciones contextuales");
      var m = ui.modal({ title: "Acciones · " + getDisplayTitle(node), body: body, actions: [{ label: "Cerrar", cls: "ghost", onClick: function () { return true; } }] });
      body.querySelectorAll("[data-a]").forEach(function (b) { b.onclick = function () { var a = actions[Number(b.dataset.a)]; m.close(); if (a) a.fn(); }; });
    }

    root.querySelector('[data-act="fit"]').onclick = function () { if (engine) engine.fit(); };
    root.querySelector('[data-act="zin"]').onclick = function () { if (engine) engine.zoom(0.15); };
    root.querySelector('[data-act="zout"]').onclick = function () { if (engine) engine.zoom(-0.15); };
    root.querySelector('[data-act="view"]').onclick = openViewMenu;
    root.querySelector('[data-act="advanced"]').onclick = openAdvancedMenu;
    root.querySelector('[data-act="new-dept"]').onclick = createTopDepartment;
    root.querySelector('[data-act="search"]').oninput = U.debounce(function (e) { state.q = e.target.value; computeAndRender(); }, 120);
    root.querySelector('[data-act="f-type"]').onchange = function (e) { state.type = e.target.value; computeAndRender(); };

    loadAll().then(function () { setTimeout(function () { if (engine) engine.fit(); }, 50); });
  }

  OS.orgV2 = {
    version: "2.0.0",
    getDisplayTitle: getDisplayTitle,
    getSourceLabel: getSourceLabel,
    getSearchLabel: getSearchLabel,
    isAllowedParentChild: isAllowedParentChild,
    childRules: CHILD_RULES
  };

  /* Registrar primero: el archivo legacy se carga después y queda preservado como fallback histórico. */
  OS.router.register("/org", {
    title: "Organigrama Vivo 2.0",
    mount: function (container) {
      container.innerHTML = '<div class="os-page-head os-orgv2-head"><div><div class="os-page-title">Organigrama Vivo</div>' +
        '<div class="os-page-sub">Construye cómo funciona tu empresa: Departamento → Puesto → Persona. La información del puesto permanece aunque cambie quien lo ocupa.</div></div>' +
        '<div class="os-orgv2-version">v2.0</div></div>' +
        '<div class="os-canvas-wrap os-orgv2-wrap"><div id="os-orgv2-root" style="position:absolute;inset:0"></div></div>';
      mount(container, container.querySelector("#os-orgv2-root"));
    }
  });
})(window);
