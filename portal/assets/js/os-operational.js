/*!
 * LivingOrg OS — Operational Layer
 * Conecta Process Studio / Work / Approvals / Runs con livingorg_bridge.
 * No ejecuta dotted paths configurables: sólo consume endpoints allowlist del Custom App.
 */
(function (global) {
  "use strict";
  var OS = global.OS;
  if (!OS || !OS.api || !OS.ui || !OS.util) return;
  var api = OS.api, ui = OS.ui, U = OS.util;
  var bridgePromise = null;

  function routeParts() {
    var path = (global.location.hash || "#/ ").replace(/^#/, "").split("?")[0];
    return path.split("/").filter(Boolean).map(function (v) { try { return decodeURIComponent(v); } catch (e) { return v; } });
  }
  function bridge() {
    if (!bridgePromise) {
      bridgePromise = api.call("livingorg_bridge.status.capabilities", {}, "GET").catch(function (err) {
        bridgePromise = null;
        throw err;
      });
    }
    return bridgePromise;
  }
  function bridgeError(err) {
    ui.toast("LivingOrg Bridge no está instalado o no responde. Revisa INSTALL.md. " + ((err && err.message) || ""), "warn", 6500);
  }
  function deskRoute(doctype, name) {
    if (!doctype || !name) return "";
    return "/app/" + String(doctype).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "/" + encodeURIComponent(name);
  }
  function parseJsonArray(raw) {
    if (!raw) return [];
    try { var v = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function uid(prefix) { return U.uid ? U.uid(prefix || "action") : (prefix || "action") + "-" + Date.now().toString(36); }
  function esc(v) { return U.escapeHtml(v == null ? "" : String(v)); }
  function actionLabel(type) {
    return ({
      OPEN_DOCUMENT: "Abrir documento", CREATE_DOCUMENT: "Crear documento", UPDATE_DOCUMENT: "Actualizar documento",
      CREATE_FROM_SOURCE: "Crear desde documento origen", SUBMIT_DOCUMENT: "Enviar / Submit", LINK_DOCUMENT: "Vincular documento"
    })[type] || type || "Acción";
  }
  function reloadWork() {
    var chip = document.querySelector("#chip-open.active") || document.querySelector("#chip-all.active") || document.querySelector("#chip-open");
    if (chip) chip.click();
  }

  /* ============================= Process Studio ============================= */
  function enhanceProcessStudio() {
    var parts = routeParts();
    if (parts[0] !== "processes" || !parts[1]) return;
    var runBtn = document.querySelector("#os-run-test");
    if (!runBtn) return;
    var processName = parts[1];
    var actionsHost = runBtn.parentElement;

    if (!document.querySelector("#os-system-actions")) {
      var cfg = document.createElement("button");
      cfg.type = "button"; cfg.id = "os-system-actions"; cfg.className = "os-btn";
      cfg.innerHTML = "⚙ Acciones ERPNext";
      cfg.onclick = function () { openProcessActions(processName); };
      actionsHost.insertBefore(cfg, runBtn);
    }

    if (!runBtn.dataset.operational) {
      var clone = runBtn.cloneNode(true);
      clone.dataset.operational = "1";
      clone.type = "button";
      clone.textContent = "▶ Ejecutar prueba";
      clone.onclick = function () { openRunStart(processName, "Test"); };
      runBtn.replaceWith(clone);
      runBtn = clone;
    }

    var statusSel = document.querySelector("#os-status-sel");
    if (statusSel && statusSel.value === "Active" && !document.querySelector("#os-run-live")) {
      var live = document.createElement("button");
      live.type = "button"; live.id = "os-run-live"; live.className = "os-btn primary";
      live.textContent = "▶ Ejecutar Live";
      live.onclick = function () { openRunStart(processName, "Live"); };
      actionsHost.appendChild(live);
    }

    bridge().then(function () {
      var b = document.querySelector("#os-system-actions");
      if (b && !b.querySelector(".os-op-dot")) b.insertAdjacentHTML("beforeend", '<span class="os-op-dot ok" title="Bridge operativo"></span>');
    }).catch(function () {
      var b = document.querySelector("#os-system-actions");
      if (b && !b.querySelector(".os-op-dot")) b.insertAdjacentHTML("beforeend", '<span class="os-op-dot warn" title="Bridge pendiente de instalar"></span>');
    });
  }

  function openRunStart(processName, mode) {
    bridge().then(function () {
      var body = document.createElement("div");
      body.innerHTML =
        '<div class="os-card os-op-callout"><b>' + esc(mode) + '</b><div class="muted">Puedes iniciar sin documento origen o vincular el registro que dispara este run.</div></div>' +
        ui.fieldRow("DocType origen (opcional)", '<input class="os-input" id="op-run-dt" placeholder="Ej. Sales Order">') +
        ui.fieldRow("Documento origen (opcional)", '<input class="os-input" id="op-run-name" placeholder="Ej. SAL-ORD-2026-00001">');
      ui.attachLinkSearch(body.querySelector("#op-run-dt"), "DocType");
      ui.modal({
        title: mode === "Live" ? "Iniciar ejecución real" : "Ejecutar prueba",
        body: body,
        actions: [
          { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
          { label: mode === "Live" ? "Iniciar Live" : "Crear run de prueba", cls: "primary", onClick: function () {
            var dt = body.querySelector("#op-run-dt").value.trim();
            var name = body.querySelector("#op-run-name").value.trim();
            if ((dt && !name) || (!dt && name)) { ui.toast("Completa DocType y documento origen, o deja ambos vacíos.", "warn"); return false; }
            api.call("livingorg_bridge.api.start_run", { process_name: processName, mode: mode, source_doctype: dt || null, source_name: name || null })
              .then(function (r) { ui.toast("Run creado: " + (r.run_code || r.run), "ok"); OS.router.navigate("/runs/" + encodeURIComponent(r.run)); })
              .catch(ui.error);
          }}
        ]
      });
    }).catch(bridgeError);
  }

  function openProcessActions(processName) {
    api.get("OS Process", processName).then(function (proc) {
      proc.actions = proc.actions || [];
      var body = document.createElement("div");
      function paint() {
        var byStep = {};
        (proc.steps || []).forEach(function (s) { byStep[s.step_key] = s.step_title || s.step_key; });
        body.innerHTML =
          '<div class="os-op-intro"><div><b>Acciones de sistema</b><div class="muted">Define dónde ocurre cada paso y qué documento ERPNext debe crear, modificar, vincular o abrir.</div></div>' +
          '<button class="os-btn primary sm" id="op-add-action">＋ Acción</button></div>' +
          (proc.actions.length ? proc.actions.slice().sort(function (a,b) { return (a.sort_order||0)-(b.sort_order||0); }).map(function (a, idx) {
            return '<button type="button" class="os-op-action-row" data-ai="' + proc.actions.indexOf(a) + '">' +
              '<span class="os-op-action-main"><b>' + esc(a.action_label || actionLabel(a.action_type)) + '</b><small>' + esc(byStep[a.step_key] || a.step_key || "Sin paso") + '</small></span>' +
              '<span class="os-op-action-meta"><span class="os-tag">' + esc(actionLabel(a.action_type)) + '</span><span class="os-tag">' + esc(a.target_doctype || "Sin DocType") + '</span></span>' +
              '</button>';
          }).join("") : ui.empty("⚙", "Sin acciones ERPNext", "Agrega una acción y vincúlala a un paso del proceso."));
        body.querySelector("#op-add-action").onclick = function () { editAction(proc, -1, function () { paint(); }); };
        body.querySelectorAll("[data-ai]").forEach(function (row) {
          row.onclick = function () { editAction(proc, parseInt(row.dataset.ai, 10), function () { paint(); }); };
        });
      }
      paint();
      ui.modal({ title: "ERPNext · " + (proc.process_title || proc.name), body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
    }).catch(ui.error);
  }

  function editAction(proc, index, done) {
    var existing = index >= 0 ? proc.actions[index] : null;
    var a = Object.assign({
      action_key: uid("action"), system: "ERPNext", action_type: "LINK_DOCUMENT", completion_rule: "Document Linked",
      is_required: 1, submit_after_create: 0, sort_order: proc.actions.length + 1
    }, existing || {});
    var body = document.createElement("div");
    var stepOpts = (proc.steps || []).map(function (s) { return '<option value="' + esc(s.step_key) + '"' + (a.step_key === s.step_key ? " selected" : "") + '>' + esc(s.step_title || s.step_key) + '</option>'; }).join("");
    var types = ["OPEN_DOCUMENT","CREATE_DOCUMENT","CREATE_FROM_SOURCE","UPDATE_DOCUMENT","SUBMIT_DOCUMENT","LINK_DOCUMENT"];
    body.innerHTML =
      '<div class="os-row">' + ui.fieldRow("Paso", '<select class="os-select" f="step_key"><option value="">Selecciona…</option>' + stepOpts + '</select>') +
      ui.fieldRow("Orden", '<input class="os-input" type="number" f="sort_order" value="' + esc(a.sort_order || 0) + '">') + '</div>' +
      ui.fieldRow("Nombre visible", '<input class="os-input" f="action_label" value="' + esc(a.action_label || "") + '" placeholder="Ej. Crear factura">') +
      ui.fieldRow("Acción", '<select class="os-select" f="action_type">' + types.map(function (t) { return '<option value="' + t + '"' + (a.action_type === t ? " selected" : "") + '>' + esc(actionLabel(t)) + '</option>'; }).join("") + '</select>') +
      '<details class="os-op-details" open><summary>Vínculo ERPNext</summary><div class="os-op-details-body">' +
      '<div class="os-row">' + ui.fieldRow("DocType origen", '<input class="os-input" f="source_doctype" id="op-source-dt" value="' + esc(a.source_doctype || "") + '" placeholder="Ej. Sales Order">') +
      ui.fieldRow("DocType destino", '<input class="os-input" f="target_doctype" id="op-target-dt" value="' + esc(a.target_doctype || "") + '" placeholder="Ej. Sales Invoice">') + '</div>' +
      ui.fieldRow("Rol requerido (opcional)", '<input class="os-input" f="required_role" id="op-required-role" value="' + esc(a.required_role || "") + '">') +
      '<div class="os-row">' + ui.fieldRow("Regla de finalización", '<select class="os-select" f="completion_rule">' + ["Manual","Document Linked","Document Exists","Document Submitted"].map(function (v) { return '<option' + (a.completion_rule === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select>') +
      ui.fieldRow("Obligatoria", '<label class="os-check"><input type="checkbox" f="is_required" ' + (a.is_required ? "checked" : "") + '> Sí</label>') +
      ui.fieldRow("Enviar tras crear", '<label class="os-check"><input type="checkbox" f="submit_after_create" ' + (a.submit_after_create ? "checked" : "") + '> Submit</label>') + '</div>' +
      '</div></details>' +
      '<details class="os-op-details"><summary>Configuración avanzada</summary><div class="os-op-details-body">' +
      ui.fieldRow("Field Mapping JSON", '<textarea class="os-textarea" f="field_mapping_json" placeholder="{&quot;customer&quot;:&quot;customer&quot;}">' + esc(a.field_mapping_json || "") + '</textarea>', "source_field → target_field. Para flujos estándar ERPNext se usan sus mappers nativos.") +
      ui.fieldRow("Defaults JSON", '<textarea class="os-textarea" f="defaults_json" placeholder="{&quot;set_posting_time&quot;:1}">' + esc(a.defaults_json || "") + '</textarea>') +
      ui.fieldRow("Nota", '<textarea class="os-textarea" f="description">' + esc(a.description || "") + '</textarea>') +
      '</div></details>';
    ui.attachLinkSearch(body.querySelector("#op-source-dt"), "DocType");
    ui.attachLinkSearch(body.querySelector("#op-target-dt"), "DocType");
    ui.attachLinkSearch(body.querySelector("#op-required-role"), "Role");

    var actions = [];
    if (existing) actions.push({ label: "Eliminar", cls: "danger", onClick: function () {
      ui.confirm("¿Eliminar esta acción del proceso?", { danger: true }).then(function (ok) {
        if (!ok) return;
        proc.actions.splice(index, 1);
        saveActions(proc, done);
      });
    }});
    actions.push({ label: "Cancelar", cls: "ghost", onClick: function () { return true; } });
    actions.push({ label: "Guardar", cls: "primary", onClick: function () {
      body.querySelectorAll("[f]").forEach(function (el) {
        var key = el.getAttribute("f");
        a[key] = el.type === "checkbox" ? (el.checked ? 1 : 0) : (el.type === "number" ? Number(el.value || 0) : el.value.trim());
      });
      if (!a.step_key || !a.action_label || !a.action_type || !a.target_doctype) { ui.toast("Paso, nombre, acción y DocType destino son obligatorios.", "warn"); return false; }
      if (a.action_type === "CREATE_FROM_SOURCE" && !a.source_doctype) { ui.toast("Crear desde origen requiere Source DocType.", "warn"); return false; }
      try { if (a.field_mapping_json) JSON.parse(a.field_mapping_json); if (a.defaults_json) JSON.parse(a.defaults_json); }
      catch (e) { ui.toast("Mapping/Defaults deben ser JSON válido.", "warn"); return false; }
      if (existing) proc.actions[index] = a; else proc.actions.push(a);
      saveActions(proc, done);
    }});
    ui.modal({ title: existing ? "Editar acción ERPNext" : "Nueva acción ERPNext", body: body, actions: actions });
  }

  function saveActions(proc, done) {
    api.update("OS Process", proc.name, { actions: proc.actions }).then(function (updated) {
      proc.actions = updated.actions || proc.actions; ui.toast("Acciones ERPNext guardadas", "ok"); done && done();
    }).catch(ui.error);
  }

  /* ============================= Mi Trabajo ============================= */
  function enhanceWorkCards() {
    var parts = routeParts();
    if (parts[0] !== "work") return;
    var cards = Array.prototype.slice.call(document.querySelectorAll("#os-work-list [data-n]"));
    var pending = cards.filter(function (c) { return !c.dataset.opChecked; });
    if (!pending.length) return;
    pending.forEach(function (c) { c.dataset.opChecked = "1"; });
    var names = pending.map(function (c) { return c.dataset.n; }).filter(Boolean);
    if (!names.length) return;
    api.list("OS Step Run", {
      fields: ["name","action_snapshot_json","action_status","reference_doctype","reference_name","status"],
      filters: [["name","in",names]], limit: names.length
    }).then(function (rows) {
      var map = {}; rows.forEach(function (r) { map[r.name] = r; });
      pending.forEach(function (card) {
        var r = map[card.dataset.n]; if (!r) return;
        var acts = parseJsonArray(r.action_snapshot_json);
        if (acts.length && !card.querySelector("[data-os-actions]")) {
          var b = document.createElement("button"); b.type = "button"; b.className = "os-btn sm"; b.dataset.osActions = "1";
          b.innerHTML = "ERPNext <span class=\"os-op-count\">" + acts.length + "</span>";
          b.onclick = function (e) { e.stopPropagation(); openStepActions(r.name); };
          card.appendChild(b);
        }
        if (r.reference_doctype && r.reference_name && !card.querySelector(".os-op-ref")) {
          var a = document.createElement("a"); a.className = "os-tag os-op-ref"; a.href = deskRoute(r.reference_doctype, r.reference_name); a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = r.reference_doctype + " · " + r.reference_name; card.appendChild(a);
        }
      });
    }).catch(function () {});
  }

  function openStepActions(stepRunName) {
    bridge().then(function () {
      api.call("livingorg_bridge.api.get_step_actions", { step_run_name: stepRunName }, "GET").then(function (data) {
        var body = document.createElement("div");
        function paint() {
          body.innerHTML =
            (data.source_doctype && data.source_name ? '<div class="os-op-source"><span>Origen</span><b>' + esc(data.source_doctype) + ' · ' + esc(data.source_name) + '</b></div>' : '') +
            '<div class="os-section-title">Acciones</div>' +
            ((data.actions || []).length ? data.actions.map(function (a) {
              var links = (data.links || []).filter(function (l) { return l.action_key === a.action_key && l.link_role === "Result"; });
              return '<div class="os-op-exec-card"><div class="os-op-exec-head"><div><b>' + esc(a.action_label) + '</b><small>' + esc(actionLabel(a.action_type)) + ' · ' + esc(a.target_doctype || "") + '</small></div>' +
                '<button class="os-btn sm primary" data-exec="' + esc(a.action_key) + '">' + (links.length ? "Ejecutar otra" : "Ejecutar") + '</button></div>' +
                (links.length ? '<div class="os-op-links">' + links.map(function (l) { return '<a href="' + esc(l.route || deskRoute(l.reference_doctype,l.reference_name)) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(l.reference_doctype) + ' · ' + esc(l.reference_name) + '</a>'; }).join("") + '</div>' : '') +
                '</div>';
            }).join("") : ui.empty("⚙", "Sin acciones", "Este paso no tiene acciones ERPNext configuradas."));
          body.querySelectorAll("[data-exec]").forEach(function (b) {
            b.onclick = function () { var action = data.actions.find(function (a) { return a.action_key === b.dataset.exec; }); executeAction(stepRunName, action, data, function () {
              api.call("livingorg_bridge.api.get_step_actions", { step_run_name: stepRunName }, "GET").then(function (fresh) { data = fresh; paint(); });
            }); };
          });
        }
        paint();
        ui.modal({ title: "Acciones ERPNext", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
      }).catch(ui.error);
    }).catch(bridgeError);
  }

  function executeAction(stepRunName, action, context, done) {
    var body = document.createElement("div");
    var needsSource = action.action_type === "CREATE_FROM_SOURCE";
    var needsTarget = ["OPEN_DOCUMENT","UPDATE_DOCUMENT","SUBMIT_DOCUMENT","LINK_DOCUMENT"].indexOf(action.action_type) >= 0;
    var acceptsValues = ["CREATE_DOCUMENT","CREATE_FROM_SOURCE","UPDATE_DOCUMENT"].indexOf(action.action_type) >= 0;
    body.innerHTML =
      '<div class="os-op-callout"><b>' + esc(action.action_label) + '</b><div>' + esc(actionLabel(action.action_type)) + ' · ' + esc(action.target_doctype || "") + '</div></div>' +
      (needsSource ? ui.fieldRow("Documento origen", '<input class="os-input" id="op-exec-source" value="' + esc(context.source_name || "") + '" placeholder="Nombre de ' + esc(action.source_doctype || "documento") + '">') : '') +
      (needsTarget ? ui.fieldRow("Documento destino", '<input class="os-input" id="op-exec-target" placeholder="Nombre de ' + esc(action.target_doctype || "documento") + '">') : '') +
      (acceptsValues ? ui.fieldRow("Valores adicionales JSON (opcional)", '<textarea class="os-textarea" id="op-exec-values" placeholder="{}"></textarea>', "Sólo campos editables del DocType destino.") : '');
    ui.modal({
      title: "Ejecutar · " + action.action_label, body: body,
      actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } }, { label: "Ejecutar", cls: "primary", onClick: function () {
        var values = body.querySelector("#op-exec-values") ? body.querySelector("#op-exec-values").value.trim() : "";
        if (values) { try { JSON.parse(values); } catch (e) { ui.toast("Valores adicionales debe ser JSON válido.", "warn"); return false; } }
        api.call("livingorg_bridge.api.execute_action", {
          step_run_name: stepRunName, action_key: action.action_key,
          source_doctype: action.source_doctype || context.source_doctype || null,
          source_name: body.querySelector("#op-exec-source") ? body.querySelector("#op-exec-source").value.trim() : (context.source_name || null),
          target_name: body.querySelector("#op-exec-target") ? body.querySelector("#op-exec-target").value.trim() : null,
          values_json: values || null
        }).then(function (r) {
          ui.toast(action.action_label + " → " + r.name, "ok", 4500);
          if (r.route) global.open(r.route, "_blank", "noopener,noreferrer");
          done && done(); reloadWork();
        }).catch(ui.error);
      }}]
    });
  }

  function openComplete(stepRunName) {
    Promise.all([api.get("OS Step Run", stepRunName), bridge()]).then(function (r) {
      var step = r[0];
      var body = document.createElement("div");
      body.innerHTML =
        (step.instructions_snapshot ? '<div class="os-card os-op-instructions"><b>Instrucciones</b><div>' + esc(step.instructions_snapshot) + '</div></div>' : '') +
        ui.fieldRow("Resultado / comentario", '<textarea class="os-textarea" id="op-complete-comment" placeholder="Qué se hizo, decisión tomada, siguiente acción…"></textarea>') +
        ui.fieldRow("Salida condicional (opcional)", '<select class="os-select" id="op-complete-outcome"><option value="">NEXT normal</option><option>TRUE</option><option>FALSE</option><option>ERROR</option><option>TIMEOUT</option></select>', "Úsalo sólo si el proceso tiene ramas condicionales.") +
        (step.evidence_required ? ui.fieldRow("Evidencia requerida", '<input type="file" id="op-complete-file" class="os-input">', "Se guarda como OS Evidence antes de intentar completar.") : '');
      ui.modal({
        title: "Completar · " + (step.step_title_snapshot || step.step_key), body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } }, { label: step.approval_required ? "Continuar / solicitar aprobación" : "Completar", cls: "primary", onClick: function () {
          var comment = body.querySelector("#op-complete-comment").value.trim();
          var outcome = body.querySelector("#op-complete-outcome").value || null;
          var file = body.querySelector("#op-complete-file") && body.querySelector("#op-complete-file").files[0];
          var before = Promise.resolve();
          if (file) {
            before = api.uploadFile(file, { doctype: "OS Step Run", docname: step.name }).then(function (f) {
              return api.create("OS Evidence", { run: step.run, step_run: step.name, evidence_type: "File", file: f.file_url, summary: comment, verification_status: "Pending" });
            });
          }
          before.then(function () {
            return api.call("livingorg_bridge.api.complete_step", { step_run_name: step.name, comment: comment, outcome: outcome });
          }).then(function (result) {
            if (result.approval_pending) ui.toast("Trabajo registrado. Se envió a aprobación.", "ok");
            else ui.toast("Paso completado", "ok");
            reloadWork();
          }).catch(ui.error);
        }}]
      });
    }).catch(bridgeError);
  }

  /* Captura antes de los onclick legacy para usar endpoints server-side. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-a]");
    if (!b) return;
    if (b.closest("#os-work-list") && (b.dataset.a === "start" || b.dataset.a === "complete")) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      var card = b.closest("[data-n]"); if (!card) return;
      if (b.dataset.a === "start") {
        bridge().then(function () { return api.call("livingorg_bridge.api.start_step", { step_run_name: card.dataset.n }); })
          .then(function () { ui.toast("Tarea iniciada", "ok"); reloadWork(); }).catch(bridgeError);
      } else openComplete(card.dataset.n);
      return;
    }
    if (b.closest("#os-appr-list") && (b.dataset.a === "approve" || b.dataset.a === "reject")) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      var approval = b.closest("[data-n]"); if (!approval) return;
      openDecision(approval, b.dataset.a === "approve");
    }
  }, true);

  function openDecision(card, approve) {
    bridge().then(function () {
      var body = document.createElement("div");
      body.innerHTML = ui.fieldRow("Comentario", '<textarea class="os-textarea" id="op-decision-comment" placeholder="Motivo de la decisión…"></textarea>');
      ui.modal({
        title: approve ? "Aprobar" : "Rechazar", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } }, { label: approve ? "Aprobar" : "Rechazar", cls: approve ? "primary" : "danger", onClick: function () {
          api.call("livingorg_bridge.approvals.decide", { approval_name: card.dataset.n, decision: approve ? "Approved" : "Rejected", comment: body.querySelector("#op-decision-comment").value.trim() })
            .then(function () { ui.toast("Decisión registrada", "ok"); card.remove(); }).catch(ui.error);
        }}]
      });
    }).catch(bridgeError);
  }

  /* ============================= Run documents ============================= */
  function enhanceRun() {
    var parts = routeParts();
    if (parts[0] !== "runs" || !parts[1] || document.querySelector("#os-run-docs")) return;
    var head = document.querySelector("#r-head .os-page-actions");
    if (!head) return;
    var b = document.createElement("button"); b.type = "button"; b.id = "os-run-docs"; b.className = "os-btn"; b.textContent = "ERPNext · documentos";
    b.onclick = function () { openRunDocuments(parts[1]); }; head.appendChild(b);
  }
  function openRunDocuments(runName) {
    api.list("OS Document Link", { fields: ["name","step_key","action_key","link_role","reference_doctype","reference_name","label","document_status_snapshot"], filters: [["run","=",runName]], orderBy: "creation asc", limit: 200 })
      .then(function (rows) {
        var body = document.createElement("div");
        body.innerHTML = rows.length ? rows.map(function (l) {
          return '<a class="os-op-doc-row" href="' + esc(deskRoute(l.reference_doctype,l.reference_name)) + '" target="_blank" rel="noopener noreferrer"><span><b>' + esc(l.label || l.reference_doctype) + '</b><small>' + esc(l.step_key || "") + ' · ' + esc(l.link_role || "") + '</small></span><span>' + esc(l.reference_doctype) + '<br><b>' + esc(l.reference_name) + '</b></span></a>';
        }).join("") : ui.empty("↗", "Sin documentos vinculados", "Las acciones ERPNext ejecutadas aparecerán aquí.");
        ui.modal({ title: "Documentos ERPNext del Run", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
      }).catch(ui.error);
  }

  function enhance() {
    enhanceProcessStudio(); enhanceWorkCards(); enhanceRun();
  }
  var observer = new MutationObserver(function () { setTimeout(enhance, 0); });
  function start() {
    var root = document.getElementById("os-app-root") || document.body;
    observer.observe(root, { childList: true, subtree: true });
    global.addEventListener("hashchange", function () { setTimeout(enhance, 80); });
    enhance();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(window);
