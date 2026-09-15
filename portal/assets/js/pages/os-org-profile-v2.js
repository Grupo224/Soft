/*!
 * Organigrama Vivo 2.0.1 — Ficha completa interna
 * ------------------------------------------------
 * Capa aditiva: intercepta el enlace legacy de "Ficha completa" del inspector
 * y abre una ficha amplia dentro de LivingOrg. No modifica core ERPNext ni
 * duplica datos: escribe en OS Org Node / OS Role Card / OS KPI Definition /
 * OS Process / OS SOP / File mediante OS.api.
 */
(function (global) {
  "use strict";

  var OS = global.OS;
  if (!OS || !OS.api || !OS.ui || !OS.util) return;
  var api = OS.api, ui = OS.ui, U = OS.util;
  var PROFILE_LINK = 'a[href^="/app/os-org-node/"]';
  var ROLE_FIELDS = ["purpose", "mission", "objectives", "expected_results", "responsibilities", "functions", "competencies", "tools"];
  var stateByModal = new WeakMap();

  function esc(v) { return U.escapeHtml(v == null ? "" : String(v)); }

  function nodeSource(node) {
    if (!node) return "";
    if (node.node_type === "Company") return node.company || "";
    if (node.node_type === "Department") return node.department || "";
    if (node.node_type === "Designation") return node.designation || "";
    if (node.node_type === "Employee") return node.employee || "";
    if (node.node_type === "Agent") return node.agent || "";
    return node.custom_ref || "";
  }

  function parseNodeName(anchor) {
    try {
      var path = new URL(anchor.href, global.location.origin).pathname;
      var marker = "/app/os-org-node/";
      var idx = path.indexOf(marker);
      return idx >= 0 ? decodeURIComponent(path.slice(idx + marker.length)) : "";
    } catch (e) { return ""; }
  }

  function isFichaLink(anchor) {
    if (!anchor || !anchor.matches(PROFILE_LINK)) return false;
    return /Ficha completa/i.test(anchor.textContent || "");
  }

  function listOrEmpty(doctype, opts) {
    return api.list(doctype, opts).catch(function () { return []; });
  }

  function firstRoleCard(node) {
    return listOrEmpty("OS Role Card", {
      fields: ["name","role_title","designation","org_node","purpose","mission","objectives","expected_results","responsibilities","functions","competencies","tools","kpis","process_refs","sop_refs","owner_user","modified"],
      orFilters: [["org_node","=",node.name]].concat(node.designation ? [["designation","=",node.designation]] : []),
      limit: 20
    }).then(function (rows) {
      return rows.find(function (r) { return r.org_node === node.name; }) || rows[0] || null;
    });
  }

  function loadProfile(nodeName) {
    return api.get("OS Org Node", nodeName).then(function (node) {
      return firstRoleCard(node).then(function (card) {
        var kpiOr = [["org_node","=",node.name]];
        if (node.designation) kpiOr.push(["designation","=",node.designation]);
        if (card) kpiOr.push(["role_card","=",card.name]);
        return Promise.all([
          listOrEmpty("OS KPI Definition", { fields: ["name","kpi_title","kpi_code","entity_type","formula","frequency","owner_user","role_card","org_node","designation","threshold_warning","threshold_critical"], orFilters: kpiOr, limit: 500 }),
          listOrEmpty("OS Process", { fields: ["name","process_title","process_code","responsible_node","org_area","department","status"], limit: 1000 }),
          listOrEmpty("OS SOP", { fields: ["name","sop_title","sop_code","responsible_node","department","status","process_ref"], limit: 1000 }),
          listOrEmpty("OS Org Relation", { fields: ["name","from_node","to_node","relation_type"], filters: [["to_node","=",node.name],["relation_type","=","REPORTS_TO"]], limit: 500 }),
          listOrEmpty("OS Org Node", { fields: ["name","node_type","title","employee","designation","department","company","is_active"], filters: [["node_type","=","Employee"]], limit: 1000 })
        ]).then(function (r) {
          var rels = r[3], employees = r[4], childIds = {};
          rels.forEach(function (rel) { childIds[rel.from_node] = true; });
          var people = employees.filter(function (p) { return childIds[p.name]; });
          return {
            node: node,
            roleCard: card,
            kpis: r[0],
            processes: r[1],
            sops: r[2],
            people: people,
            linkedProcesses: r[1].filter(function (p) { return p.responsible_node === node.name || p.org_area === node.name; }),
            linkedSops: r[2].filter(function (s) { return s.responsible_node === node.name; }),
            didSave: false
          };
        });
      });
    });
  }

  function tabButton(id, label, active) {
    return '<button type="button" class="os-org-profile-tab' + (active ? ' active' : '') + '" data-profile-tab="' + id + '">' + esc(label) + '</button>';
  }

  function pane(id, active) {
    return '<section class="os-org-profile-pane' + (active ? ' active' : '') + '" data-profile-pane="' + id + '"></section>';
  }

  function renderGeneral(host, st) {
    var n = st.node;
    host.innerHTML = '<div class="os-org-profile-grid">' +
      '<label><span>Nombre visible</span><input class="os-input" data-pf="title" value="' + esc(n.title || nodeSource(n) || n.name) + '"></label>' +
      '<label><span>Tipo</span><input class="os-input" value="' + esc(n.node_type || "") + '" disabled></label>' +
      '<label class="span-2"><span>Entidad vinculada ERPNext</span><input class="os-input" value="' + esc(nodeSource(n) || "Sin vínculo") + '" disabled></label>' +
      '<label><span>Estado</span><select class="os-select" data-pf="active"><option value="1"' + (n.is_active !== 0 ? ' selected' : '') + '>Activo</option><option value="0"' + (n.is_active === 0 ? ' selected' : '') + '>Inactivo</option></select></label>' +
      '<label><span>ID LivingOrg</span><input class="os-input" value="' + esc(n.name) + '" disabled></label>' +
      '</div>' +
      '<div class="os-org-profile-note">Esta ficha edita LivingOrg sin sacarte del organigrama. La entidad ERPNext vinculada se conserva como referencia y no pisa el nombre visible.</div>';
  }

  function renderRole(host, st) {
    var c = st.roleCard || {};
    function area(label, field, placeholder) {
      return '<label><span>' + esc(label) + '</span><textarea class="os-textarea" data-role-field="' + field + '" placeholder="' + esc(placeholder || "") + '">' + esc(c[field] || "") + '</textarea></label>';
    }
    host.innerHTML = '<div class="os-org-profile-form">' +
      area("Propósito", "purpose", "Por qué existe este puesto") +
      area("Misión", "mission", "Qué contribución principal realiza") +
      area("Objetivos", "objectives", "Qué debe lograr") +
      area("Resultados esperados", "expected_results", "Resultados concretos del puesto") +
      area("Responsabilidades", "responsibilities", "Qué debe asegurar") +
      area("Funciones", "functions", "Qué hace de manera recurrente") +
      area("Competencias", "competencies", "Conocimientos y habilidades necesarias") +
      area("Herramientas", "tools", "Sistemas, equipos y recursos") +
      '</div>';
  }

  function renderPeople(host, st) {
    var rows = st.people || [];
    host.innerHTML = '<div class="os-org-profile-section-head"><div><b>Personas asignadas</b><div class="hint">El puesto existe aunque quede vacante.</div></div>' +
      (st.node.node_type === "Designation" ? '<button type="button" class="os-btn primary sm" data-profile-assign>Asignar persona</button>' : '') + '</div>' +
      (rows.length ? '<div class="os-flow-list">' + rows.map(function (p) {
        return '<div class="os-flow-item"><div class="n">🧑</div><div><b>' + esc(p.title || p.employee || p.name) + '</b><div class="muted">' + esc(p.employee || "") + '</div></div></div>';
      }).join('') + '</div>' : ui.empty("👤", "Sin personas asignadas", "Puedes completar primero la ficha del puesto y asignar a alguien después."));
    var btn = host.querySelector("[data-profile-assign]");
    if (btn) btn.onclick = function () { openAssignPerson(st, host); };
  }

  function renderKpis(host, st) {
    host.innerHTML = '<div class="os-org-profile-section-head"><div><b>KPIs del puesto</b><div class="hint">Puedes editar los existentes o agregar nuevos sin salir de LivingOrg.</div></div><button type="button" class="os-btn primary sm" data-new-kpi>＋ KPI</button></div>' +
      '<div data-kpi-rows>' + (st.kpis.length ? st.kpis.map(kpiRow).join('') : ui.empty("◎", "Sin KPIs", "Agrega la primera métrica del puesto.")) + '</div>';
    host.querySelector("[data-new-kpi]").onclick = function () {
      var rows = host.querySelector("[data-kpi-rows]");
      if (rows.querySelector(".os-empty")) rows.innerHTML = "";
      rows.insertAdjacentHTML("beforeend", kpiRow({ name: "", kpi_title: "", formula: "", frequency: "" }));
    };
  }

  function kpiRow(k) {
    return '<div class="os-org-profile-kpi" data-kpi-name="' + esc(k.name || "") + '">' +
      '<input class="os-input" data-kpi="title" value="' + esc(k.kpi_title || "") + '" placeholder="Nombre del KPI">' +
      '<input class="os-input" data-kpi="frequency" value="' + esc(k.frequency || "") + '" placeholder="Frecuencia">' +
      '<textarea class="os-textarea" data-kpi="formula" placeholder="Fórmula / definición">' + esc(k.formula || "") + '</textarea>' +
      '</div>';
  }

  function renderProcesses(host, st) {
    var linked = st.linkedProcesses || [];
    var available = st.processes.filter(function (p) { return p.responsible_node !== st.node.name && p.org_area !== st.node.name; });
    host.innerHTML = '<div class="os-org-profile-section-head"><div><b>Procesos relacionados</b><div class="hint">Aquí los vinculas; el diagrama detallado sigue viviendo en Process Studio.</div></div></div>' +
      '<div class="os-org-profile-linker"><select class="os-select" data-process-select><option value="">Selecciona un proceso…</option>' + available.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.process_title || p.name) + '</option>'; }).join('') + '</select><button type="button" class="os-btn" data-link-process>Vincular</button></div>' +
      (linked.length ? '<div class="os-flow-list">' + linked.map(function (p) { return '<div class="os-flow-item"><div class="n">⇄</div><div><b>' + esc(p.process_title || p.name) + '</b><div class="muted">' + esc(p.status || "") + '</div></div></div>'; }).join('') + '</div>' : ui.empty("⇄", "Sin procesos vinculados", "Selecciona uno arriba para asociarlo al puesto."));
    var btn = host.querySelector("[data-link-process]");
    btn.onclick = function () {
      var name = host.querySelector("[data-process-select]").value;
      if (!name) return ui.toast("Selecciona un proceso.", "warn");
      api.update("OS Process", name, { responsible_node: st.node.name }).then(function (doc) {
        var p = st.processes.find(function (x) { return x.name === doc.name; }); if (p) Object.assign(p, doc);
        st.linkedProcesses = st.processes.filter(function (x) { return x.responsible_node === st.node.name || x.org_area === st.node.name; });
        st.didSave = true; renderProcesses(host, st); ui.toast("Proceso vinculado", "ok");
      }).catch(ui.error);
    };
  }

  function renderSops(host, st) {
    var linked = st.linkedSops || [];
    var available = st.sops.filter(function (s) { return s.responsible_node !== st.node.name; });
    host.innerHTML = '<div class="os-org-profile-section-head"><div><b>SOPs relacionados</b><div class="hint">Vincula procedimientos sin abandonar el organigrama.</div></div></div>' +
      '<div class="os-org-profile-linker"><select class="os-select" data-sop-select><option value="">Selecciona un SOP…</option>' + available.map(function (s) { return '<option value="' + esc(s.name) + '">' + esc(s.sop_title || s.name) + '</option>'; }).join('') + '</select><button type="button" class="os-btn" data-link-sop>Vincular</button></div>' +
      (linked.length ? '<div class="os-flow-list">' + linked.map(function (s) { return '<div class="os-flow-item"><div class="n">▤</div><div><b>' + esc(s.sop_title || s.name) + '</b><div class="muted">' + esc(s.status || "") + '</div></div></div>'; }).join('') + '</div>' : ui.empty("▤", "Sin SOPs vinculados", "Selecciona uno arriba para asociarlo al puesto."));
    host.querySelector("[data-link-sop]").onclick = function () {
      var name = host.querySelector("[data-sop-select]").value;
      if (!name) return ui.toast("Selecciona un SOP.", "warn");
      api.update("OS SOP", name, { responsible_node: st.node.name }).then(function (doc) {
        var s = st.sops.find(function (x) { return x.name === doc.name; }); if (s) Object.assign(s, doc);
        st.linkedSops = st.sops.filter(function (x) { return x.responsible_node === st.node.name; });
        st.didSave = true; renderSops(host, st); ui.toast("SOP vinculado", "ok");
      }).catch(ui.error);
    };
  }

  function ensureRoleCard(st) {
    if (st.roleCard) return Promise.resolve(st.roleCard);
    var payload = { role_title: st.node.title || nodeSource(st.node) || st.node.name, designation: st.node.designation || "", org_node: st.node.name, owner_user: OS.session.user };
    return api.create("OS Role Card", payload).then(function (doc) { st.roleCard = doc; return doc; });
  }

  function renderDocs(host, st) {
    host.innerHTML = '<div class="os-org-profile-section-head"><div><b>Documentos del puesto</b><div class="hint">Los archivos quedan en la ficha del puesto, no en la persona.</div></div><label class="os-btn primary sm">Subir archivo<input type="file" data-profile-file hidden></label></div><div data-profile-docs>' + ui.skeleton(3) + '</div>';
    host.querySelector("[data-profile-file]").onchange = function (e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      ensureRoleCard(st).then(function (card) {
        return api.uploadFile(file, { isPrivate: true, doctype: "OS Role Card", docname: card.name });
      }).then(function () { st.didSave = true; ui.toast("Documento cargado", "ok"); loadDocs(host, st); }).catch(ui.error);
    };
    loadDocs(host, st);
  }

  function loadDocs(host, st) {
    var target = host.querySelector("[data-profile-docs]");
    if (!target) return;
    if (!st.roleCard) { target.innerHTML = ui.empty("📎", "Aún no hay ficha guardada", "Guarda el perfil o sube un archivo para crearla."); return; }
    listOrEmpty("File", { fields: ["name","file_name","file_url","is_private","modified"], filters: [["attached_to_doctype","=","OS Role Card"],["attached_to_name","=",st.roleCard.name]], orderBy: "modified desc", limit: 100 }).then(function (files) {
      target.innerHTML = files.length ? '<div class="os-flow-list">' + files.map(function (f) { return '<div class="os-flow-item"><div class="n">📎</div><div><b>' + esc(f.file_name) + '</b><div class="muted">' + esc(U.timeAgo(f.modified)) + '</div></div></div>'; }).join('') + '</div>' : ui.empty("📎", "Sin documentos", "Sube manuales, perfiles, políticas o materiales del puesto.");
    });
  }

  function openAssignPerson(st, host) {
    var body = document.createElement("div");
    body.innerHTML = '<label class="os-field"><span>Employee</span><input class="os-input" data-employee-link placeholder="Buscar Employee"></label>' +
      '<div class="hint">Si la persona ya está asignada a otro puesto, LivingOrg no la moverá automáticamente.</div>';
    var input = body.querySelector("[data-employee-link]");
    ui.attachLinkSearch(input, "Employee");
    ui.modal({ title: "Asignar persona", body: body, actions: [
      { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
      { label: "Asignar", cls: "primary", keepOpen: true, onClick: function (close) {
        var employee = input.value.trim();
        if (!employee) { ui.toast("Selecciona un Employee.", "warn"); return false; }
        assignEmployee(st, employee).then(function () { close(); st.didSave = true; return reloadPeople(st); }).then(function () { renderPeople(host, st); ui.toast("Persona asignada", "ok"); }).catch(ui.error);
        return false;
      } }
    ]});
  }

  function reloadPeople(st) {
    return Promise.all([
      listOrEmpty("OS Org Relation", { fields: ["name","from_node","to_node","relation_type"], filters: [["to_node","=",st.node.name],["relation_type","=","REPORTS_TO"]], limit: 500 }),
      listOrEmpty("OS Org Node", { fields: ["name","node_type","title","employee","designation","department","company","is_active"], filters: [["node_type","=","Employee"]], limit: 1000 })
    ]).then(function (r) {
      var ids = {}; r[0].forEach(function (rel) { ids[rel.from_node] = true; });
      st.people = r[1].filter(function (p) { return ids[p.name]; });
    });
  }

  function assignEmployee(st, employeeName) {
    return api.get("Employee", employeeName).then(function (emp) {
      return listOrEmpty("OS Org Node", { fields: ["name","node_type","title","employee","designation","department","company","is_active"], filters: [["employee","=",emp.name]], limit: 20 }).then(function (rows) {
        var person = rows[0];
        var ensureNode = person ? Promise.resolve(person) : api.create("OS Org Node", {
          node_type: "Employee", title: emp.employee_name || emp.name, employee: emp.name,
          designation: emp.designation || "", department: emp.department || "", company: emp.company || "", is_active: 1
        });
        return ensureNode.then(function (node) {
          return listOrEmpty("OS Org Relation", { fields: ["name","from_node","to_node","relation_type"], filters: [["from_node","=",node.name],["relation_type","=","REPORTS_TO"]], limit: 20 }).then(function (rels) {
            if (rels.some(function (r) { return r.to_node === st.node.name; })) return node;
            if (rels.length) throw new Error("Esta persona ya está asignada a otro puesto. Cámbiala desde el organigrama para evitar moverla por accidente.");
            return api.create("OS Org Relation", { from_node: node.name, to_node: st.node.name, relation_type: "REPORTS_TO" }).then(function () { return node; });
          });
        });
      });
    });
  }

  function renderProfile(body, st) {
    var isPosition = st.node.node_type === "Designation";
    var tabs = [{ id: "general", label: "General" }];
    if (isPosition) tabs = tabs.concat([
      { id: "role", label: "Perfil del puesto" }, { id: "people", label: "Personas" }, { id: "kpis", label: "KPIs" },
      { id: "processes", label: "Procesos" }, { id: "sops", label: "SOPs" }, { id: "docs", label: "Documentos" }
    ]);
    body.innerHTML = '<div class="os-org-profile-head"><div><span class="os-org-profile-kicker">Ficha completa</span><h3>' + esc(st.node.title || nodeSource(st.node) || st.node.name) + '</h3><p>' + esc(st.node.node_type) + ' · ' + esc(nodeSource(st.node) || "Sin vínculo ERPNext") + '</p></div></div>' +
      '<div class="os-org-profile-tabs">' + tabs.map(function (t, i) { return tabButton(t.id, t.label, i === 0); }).join('') + '</div>' +
      '<div class="os-org-profile-panes">' + tabs.map(function (t, i) { return pane(t.id, i === 0); }).join('') + '</div>';

    renderGeneral(body.querySelector('[data-profile-pane="general"]'), st);
    if (isPosition) {
      renderRole(body.querySelector('[data-profile-pane="role"]'), st);
      renderPeople(body.querySelector('[data-profile-pane="people"]'), st);
      renderKpis(body.querySelector('[data-profile-pane="kpis"]'), st);
      renderProcesses(body.querySelector('[data-profile-pane="processes"]'), st);
      renderSops(body.querySelector('[data-profile-pane="sops"]'), st);
      renderDocs(body.querySelector('[data-profile-pane="docs"]'), st);
    }
    body.querySelectorAll("[data-profile-tab]").forEach(function (btn) {
      btn.onclick = function () {
        body.querySelectorAll("[data-profile-tab]").forEach(function (b) { b.classList.toggle("active", b === btn); });
        body.querySelectorAll("[data-profile-pane]").forEach(function (p) { p.classList.toggle("active", p.dataset.profilePane === btn.dataset.profileTab); });
      };
    });
  }

  function saveProfile(body, st, saveStateEl) {
    var titleEl = body.querySelector('[data-pf="title"]');
    if (!titleEl) return;
    var title = titleEl.value.trim();
    if (!title) { ui.toast("El nombre visible es obligatorio.", "warn"); return; }
    ui.saveState(saveStateEl, "saving");
    var tasks = [api.update("OS Org Node", st.node.name, { title: title, is_active: Number(body.querySelector('[data-pf="active"]').value) })];

    if (st.node.node_type === "Designation") {
      var rolePayload = { role_title: title, designation: st.node.designation || "", org_node: st.node.name, owner_user: st.roleCard ? st.roleCard.owner_user : OS.session.user };
      ROLE_FIELDS.forEach(function (f) { var el = body.querySelector('[data-role-field="' + f + '"]'); rolePayload[f] = el ? el.value : ""; });
      tasks.push(st.roleCard ? api.update("OS Role Card", st.roleCard.name, rolePayload) : api.create("OS Role Card", rolePayload));

      body.querySelectorAll("[data-kpi-name]").forEach(function (row) {
        var kpiTitle = row.querySelector('[data-kpi="title"]').value.trim();
        if (!kpiTitle) return;
        var payload = {
          kpi_title: kpiTitle,
          formula: row.querySelector('[data-kpi="formula"]').value,
          frequency: row.querySelector('[data-kpi="frequency"]').value,
          entity_type: "Position",
          org_node: st.node.name,
          designation: st.node.designation || "",
          owner_user: OS.session.user
        };
        if (st.roleCard) payload.role_card = st.roleCard.name;
        if (row.dataset.kpiName) tasks.push(api.update("OS KPI Definition", row.dataset.kpiName, payload));
        else {
          payload.kpi_code = "KPI-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
          tasks.push(api.create("OS KPI Definition", payload));
        }
      });
    }

    Promise.all(tasks).then(function (result) {
      Object.assign(st.node, result[0]);
      if (st.node.node_type === "Designation" && result[1]) st.roleCard = result[1];
      st.didSave = true;
      ui.saveState(saveStateEl, "saved");
      ui.toast("Ficha guardada", "ok");
    }).catch(function (err) { ui.saveState(saveStateEl, "error"); ui.error(err); });
  }

  function openProfile(nodeName) {
    var body = document.createElement("div");
    body.className = "os-org-profile";
    body.innerHTML = '<div class="os-org-profile-loading">' + ui.skeleton(7) + '</div>';
    var saveState = document.createElement("span");
    saveState.className = "os-save-state";
    var st = null;
    var modal = ui.modal({
      title: "Ficha completa · LivingOrg",
      wide: true,
      body: body,
      actions: [
        { label: "Cerrar", cls: "ghost", onClick: function () { if (st && st.didSave) setTimeout(function () { global.location.reload(); }, 0); return true; } },
        { label: "Guardar cambios", cls: "primary", keepOpen: true, onClick: function () { if (st) saveProfile(body, st, saveState); return false; } }
      ]
    });
    modal.el.classList.add("os-org-profile-modal");
    var foot = modal.el.querySelector(".os-modal-foot");
    if (foot) foot.insertBefore(saveState, foot.firstChild);
    ui.saveState(saveState, "idle");
    loadProfile(nodeName).then(function (loaded) { st = loaded; stateByModal.set(modal.el, st); renderProfile(body, st); }).catch(function (err) {
      body.innerHTML = ui.empty("⚠", "No se pudo cargar la ficha", err.message || "Revisa permisos y conexión.");
      ui.error(err);
    });
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest ? event.target.closest(PROFILE_LINK) : null;
    if (!isFichaLink(anchor)) return;
    var appRoot = document.getElementById("os-app-root");
    if (appRoot && !appRoot.contains(anchor)) return;
    var nodeName = parseNodeName(anchor);
    if (!nodeName) return;
    event.preventDefault();
    event.stopPropagation();
    openProfile(nodeName);
  }, true);

  OS.orgProfileV2 = { version: "2.0.1", open: openProfile };
})(window);
