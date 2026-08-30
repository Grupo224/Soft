/*! Páginas: Biblioteca de Procesos (/processes) y Process Studio (/processes/:name). */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  var STEP_ICON = { START: "▶", HUMAN: "🧑", HYBRID: "🤝", AI: "✳", SYSTEM: "⚙", GATEWAY: "◆", APPROVAL: "✅", WAIT: "⏱", END: "⏹" };
  var STEP_TYPES = Object.keys(STEP_ICON);
  var EXEC_TYPES = ["H", "H+AI", "AI→H", "AI", "SYS"];
  var STATUS_FLOW = ["Draft", "Pilot", "Active", "Degraded", "Retired"];

  function fieldRow(l, html, hint) { return '<div class="os-field"><label>' + l + (hint ? ' <span class="hint">' + hint + "</span>" : "") + '</label>' + html + '</div>'; }
  function opt(list, sel) { return list.map(function (v) { return '<option' + (v === sel ? " selected" : "") + '>' + v + '</option>'; }).join(""); }

  /* ============================= /processes — Biblioteca ============================= */
  function mountList(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Biblioteca de Procesos</div>' +
      '<div class="os-page-sub">Owner, estado, riesgo, versión y última ejecución.</div></div>' +
      '<div class="os-page-actions"><button class="os-btn primary" id="os-new-process">＋ Nuevo proceso</button></div></div>' +
      '<div class="os-toolbar"><input class="os-input" id="os-proc-search" placeholder="Buscar por título o código…" style="max-width:260px">' +
      '<select class="os-select" id="os-proc-status" style="max-width:170px"><option value="">Todos los estados</option>' + opt(STATUS_FLOW) + '</select></div>' +
      '<div class="os-table-wrap"><div class="os-card" id="os-proc-table">' + ui.skeleton(6) + '</div></div>';

    var all = [];
    function render() {
      var q = container.querySelector("#os-proc-search").value.toLowerCase();
      var st = container.querySelector("#os-proc-status").value;
      var rows = all.filter(function (p) {
        return (!st || p.status === st) && (!q || (p.process_title || "").toLowerCase().indexOf(q) !== -1 || (p.process_code || "").toLowerCase().indexOf(q) !== -1);
      });
      var host = container.querySelector("#os-proc-table");
      if (!rows.length) { host.innerHTML = ui.empty("🔀", "Sin procesos", "Crea el primero con “Nuevo proceso”."); return; }
      host.innerHTML = '<table class="os-table"><thead><tr><th>Proceso</th><th>Responsable</th><th>Estado</th><th>Riesgo</th><th>Autonomía</th><th>Versión</th><th>Modificado</th></tr></thead><tbody>' +
        rows.map(function (p) {
          return "<tr data-n='" + p.name + "'><td><b>" + U.escapeHtml(p.process_title) + "</b><div class='muted' style='font-size:11.5px'>" + U.escapeHtml(p.process_code || "") + "</div></td>" +
            "<td>" + U.escapeHtml(p.owner_user || "—") + "</td><td>" + ui.badgeStatus(p.status) + "</td><td>" + ui.badgeRisk(p.risk_level) + "</td>" +
            "<td><span class='os-tag'>" + U.escapeHtml(p.max_autonomy || "—") + "</span></td><td>" + U.escapeHtml(p.version_label || "—") + "</td>" +
            "<td class='muted'>" + U.timeAgo(p.modified) + "</td></tr>";
        }).join("") + "</tbody></table>";
      host.querySelectorAll("tr[data-n]").forEach(function (tr) { ui.clickableRow(tr, function () { OS.router.navigate("/processes/" + tr.dataset.n); }); });
    }

    api.list("OS Process", { fields: ["name", "process_title", "process_code", "owner_user", "status", "risk_level", "max_autonomy", "version_label", "modified"], orderBy: "modified desc", limit: 200 })
      .then(function (rows) { all = rows; render(); }).catch(ui.error);

    container.querySelector("#os-proc-search").oninput = render;
    container.querySelector("#os-proc-status").onchange = render;
    container.querySelector("#os-new-process").onclick = function () { openProcessWizard("create"); };
  }

  /* ===================== Asistente de proceso (SIPOC + RACI + metas) =====================
   * Captura 100% por formulario: crear o editar los DATOS del proceso siempre pasa por este
   * asistente por pasos, nunca por un desplegable suelto. Los PASOS y CONEXIONES del proceso
   * (el grafo BPMN) siguen viviendo en el lienzo de Process Studio — un formulario lineal no
   * puede representar bifurcaciones, y el lienzo ya cumple mejor ese rol (arrastrar, conectar,
   * deshacer/rehacer). El asistente solo resume los pasos y enlaza al lienzo para editarlos.
   * Documento de referencia: "Rediseño del Módulo de Procesos LIVINGORG OS". */
  var PROC_SECTIONS = [
    { title: "Identidad y propósito", fields: [
      { name: "process_title", label: "Nombre del proceso", type: "text", required: true, hint: "Ej. Lead → Cotización" },
      { name: "process_code", label: "Código / ID", type: "text", hint: "Se genera solo si lo dejas vacío." },
      { name: "company", label: "Empresa", type: "link", linkDoctype: "Company", required: true },
      { name: "org_area", label: "Área (Organigrama Vivo)", type: "link", linkDoctype: "OS Org Node" },
      { name: "department", label: "Departamento (ERPNext)", type: "link", linkDoctype: "Department" },
      { name: "owner_user", label: "Dueño / responsable (Aprobador)", type: "link", linkDoctype: "User", required: true },
      { name: "priority", label: "Criticidad", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { name: "purpose", label: "Propósito", type: "textarea", required: true, hint: "Por qué existe y qué valor entrega." },
      { name: "outcome", label: "Resultado esperado", type: "textarea" }
    ] },
    { title: "Alcance y disparador (SIPOC)", fields: [
      { name: "trigger_type", label: "Tipo de disparador", type: "select", options: ["Manual", "ERP Event", "Webhook", "Schedule", "External"], required: true },
      { name: "trigger_reference", label: "Disparador (detalle)", type: "text" },
      { name: "suppliers", label: "Proveedores", type: "text", hint: "Separados por coma." },
      { name: "inputs", label: "Entradas / insumos", type: "text", required: true, hint: "Separadas por coma." },
      { name: "outputs", label: "Salidas / entregables", type: "text", required: true, hint: "Separadas por coma." },
      { name: "clients", label: "Cliente del proceso", type: "text" },
      { name: "scope", label: "Incluye / no incluye", type: "textarea" },
      { name: "frequency", label: "Frecuencia de ejecución", type: "select", options: ["On Demand", "Daily", "Weekly", "Biweekly", "Monthly"] }
    ] },
    { title: "Pasos y ejecución", stepsSummary: true, fields: [
      { name: "max_autonomy", label: "Autonomía máxima de la IA", type: "select", options: ["L0", "L1", "L2", "L3", "L4"], required: true },
      { name: "rules", label: "Reglas de decisión", type: "textarea", hint: "Bifurcaciones: si pasa X, entonces Y." },
      { name: "exceptions", label: "Excepciones y manejo", type: "textarea" }
    ] },
    { title: "Roles y gobierno (RACI)", fields: [
      { name: "raci_responsible", label: "Responsable (R)", type: "link", linkDoctype: "User" },
      { name: "raci_consulted", label: "Consultado (C)", type: "text", hint: "Separados por coma." },
      { name: "raci_informed", label: "Informado (I)", type: "text", hint: "Separados por coma." },
      { name: "responsible_node", label: "Responsable vinculado (organigrama)", type: "link", linkDoctype: "OS Org Node" },
      { name: "risk_level", label: "Riesgo", type: "select", options: ["Low", "Medium", "High", "Critical"], required: true },
      { name: "gates", label: "Puntos de aprobación (gates)", type: "textarea" },
      { name: "policy", label: "Política aplicable", type: "link", linkDoctype: "OS Policy" },
      { name: "controls", label: "Controles", type: "textarea", hint: "Obligatorio en la práctica si el riesgo es alto." },
      { name: "sop", label: "SOP vinculado", type: "link", linkDoctype: "OS SOP" }
    ] },
    { title: "Metas y medición", goals: true, docs: true, fields: [
      { name: "kpis", label: "KPIs del proceso", type: "text", required: true, hint: "Separados por coma." },
      { name: "sla_minutes", label: "SLA objetivo (min)", type: "number" },
      { name: "definition_of_done", label: "Definición de Hecho (DoD)", type: "textarea", required: true },
      { name: "evidence_required", label: "Evidencia requerida", type: "textarea" }
    ] },
    { title: "Mejora continua", fields: [
      { name: "version_label", label: "Versión", type: "text" },
      { name: "next_review_on", label: "Próxima revisión", type: "date" },
      { name: "changelog", label: "Historial de cambios", type: "textarea" },
      { name: "kaizen", label: "Oportunidades de mejora", type: "textarea" }
    ] }
  ];
  var QUICK_FIELD_NAMES = ["process_title", "purpose", "owner_user", "company", "trigger_reference", "risk_level", "max_autonomy", "kpis"];

  function slugify(s) { return (s || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "PROC"; }

  /** Editor de metas por cadencia — fila = {cadence, metric, target, unit, tolerance, responsible, direction}. */
  function goalsEditor(container, initial) {
    var arr = (initial || []).map(function (g) { return Object.assign({}, g); });
    var CADS = ["Daily", "Weekly", "Biweekly", "Monthly"];
    var CAD_LABEL = { Daily: "Diaria", Weekly: "Semanal", Biweekly: "Quincenal", Monthly: "Mensual" };
    function paint() {
      container.innerHTML = (arr.length ? "" : '<div class="muted" style="font-size:12px;padding:4px 0 8px">Sin metas capturadas. Empieza por la meta mensual.</div>') +
        arr.map(function (g, i) {
          return '<div class="os-row" data-gi="' + i + '" style="align-items:flex-end;gap:6px;margin-bottom:8px">' +
            '<select class="os-select gf" data-gf="cadence" style="max-width:110px">' + CADS.map(function (c) { return '<option value="' + c + '"' + (g.cadence === c ? " selected" : "") + '>' + CAD_LABEL[c] + '</option>'; }).join("") + '</select>' +
            '<input class="os-input gf" data-gf="metric" placeholder="Métrica / KPI" value="' + U.escapeHtml(g.metric || "") + '" style="min-width:130px">' +
            '<input class="os-input gf" type="number" data-gf="target" placeholder="Objetivo" value="' + (g.target != null ? g.target : "") + '" style="max-width:90px">' +
            '<input class="os-input gf" data-gf="unit" placeholder="Unidad" value="' + U.escapeHtml(g.unit || "") + '" style="max-width:80px">' +
            '<input class="os-input gf" data-gf="tolerance" placeholder="Tolerancia" value="' + U.escapeHtml(g.tolerance || "") + '" style="max-width:90px">' +
            '<input class="os-input gf" data-gf="responsible" placeholder="Responsable" value="' + U.escapeHtml(g.responsible || "") + '" style="min-width:110px">' +
            '<button type="button" class="os-btn danger sm" data-gdel="' + i + '">✕</button></div>';
        }).join("") +
        '<button type="button" class="os-btn sm" id="goal-add">＋ Agregar meta</button>' +
        '<button type="button" class="os-btn sm ghost" id="goal-cascade" title="Propone diaria/semanal/quincenal desde la mensual (~22 días hábiles, ~4.33 semanas, 2 quincenas)">✨ Sugerir cascada</button>';
      container.querySelectorAll(".gf").forEach(function (elx) {
        elx.addEventListener("input", function () {
          var i = +elx.closest("[data-gi]").dataset.gi;
          arr[i][elx.dataset.gf] = elx.dataset.gf === "target" ? (elx.value === "" ? null : Number(elx.value)) : elx.value;
        });
      });
      container.querySelectorAll("[data-gdel]").forEach(function (b) { b.onclick = function () { arr.splice(+b.dataset.gdel, 1); paint(); }; });
      container.querySelector("#goal-add").onclick = function () { arr.push({ cadence: "Monthly", direction: "More is better" }); paint(); };
      container.querySelector("#goal-cascade").onclick = function () {
        var base = arr.filter(function (g) { return g.cadence === "Monthly" && g.target != null; })[0];
        if (!base) { ui.toast("Captura primero una meta mensual con objetivo numérico.", "warn"); return; }
        var factor = { Daily: 22, Weekly: 4.33, Biweekly: 2 };
        ["Daily", "Weekly", "Biweekly"].forEach(function (c) {
          var val = Math.round((base.target / factor[c]) * 10) / 10;
          var row = arr.filter(function (g) { return g.cadence === c && g.metric === base.metric; })[0];
          if (!row) { row = { cadence: c, metric: base.metric, unit: base.unit, responsible: base.responsible, direction: base.direction, tolerance: base.tolerance }; arr.unshift(row); }
          row.target = val;
        });
        paint(); ui.toast("Cascada propuesta. Ajusta lo que necesites.", "ok");
      };
    }
    paint();
    return { get: function () { return arr.filter(function (g) { return g.metric && g.target != null; }); } };
  }

  /** Antes de publicar (checklist de calidad, sección 7.1 del documento de rediseño). */
  function checklistIssues(proc) {
    var issues = [];
    if (!proc.outcome) issues.push("Falta el resultado esperado.");
    if (!(proc.inputs || "").trim()) issues.push("Falta al menos una entrada (SIPOC).");
    if (!(proc.outputs || "").trim()) issues.push("Falta al menos una salida (SIPOC).");
    if (!(proc.kpis || "").trim()) issues.push("Falta al menos 1 KPI.");
    var goals = proc.goals || [];
    var monthly = goals.filter(function (g) { return g.cadence === "Monthly" && g.target != null; })[0];
    if (!monthly) issues.push("Falta la meta mensual (con objetivo numérico).");
    else if (!monthly.tolerance) issues.push("La meta mensual necesita una tolerancia.");
    if (!proc.definition_of_done) issues.push("Falta la Definición de Hecho (DoD).");
    if (proc.risk_level === "High" || proc.risk_level === "Critical") {
      if (!proc.controls) issues.push("Riesgo " + U.trValue(proc.risk_level).toLowerCase() + ": define controles.");
      if (!proc.gates) issues.push("Riesgo " + U.trValue(proc.risk_level).toLowerCase() + ": define al menos un punto de aprobación (gate).");
    }
    return issues;
  }

  function openProcessWizard(mode, existingProc, onSaved) {
    var editing = mode === "edit";
    var rec = editing ? Object.assign({}, existingProc) : { status: "Draft", version_label: "v0.1", steps: [], edges: [], goals: [] };
    var goalsCtl = null, docsUrl = rec.docs || null;
    var stepIdx = 0, maxReached = 0, curModal = null;

    function saveRec(patch) {
      Object.assign(rec, patch);
      if (editing) return api.update("OS Process", rec.name, patch).then(function (d) { Object.assign(rec, d); });
      if (!rec.process_code) rec.process_code = slugify(rec.process_title) + "-" + U.uid("").slice(-4).toUpperCase();
      if (!rec.trigger_type) rec.trigger_type = "Manual";
      rec.status = "Draft";
      return api.create("OS Process", rec).then(function (d) { Object.assign(rec, d); editing = true; });
    }

    function render() { if (mode === "create" && !rec._modeChosen) renderModeChoice(); else renderStep(); }

    function renderModeChoice() {
      var body = document.createElement("div");
      body.innerHTML = '<p style="color:var(--os-ink-mut);font-size:13px;margin:0 0 14px">Puedes empezar rápido y enriquecer después — nunca se pierde lo ya capturado.</p>' +
        '<div class="os-mode-choice">' +
        '<div class="os-mode-card" id="mc-quick" tabindex="0" role="button"><span>Modo Rápido</span><b>7 campos · &lt;2 min</b><p>Proceso mínimo viable: nombre, propósito, empresa, dueño, disparador, riesgo, autonomía y KPI.</p></div>' +
        '<div class="os-mode-card" id="mc-full" tabindex="0" role="button"><span>Modo Completo</span><b>6 pasos · 8–12 min</b><p>SIPOC, RACI, controles, metas por cadencia y mejora continua — el esquema completo.</p></div>' +
        '</div>';
      curModal = ui.modal({
        title: "Nuevo proceso", body: body, wide: true,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } }]
      });
      function choose(full) { rec._modeChosen = full ? "full" : "quick"; curModal.close(); render(); }
      body.querySelector("#mc-quick").onclick = function () { choose(false); };
      body.querySelector("#mc-full").onclick = function () { choose(true); };
      ["mc-quick", "mc-full"].forEach(function (id) {
        body.querySelector("#" + id).onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(id === "mc-full"); } };
      });
    }

    function renderStep() {
      if (rec._modeChosen === "quick") return renderQuick();
      if (stepIdx > maxReached) maxReached = stepIdx;
      var sec = PROC_SECTIONS[stepIdx];
      var body = document.createElement("div");
      var stepsNav = '<div class="os-wizard-steps">' + PROC_SECTIONS.map(function (s, i) {
        return '<button type="button" class="os-wizard-step' + (i === stepIdx ? " on" : "") + (i < stepIdx ? " done" : "") + '" data-goto="' + i + '"' + (i > maxReached ? " disabled" : "") + '>' +
          '<span class="os-wizard-num">' + (i < stepIdx ? "✓" : (i + 1)) + '</span>' + s.title + '</button>';
      }).join("") + '</div>';
      body.innerHTML = stepsNav + '<div class="os-form-body" style="padding-top:14px">' +
        sec.fields.map(function (f) { return ui.renderFieldHtml(f, rec[f.name]); }).join("") +
        (sec.stepsSummary ? stepsSummaryHtml() : "") +
        (sec.goals ? '<div class="os-section-title">Metas por cadencia</div><div id="goals-host"></div>' : "") +
        (sec.docs ? '<div class="os-section-title">Documentos de respaldo</div><div id="docs-host"></div>' : "") +
        '</div>';
      ui.wireFields(body);
      if (sec.goals) { goalsCtl = goalsEditor(body.querySelector("#goals-host"), rec.goals); }
      if (sec.docs) { ui.fileField(body.querySelector("#docs-host"), { value: docsUrl, onChange: function (u) { docsUrl = u; } }); }

      body.querySelectorAll("[data-goto]").forEach(function (b) {
        b.onclick = function () { if (b.disabled) return; collect(sec); stepIdx = +b.dataset.goto; curModal.close(); renderStep(); };
      });
      var isLast = stepIdx === PROC_SECTIONS.length - 1;
      var actions = [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Guardar borrador y salir", cls: "ghost", onClick: function () { collect(sec); return finishDraft(); }, keepOpen: false }
      ];
      if (stepIdx > 0) actions.push({ label: "Atrás", cls: "", onClick: function () { collect(sec); stepIdx--; curModal.close(); renderStep(); return false; } });
      actions.push({
        label: isLast ? "Guardar proceso" : "Siguiente", cls: "primary", onClick: function () {
          collect(sec);
          var missing = sec.fields.filter(function (f) { return f.required && !(rec[f.name] + "").trim(); });
          if (missing.length) { ui.toast("Falta capturar: " + missing.map(function (f) { return f.label; }).join(", "), "warn"); return false; }
          if (!isLast) { stepIdx++; curModal.close(); renderStep(); return false; }
          return finish();
        }
      });
      curModal = ui.modal({ title: (editing ? "Editar proceso" : "Nuevo proceso") + " · paso " + (stepIdx + 1) + " de " + PROC_SECTIONS.length, body: body, wide: true, actions: actions, dismissible: false });
    }

    function stepsSummaryHtml() {
      var n = (rec.steps || []).length;
      return '<div class="os-section-title">Resumen de pasos</div>' +
        (editing
          ? (n ? '<p style="font-size:13px;color:var(--os-ink-mut)">' + n + ' paso(s) definidos en el lienzo: ' + (rec.steps || []).map(function (s) { return U.escapeHtml(s.step_title || s.step_key); }).join(", ") + '.</p>'
            : '<p style="font-size:13px;color:var(--os-ink-mut)">Sin pasos todavía.</p>') +
          '<button type="button" class="os-btn sm ghost" id="goto-canvas">↗ Ir al lienzo (Process Studio)</button>'
          : '<p style="font-size:13px;color:var(--os-ink-mut)">Los pasos y sus conexiones se dibujan en el lienzo de Process Studio (arrastrar, conectar, deshacer) — podrás agregarlos justo después de guardar este proceso.</p>');
    }

    function collect(sec) {
      var body = curModal.el.querySelector(".os-form-body");
      Object.assign(rec, ui.collectFields(body));
      if (goalsCtl) rec.goals = goalsCtl.get();
      if (sec.docs) rec.docs = docsUrl;
    }

    function renderQuick() {
      var body = document.createElement("div");
      var fields = QUICK_FIELD_NAMES.map(function (n) { for (var i = 0; i < PROC_SECTIONS.length; i++) { var f = PROC_SECTIONS[i].fields.filter(function (x) { return x.name === n; })[0]; if (f) return f; } }).filter(Boolean);
      body.className = "os-form-body";
      body.innerHTML = '<p style="color:var(--os-ink-mut);font-size:12.5px;margin:0 0 10px">Con esto ya es un proceso utilizable. Podrás enriquecerlo después con SIPOC, RACI y más metas.</p>' +
        fields.map(function (f) { return ui.renderFieldHtml(f, rec[f.name]); }).join("");
      ui.wireFields(body);
      curModal = ui.modal({
        title: "Modo Rápido — Nuevo proceso", body: body, wide: true,
        actions: [
          { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
          {
            label: "Prefiero el modo completo", cls: "ghost", onClick: function () {
              Object.assign(rec, ui.collectFields(body)); rec._modeChosen = "full"; stepIdx = 0;
              curModal.close(); renderStep(); return false;
            }
          },
          {
            label: "Guardar", cls: "primary", onClick: function () {
              Object.assign(rec, ui.collectFields(body));
              var missing = fields.filter(function (f) { return f.required && !(rec[f.name] + "").trim(); });
              if (missing.length) { ui.toast("Falta capturar: " + missing.map(function (f) { return f.label; }).join(", "), "warn"); return false; }
              return finish();
            }
          }
        ]
      });
    }

    function afterSave() { if (onSaved) onSaved(rec); else OS.router.navigate("/processes/" + rec.name); }
    function finishDraft() {
      return saveRec({}).then(function () {
        ui.toast("Guardado como borrador ✓", "ok");
        afterSave();
        return true;
      }).catch(function (e) { ui.error(e); return false; });
    }
    function finish() {
      saveRec({}).then(function () {
        ui.toast(editing ? "Cambios guardados ✓" : "Proceso creado en Draft ✓", "ok");
        afterSave();
      }).catch(ui.error);
      return true;
    }

    render();
  }

  /* ============================= /processes/:name — Process Studio ============================= */
  function mountStudio(container, params) {
    container.innerHTML = '<div id="os-studio-head"></div><div class="os-canvas-wrap" style="margin-top:14px"><div id="os-studio-canvas" style="position:absolute;inset:0"></div></div>';
    var name = params.name;
    var proc, engine, connectMode = false, connectFrom = null;

    function saveIndicatorEl() { return container.querySelector("#os-save-state"); }
    function persist(patch) {
      ui.saveState(saveIndicatorEl(), "saving");
      return api.update("OS Process", proc.name, patch).then(function (doc) {
        Object.assign(proc, doc); ui.saveState(saveIndicatorEl(), "saved");
      }).catch(function (e) { ui.saveState(saveIndicatorEl(), "error"); ui.error(e); throw e; });
    }
    var persistDebounced = U.debounce(function () { persist({ steps: proc.steps, edges: proc.edges }); }, 700);

    function guardActiveEdit() {
      if (proc.status !== "Active") return Promise.resolve(true);
      return ui.confirm("Este proceso está Active. Para hacer un cambio estructural debe volver a Draft (regla de no-regresión). ¿Volver a Draft ahora?", { okLabel: "Volver a Draft" })
        .then(function (ok) { if (!ok) return false; return persist({ status: "Draft" }).then(function () { renderHead(); return true; }); });
    }

    function renderHead() {
      var head = container.querySelector("#os-studio-head");
      head.innerHTML =
        '<div class="os-page-head"><div>' +
        '<div class="os-crumb" style="margin-bottom:4px"><a href="#/processes">Procesos</a> / ' + U.escapeHtml(proc.process_code || proc.name) + '</div>' +
        '<div class="os-page-title">' + U.escapeHtml(proc.process_title) + ' ' + ui.badgeStatus(proc.status) + '</div>' +
        '<div class="os-page-sub">' + U.escapeHtml(proc.purpose || "Sin propósito declarado") + '</div></div>' +
        '<div class="os-page-actions">' +
        '<span class="os-save-state" id="os-save-state"></span>' +
        '<select class="os-select" id="os-status-sel" style="max-width:150px">' + opt(STATUS_FLOW, proc.status) + '</select>' +
        '<button class="os-btn ghost" id="os-edit-data">✎ Editar datos</button>' +
        '<button class="os-btn" id="os-add-step">＋ Paso</button>' +
        '<button class="os-btn" id="os-connect">🔗 Conectar</button>' +
        '<button class="os-btn primary" id="os-run-test">▶ Ejecutar prueba</button>' +
        '</div></div>' +
        '<div class="os-toolbar"><span class="os-tag">Versión ' + U.escapeHtml(proc.version_label || "—") + '</span>' +
        '<span class="os-tag">Autonomía ' + U.escapeHtml(proc.max_autonomy || "—") + '</span>' +
        ui.badgeRisk(proc.risk_level) +
        (proc.priority ? '<span class="os-tag">Criticidad: ' + U.escapeHtml(U.trValue(proc.priority)) + '</span>' : '') +
        (proc.frequency ? '<span class="os-tag">' + U.escapeHtml(U.trValue(proc.frequency)) + '</span>' : '') +
        '<span class="os-tag">SOP: ' + (proc.sop ? "<a href='#/sop/" + proc.sop + "'>" + U.escapeHtml(proc.sop) + "</a>" : "sin vincular") + '</span>' +
        '<button class="os-btn sm ghost" id="os-link-sop">Vincular SOP</button>' +
        '<button class="os-btn sm" id="os-warn" style="display:none">⚠ 0 advertencias</button></div>';
      ui.saveState(saveIndicatorEl(), "idle");
      renderWarnings();

      head.querySelector("#os-status-sel").onchange = function (e) {
        var next = e.target.value;
        if (next === "Active") {
          var issues = validateForPublish();
          if (issues.length) {
            e.target.value = proc.status;
            var body = document.createElement("div");
            body.innerHTML = '<p>No se puede publicar como Active mientras existan estos problemas:</p>' +
              issues.map(function (m) { return '<div class="os-flow-item"><div class="n">⚠</div><div>' + U.escapeHtml(m) + '</div></div>'; }).join("");
            ui.modal({ title: "No se puede publicar", body: body, actions: [{ label: "Entendido", cls: "primary", onClick: function () { return true; } }] });
            return;
          }
        }
        var msg = next === "Active" ? "¿Publicar esta versión como Active? Quedará disponible para iniciar runs reales." :
          next === "Retired" ? "¿Retirar el proceso? No podrá iniciar nuevos runs." : "¿Confirmar cambio de estado a " + next + "?";
        ui.confirm(msg).then(function (ok) {
          if (!ok) { e.target.value = proc.status; return; }
          var patch = { status: next };
          if (next === "Active") patch.published_on = new Date().toISOString().slice(0, 19).replace("T", " ");
          persist(patch).then(renderHead);
        });
      };
      head.querySelector("#os-edit-data").onclick = function () {
        openProcessWizard("edit", proc, function (updated) { Object.assign(proc, updated); renderHead(); });
      };
      head.querySelector("#os-add-step").onclick = function () { guardActiveEdit().then(function (ok) { if (ok) openStepPalette(); }); };
      head.querySelector("#os-connect").onclick = function () {
        connectMode = !connectMode; connectFrom = null;
        head.querySelector("#os-connect").classList.toggle("primary", connectMode);
        ui.toast(connectMode ? "Modo conectar: haz clic en el paso de origen y luego el de destino." : "Modo conectar desactivado", "warn");
      };
      head.querySelector("#os-run-test").onclick = function () { runProcessTest(); };
      head.querySelector("#os-link-sop").onclick = function () { linkSop(); };
    }

    function linkSop() {
      var body = document.createElement("div");
      body.innerHTML = fieldRow("Código de SOP existente", '<input class="os-input" id="s-code">');
      ui.attachLinkSearch(body.querySelector("#s-code"), "OS SOP");
      ui.modal({
        title: "Vincular SOP", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        { label: "Vincular", cls: "primary", onClick: function () { persist({ sop: body.querySelector("#s-code").value.trim() }).then(renderHead); } }]
      });
    }

    function runProcessTest() {
      if (proc.status === "Retired") { ui.toast("El proceso está retirado; no puede iniciar nuevos runs.", "warn"); return; }
      ui.confirm("Se creará un OS Run en modo prueba para \"" + proc.process_title + "\".").then(function (ok) {
        if (!ok) return;
        api.create("OS Run", {
          run_code: (proc.process_code || proc.name) + "-" + Date.now().toString(36).toUpperCase(),
          process: proc.name, process_version: proc.version_label, status: "Queued", trigger_type: "Manual",
          initiated_by: OS.session.user, started_at: new Date().toISOString().slice(0, 19).replace("T", " "),
          current_step_key: (proc.steps[0] || {}).step_key || ""
        }).then(function (run) { ui.toast("Run creado: " + run.name, "ok"); OS.router.navigate("/runs/" + run.name); }).catch(ui.error);
      });
    }

    /** Advertencias: nodos huérfanos (START/END exceptuados de una de las dos direcciones),
     * conexiones sin destino válido y pasos sin actor — visibles sin bloquear el trabajo. */
    function computeWarnings() {
      var out = [];
      var stepKeys = {}; (proc.steps || []).forEach(function (s) { stepKeys[s.step_key] = true; });
      var hasIncoming = {}, hasOutgoing = {};
      (proc.edges || []).forEach(function (e) {
        hasOutgoing[e.source_step_key] = true; hasIncoming[e.target_step_key] = true;
        if (!stepKeys[e.source_step_key]) out.push("Conexión con origen roto: " + e.source_step_key);
        if (!stepKeys[e.target_step_key]) out.push("Conexión con destino roto: " + e.target_step_key);
      });
      (proc.steps || []).forEach(function (s) {
        if (s.step_type !== "START" && !hasIncoming[s.step_key]) out.push("Paso sin conexión de entrada: " + (s.step_title || s.step_key));
        if (s.step_type !== "END" && !hasOutgoing[s.step_key]) out.push("Paso sin conexión de salida: " + (s.step_title || s.step_key));
      });
      var seen = {};
      (proc.edges || []).forEach(function (e) {
        var k = e.source_step_key + "|" + e.target_step_key + "|" + e.relation_type;
        if (seen[k]) out.push("Conexión duplicada: " + e.source_step_key + " → " + e.target_step_key);
        seen[k] = true;
      });
      return out;
    }
    function renderWarnings() {
      var btn = container.querySelector("#os-warn"); if (!btn) return;
      var issues = computeWarnings();
      btn.style.display = issues.length ? "" : "none";
      btn.textContent = "⚠ " + issues.length + " advertencia" + (issues.length === 1 ? "" : "s");
      btn.onclick = function () {
        var body = document.createElement("div");
        body.innerHTML = issues.map(function (m) { return '<div class="os-flow-item"><div class="n">⚠</div><div>' + U.escapeHtml(m) + '</div></div>'; }).join("");
        ui.modal({ title: "Advertencias del proceso", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
      };
    }
    /** Antes de publicar: cada paso necesita actor y, salvo START/END, entrada y salida. */
    function validateForPublish() {
      var issues = [];
      var hasIncoming = {}, hasOutgoing = {};
      (proc.edges || []).forEach(function (e) { hasOutgoing[e.source_step_key] = true; hasIncoming[e.target_step_key] = true; });
      (proc.steps || []).forEach(function (s) {
        var hasActor = s.actor_kind === "System" || s.actor_user || s.actor_role || s.actor_agent;
        if (!hasActor) issues.push("\"" + (s.step_title || s.step_key) + "\" no tiene responsable o ejecutor asignado.");
        if (s.step_type !== "START" && !hasIncoming[s.step_key]) issues.push("\"" + (s.step_title || s.step_key) + "\" no tiene entrada (disparador).");
        if (s.step_type !== "END" && !hasOutgoing[s.step_key]) issues.push("\"" + (s.step_title || s.step_key) + "\" no tiene salida (destino).");
      });
      if (!proc.steps || !proc.steps.length) issues.push("El proceso no tiene pasos.");
      return issues.concat(checklistIssues(proc));
    }

    function toCanvasData() {
      var cn = (proc.steps || []).map(function (s) { return { id: s.step_key, x: s.x || 0, y: s.y || 0, w: 176, h: 62, data: s }; });
      var DASH = { HANDOFF: "alt", TIMEOUT: "feedback", ERROR: "feedback" };
      var ce = (proc.edges || []).map(function (e) {
        var cls = e.relation_type === "ERROR" ? "error" : (e.relation_type === "TRUE" ? "true" : e.relation_type === "FALSE" ? "false" : "");
        if (DASH[e.relation_type]) cls = (cls + " " + DASH[e.relation_type]).trim();
        return { id: e.edge_key, data: e, from: e.source_step_key, to: e.target_step_key, label: e.relation_type + (e.label ? ": " + e.label : ""), cls: cls };
      });
      if (cn.some(function (n) { return !n.x && !n.y; })) cn.forEach(function (n, i) { if (!n.x && !n.y) { n.x = 60 + i * 230; n.y = 60; } });
      return { cn: cn, ce: ce };
    }

    function renderCanvas() {
      var data = toCanvasData();
      var svg = container.querySelector("#os-studio-canvas");
      if (!engine) {
        svg.innerHTML = '<div class="os-canvas-toolbar"><button class="os-btn sm" data-a="fit">⤢ Ajustar</button></div><svg class="os-canvas-svg"></svg>';
        engine = OS.canvas.create(svg.querySelector("svg"), {
          edgeAnchor: "lr", onEdgeClick: function (edge) { if (!connectMode) openEdgeInspector(edge.data); },
          renderNode: function (g, n) {
            var s = n.data;
            var t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t1.setAttribute("x", 12); t1.setAttribute("y", 22); t1.setAttribute("class", "n-title");
            t1.textContent = STEP_ICON[s.step_type] + " " + (s.step_title || s.step_key).slice(0, 22);
            g.appendChild(t1);
            var t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t2.setAttribute("x", 12); t2.setAttribute("y", 40); t2.setAttribute("class", "n-sub");
            t2.textContent = s.execution_type + " · " + (s.actor_user || s.actor_role || s.actor_agent || s.actor_kind || "");
            g.appendChild(t2);
          },
          onNodeClick: function (n) {
            if (connectMode) {
              if (!connectFrom) { connectFrom = n.id; ui.toast("Origen: " + n.id + ". Ahora elige el destino.", "warn"); return; }
              if (connectFrom === n.id) { connectFrom = null; return; }
              openEdgeModal(connectFrom, n.id); connectFrom = null; return;
            }
            openStepInspector(proc.steps.find(function (s) { return s.step_key === n.id; }));
          },
          onNodeDragEnd: function (n, x, y, meta) {
            var s = proc.steps.find(function (x2) { return x2.step_key === n.id; });
            var before = { x: meta.fromX, y: meta.fromY };
            s.x = Math.round(x); s.y = Math.round(y);
            var after = { x: s.x, y: s.y };
            OS.history.push({
              label: "mover paso",
              undo: function () { s.x = before.x; s.y = before.y; persistDebounced(); renderCanvas(); },
              redo: function () { s.x = after.x; s.y = after.y; persistDebounced(); renderCanvas(); }
            });
            persistDebounced();
          }
        });
        svg.querySelector('[data-a="fit"]').onclick = engine.fit;
      }
      engine.setData(data.cn, data.ce);
      renderWarnings();
    }

    var STEP_TYPE_LABEL = { START: "Inicio / disparador", HUMAN: "Tarea humana", HYBRID: "Tarea híbrida (IA propone, persona confirma)", AI: "Tarea de IA", SYSTEM: "Acción de sistema", GATEWAY: "Compuerta / decisión", APPROVAL: "Aprobación", WAIT: "Espera / temporizador", END: "Fin" };
    var STEP_TYPE_DEFAULT_EXEC = { START: "SYS", HUMAN: "H", HYBRID: "H+AI", AI: "AI", SYSTEM: "SYS", GATEWAY: "SYS", APPROVAL: "H", WAIT: "SYS", END: "SYS" };

    /** Paleta de tipos de bloque — el paso nuevo abre su panel de edición de inmediato. */
    function openStepPalette() {
      var body = document.createElement("div");
      body.innerHTML = '<div class="os-grid cols-2">' + STEP_TYPES.map(function (t) {
        return '<div class="os-card" data-t="' + t + '" style="cursor:pointer;text-align:center">' +
          '<div style="font-size:22px">' + STEP_ICON[t] + '</div><b style="font-size:12.5px">' + STEP_TYPE_LABEL[t] + '</b></div>';
      }).join("") + '</div>';
      var m = ui.modal({ title: "Elige el tipo de paso", body: body, actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } }] });
      body.querySelectorAll("[data-t]").forEach(function (card) {
        card.onclick = function () { m.close(); addStep(card.dataset.t); };
      });
    }
    function addStep(type) {
      type = type || "HUMAN";
      var key = U.uid("step");
      proc.steps = proc.steps || [];
      var step = { step_key: key, step_title: STEP_TYPE_LABEL[type], step_type: type, execution_type: STEP_TYPE_DEFAULT_EXEC[type], actor_kind: type === "AI" ? "Agent" : (type === "SYSTEM" || type === "START" || type === "END" || type === "GATEWAY" || type === "WAIT") ? "System" : "User", x: 60 + proc.steps.length * 40, y: 60 + proc.steps.length * 30 };
      proc.steps.push(step);
      persist({ steps: proc.steps, edges: proc.edges }).then(function () { renderCanvas(); openStepInspector(step); });
    }

    function openEdgeModal(from, to) {
      guardActiveEdit().then(function (ok) {
        if (!ok) return;
        var body = document.createElement("div");
        body.innerHTML = fieldRow("Tipo de relación", '<select class="os-select" id="e-type">' + opt(["NEXT", "TRUE", "FALSE", "ERROR", "TIMEOUT", "HANDOFF"]) + '</select>') +
          fieldRow("Condición (declarativa, opcional)", '<input class="os-input" id="e-cond" placeholder="ej. score >= 80">') +
          fieldRow("Etiqueta visual", '<input class="os-input" id="e-label">');
        ui.modal({
          title: "Conectar " + from + " → " + to, body: body,
          actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
          {
            label: "Crear conexión", cls: "primary", onClick: function () {
              proc.edges = proc.edges || [];
              var newEdge = { edge_key: U.uid("edge"), source_step_key: from, target_step_key: to, relation_type: body.querySelector("#e-type").value, condition_expression: body.querySelector("#e-cond").value, label: body.querySelector("#e-label").value };
              proc.edges.push(newEdge);
              OS.history.push({
                label: "crear conexión",
                undo: function () { var i = proc.edges.indexOf(newEdge); if (i >= 0) proc.edges.splice(i, 1); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); },
                redo: function () { proc.edges.push(newEdge); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); }
              });
              persist({ steps: proc.steps, edges: proc.edges }).then(function () { renderCanvas(); });
            }
          }]
        });
      });
    }

    /** Seleccionar una línea la abre para editar tipo/condición/etiqueta o eliminarla — P0. */
    function openEdgeInspector(edge) {
      if (!edge) return;
      var body = document.createElement("div");
      body.innerHTML =
        '<div class="os-section-title">Conexión</div>' +
        fieldRow("Origen", '<div class="os-tag">' + U.escapeHtml(edge.source_step_key) + '</div>') +
        fieldRow("Destino", '<div class="os-tag">' + U.escapeHtml(edge.target_step_key) + '</div>') +
        fieldRow("Tipo de relación", '<select class="os-select" f="relation_type">' + opt(["NEXT", "TRUE", "FALSE", "ERROR", "TIMEOUT", "HANDOFF"], edge.relation_type) + '</select>') +
        fieldRow("Condición (declarativa)", '<input class="os-input" f="condition_expression" value="' + U.escapeHtml(edge.condition_expression || "") + '">') +
        fieldRow("Etiqueta visual", '<input class="os-input" f="label" value="' + U.escapeHtml(edge.label || "") + '">');

      var foot = document.createElement("div");
      foot.innerHTML = '<span class="os-save-state" id="edge-state"></span>' +
        '<div style="display:flex;gap:8px"><button class="os-btn danger sm" id="edge-del">Eliminar</button>' +
        '<button class="os-btn ghost sm" id="edge-cancel">Cancelar</button>' +
        '<button class="os-btn primary sm" id="edge-save">Guardar</button></div>';

      ui.inspector.open({ title: "Conexión", subtitle: edge.source_step_key + " → " + edge.target_step_key, body: body, foot: foot, onClose: function () { engine.clearSelection(); } });
      ui.saveState(foot.querySelector("#edge-state"), "idle");
      foot.querySelector("#edge-cancel").onclick = function () { ui.inspector.closeGuarded(); };

      foot.querySelector("#edge-save").onclick = function () {
        guardActiveEdit().then(function (ok) {
          if (!ok) return;
          var before = Object.assign({}, edge);
          ui.saveState(foot.querySelector("#edge-state"), "saving");
          body.querySelectorAll("[f]").forEach(function (elx) { edge[elx.getAttribute("f")] = elx.value; });
          var after = Object.assign({}, edge);
          OS.history.push({
            label: "editar conexión",
            undo: function () { Object.assign(edge, before); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); },
            redo: function () { Object.assign(edge, after); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); }
          });
          persist({ steps: proc.steps, edges: proc.edges }).then(function () {
            ui.saveState(foot.querySelector("#edge-state"), "saved"); ui.inspector.markClean();
            ui.toast("Conexión actualizada", "ok"); renderCanvas();
          }).catch(function () { ui.saveState(foot.querySelector("#edge-state"), "error"); });
        });
      };
      foot.querySelector("#edge-del").onclick = function () {
        ui.confirm("¿Eliminar la conexión " + edge.source_step_key + " → " + edge.target_step_key + "?", { danger: true }).then(function (ok) {
          if (!ok) return;
          guardActiveEdit().then(function (ok2) {
            if (!ok2) return;
            var idx = proc.edges.indexOf(edge);
            if (idx < 0) return;
            proc.edges.splice(idx, 1);
            OS.history.push({
              label: "eliminar conexión",
              undo: function () { proc.edges.splice(idx, 0, edge); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); },
              redo: function () { var i2 = proc.edges.indexOf(edge); if (i2 >= 0) proc.edges.splice(i2, 1); persist({ steps: proc.steps, edges: proc.edges }); renderCanvas(); }
            });
            persist({ steps: proc.steps, edges: proc.edges }).then(function () { ui.toast("Conexión eliminada", "ok"); ui.inspector.markClean(); ui.inspector.close(); renderCanvas(); });
          });
        });
      };
    }

    function openStepInspector(step) {
      if (!step) return;
      var body = document.createElement("div");
      body.innerHTML =
        '<div class="os-section-title">Identidad</div>' +
        fieldRow("Nombre corto", '<input class="os-input" f="step_title" value="' + U.escapeHtml(step.step_title || "") + '">') +
        '<div class="os-row">' +
        fieldRow("Tipo de bloque", '<select class="os-select" f="step_type">' + opt(STEP_TYPES, step.step_type) + '</select>') +
        fieldRow("Tipo de ejecución", '<select class="os-select" f="execution_type">' + opt(EXEC_TYPES, step.execution_type) + '</select>') + '</div>' +
        '<div class="os-section-title">Actor</div>' +
        fieldRow("Clase de actor", '<select class="os-select" f="actor_kind">' + opt(["User", "Role", "Agent", "System"], step.actor_kind) + '</select>') +
        fieldRow("Usuario (si aplica)", '<input class="os-input" f="actor_user" id="ai-actor-user" value="' + U.escapeHtml(step.actor_user || "") + '">') +
        fieldRow("Rol (si aplica)", '<input class="os-input" f="actor_role" id="ai-actor-role" value="' + U.escapeHtml(step.actor_role || "") + '">') +
        fieldRow("Agente IA (si aplica)", '<input class="os-input" f="actor_agent" id="ai-actor-agent" value="' + U.escapeHtml(step.actor_agent || "") + '">') +
        '<div class="os-row">' +
        fieldRow("Rol responsable (Designation)", '<input class="os-input" f="responsible_designation" id="ai-resp-desig" value="' + U.escapeHtml(step.responsible_designation || "") + '">', "Trabajo estándar / TWI") +
        fieldRow("Herramienta / sistema", '<input class="os-input" f="tool" value="' + U.escapeHtml(step.tool || "") + '" placeholder="Ej. ERPNext, WhatsApp…">') + '</div>' +
        '<div class="os-section-title">Contrato del paso</div>' +
        fieldRow("Instrucciones", '<textarea class="os-textarea" f="instructions">' + U.escapeHtml(step.instructions || "") + '</textarea>') +
        fieldRow("Evidence policy — qué prueba que terminó", '<input class="os-input" f="evidence_policy" value="' + U.escapeHtml(step.evidence_policy || "") + '">') +
        '<div class="os-row">' +
        fieldRow("SLA / tiempo estimado (min)", '<input class="os-input" type="number" f="sla_minutes" value="' + (step.sla_minutes || "") + '">') +
        fieldRow("Punto de control", '<div class="os-check" style="padding-top:8px"><input type="checkbox" f="control_point" ' + (step.control_point ? "checked" : "") + '> Sí (ISO 9001)</div>') +
        fieldRow("Requiere aprobación", '<div class="os-check" style="padding-top:8px"><input type="checkbox" f="requires_approval" ' + (step.requires_approval ? "checked" : "") + '> Sí</div>') + '</div>' +
        fieldRow("Rol aprobador (si aplica)", '<input class="os-input" f="approval_role" id="ai-approval-role" value="' + U.escapeHtml(step.approval_role || "") + '">') +
        '<div class="os-row">' +
        fieldRow("Prompt vinculado", '<input class="os-input" f="prompt" id="ai-prompt" value="' + U.escapeHtml(step.prompt || "") + '">') +
        fieldRow("Agente vinculado", '<input class="os-input" f="agent" id="ai-agent" value="' + U.escapeHtml(step.agent || "") + '">') + '</div>' +
        '<div class="os-section-title">Schemas declarativos</div>' +
        fieldRow("Input schema (JSON)", '<textarea class="os-textarea" f="input_schema">' + U.escapeHtml(step.input_schema || "") + '</textarea>') +
        fieldRow("Output schema (JSON)", '<textarea class="os-textarea" f="output_schema">' + U.escapeHtml(step.output_schema || "") + '</textarea>');

      ui.attachLinkSearch(body.querySelector("#ai-actor-user"), "User");
      ui.attachLinkSearch(body.querySelector("#ai-actor-role"), "Role");
      ui.attachLinkSearch(body.querySelector("#ai-approval-role"), "Role");
      ui.attachLinkSearch(body.querySelector("#ai-actor-agent"), "OS Agent");
      ui.attachLinkSearch(body.querySelector("#ai-resp-desig"), "Designation");
      ui.attachLinkSearch(body.querySelector("#ai-agent"), "OS Agent");
      ui.attachLinkSearch(body.querySelector("#ai-prompt"), "OS Prompt");

      var foot = document.createElement("div");
      foot.innerHTML =
        '<span class="os-save-state" id="step-state"></span>' +
        '<div style="display:flex;gap:8px"><button class="os-btn danger sm" id="step-del">Eliminar</button>' +
        '<button class="os-btn ghost sm" id="step-dup">Duplicar</button>' +
        '<button class="os-btn ghost sm" id="step-cancel">Cancelar</button>' +
        '<button class="os-btn primary sm" id="step-save">Guardar paso</button></div>';

      ui.inspector.open({ title: step.step_title || step.step_key, subtitle: step.step_key, body: body, foot: foot });
      ui.saveState(foot.querySelector("#step-state"), "idle");
      foot.querySelector("#step-cancel").onclick = function () { ui.inspector.closeGuarded(); };

      foot.querySelector("#step-save").onclick = function () {
        guardActiveEdit().then(function (ok) {
          if (!ok) return;
          ui.saveState(foot.querySelector("#step-state"), "saving");
          body.querySelectorAll("[f]").forEach(function (elx) {
            var f = elx.getAttribute("f");
            step[f] = elx.type === "checkbox" ? (elx.checked ? 1 : 0) : elx.value;
          });
          persist({ steps: proc.steps, edges: proc.edges }).then(function () {
            ui.saveState(foot.querySelector("#step-state"), "saved"); ui.inspector.markClean();
            ui.toast("Paso guardado", "ok"); renderCanvas();
          }).catch(function () { ui.saveState(foot.querySelector("#step-state"), "error"); });
        });
      };
      foot.querySelector("#step-dup").onclick = function () {
        guardActiveEdit().then(function (ok) {
          if (!ok) return;
          var copy = Object.assign({}, step, { step_key: U.uid("step"), step_title: (step.step_title || step.step_key) + " (copia)", x: (step.x || 0) + 40, y: (step.y || 0) + 40 });
          proc.steps.push(copy);
          persist({ steps: proc.steps, edges: proc.edges }).then(function () {
            ui.toast("Paso duplicado", "ok"); ui.inspector.markClean(); ui.inspector.close(); renderCanvas(); openStepInspector(copy);
          });
        });
      };
      foot.querySelector("#step-del").onclick = function () {
        ui.confirm("¿Eliminar el paso \"" + (step.step_title || step.step_key) + "\" y sus conexiones?", { danger: true }).then(function (okc) {
          if (!okc) return;
          guardActiveEdit().then(function (ok) {
            if (!ok) return;
            proc.steps = proc.steps.filter(function (s) { return s.step_key !== step.step_key; });
            proc.edges = (proc.edges || []).filter(function (e) { return e.source_step_key !== step.step_key && e.target_step_key !== step.step_key; });
            persist({ steps: proc.steps, edges: proc.edges }).then(function () { ui.inspector.markClean(); ui.inspector.close(); renderCanvas(); });
          });
        });
      };
    }

    api.get("OS Process", name).then(function (doc) {
      proc = doc; proc.steps = proc.steps || []; proc.edges = proc.edges || [];
      renderHead(); renderCanvas(); setTimeout(function () { engine && engine.fit(); }, 30);
    }).catch(function (e) { container.innerHTML = ui.empty("⚠️", "No se pudo abrir el proceso", e.message); });
  }

  OS.router.register("/processes", { title: "Biblioteca de Procesos", mount: mountList, unmount: function () {} });
  OS.router.register("/processes/:name", { title: "Estudio de Procesos", mount: mountStudio, unmount: function () {} });
})(window);
