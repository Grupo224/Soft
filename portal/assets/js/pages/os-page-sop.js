/*! Página: Constructor de SOP (/sop, /sop/:name) — estructura híbrida que exige la
 * "Instrucción maestra de mejoras": metadatos filtrables (Bloque A), pasos
 * repetibles con campos independientes y editor enriquecido (Bloque B), y
 * archivos reales del mecanismo de Frappe (Bloque C). Página amplia por
 * secciones, nunca un modal angosto; borrador primero, progreso visible. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  var STATUS_FLOW = ["Draft", "In Review", "Approved", "Published", "Obsolete"];
  var EXEC_TYPES = ["Humano", "IA", "Híbrido"];
  var SECTIONS = [
    { key: "basicos", label: "Datos básicos" }, { key: "pasos", label: "Pasos" },
    { key: "responsables", label: "Responsables" }, { key: "vinculos", label: "Vínculos" }, { key: "revision", label: "Revisión" }
  ];

  function fr(l, html, hint) { return ui.fieldRow(l, html, hint); }

  /* ================= Lista ================= */
  function mountList(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Constructor de SOP</div>' +
      '<div class="os-page-sub">Procedimiento vivo, versionado y enlazado a un proceso — nunca un PDF suelto.</div></div>' +
      '<div class="os-page-actions"><button class="os-btn primary" id="sop-new">＋ Nuevo SOP</button></div></div>' +
      '<div class="os-toolbar"><input class="os-input" id="sop-search" placeholder="Buscar por título o código…" style="max-width:260px"></div>' +
      '<div class="os-table-wrap"><div class="os-card" id="sop-table">' + ui.skeleton(5) + '</div></div>';

    var all = [];
    function render() {
      var q = container.querySelector("#sop-search").value.toLowerCase();
      var rows = !q ? all : all.filter(function (r) { return ((r.sop_title || "") + (r.sop_code || "")).toLowerCase().indexOf(q) !== -1; });
      var host = container.querySelector("#sop-table");
      if (!rows.length) { host.innerHTML = ui.empty("📘", "Sin SOPs todavía", "Crea el primero con “Nuevo SOP”."); return; }
      host.innerHTML = '<table class="os-table"><thead><tr><th>SOP</th><th>Área</th><th>Proceso</th><th>Estado</th><th>Versión</th><th>Modificado</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return "<tr data-n='" + r.name + "'><td><b>" + U.escapeHtml(r.sop_title) + "</b><div class='muted' style='font-size:11.5px'>" + U.escapeHtml(r.sop_code || "") + "</div></td>" +
            "<td>" + U.escapeHtml(r.department || "—") + "</td><td>" + U.escapeHtml(r.process_ref || "—") + "</td>" +
            "<td>" + ui.badgeStatus(r.status) + "</td><td>" + U.escapeHtml(r.version_label || "—") + "</td>" +
            "<td class='muted'>" + U.timeAgo(r.modified) + "</td></tr>";
        }).join("") + "</tbody></table>";
      host.querySelectorAll("tr[data-n]").forEach(function (tr) { ui.clickableRow(tr, function () { OS.router.navigate("/sop/" + tr.dataset.n); }); });
    }
    api.list("OS SOP", { fields: ["name", "sop_title", "sop_code", "department", "process_ref", "status", "version_label", "modified"], orderBy: "modified desc", limit: 200 })
      .then(function (rows) { all = rows; render(); }).catch(ui.error);
    container.querySelector("#sop-search").oninput = render;
    container.querySelector("#sop-new").onclick = function () {
      var body = document.createElement("div");
      body.innerHTML = fr("Título del SOP", '<input class="os-input" id="s-title" placeholder="Ej. Onboarding de Cliente">');
      ui.modal({
        title: "Nuevo SOP", body: body,
        actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Crear borrador", cls: "primary", onClick: function () {
            var title = body.querySelector("#s-title").value.trim();
            if (!title) { ui.toast("El título es obligatorio", "warn"); return false; }
            api.create("OS SOP", { sop_title: title, status: "Draft", version_label: "v0.1", steps: [] })
              .then(function (doc) { ui.toast("Borrador creado — continúa cuando quieras", "ok"); OS.router.navigate("/sop/" + doc.name); }).catch(ui.error);
          }
        }]
      });
    };
  }

  /* ================= Detalle ================= */
  function mountDetail(container, params) {
    container.innerHTML = ui.skeleton(8);
    var sop, dirty = false, saveStateEl;

    function markDirty() { dirty = true; if (saveStateEl) ui.saveState(saveStateEl, "dirty"); }
    function onBeforeUnload(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; return ""; } }
    window.addEventListener("beforeunload", onBeforeUnload);
    mountDetail._cleanup = function () { window.removeEventListener("beforeunload", onBeforeUnload); };

    api.get("OS SOP", params.name).then(function (doc) {
      sop = doc; sop.steps = sop.steps || [];
      render();
    }).catch(function (e) { container.innerHTML = ui.empty("⚠️", "No se pudo abrir el SOP", e.message); });

    function completeness() {
      return {
        basicos: !!(sop.sop_title && sop.department && sop.objective && sop.trigger),
        pasos: sop.steps.length > 0,
        responsables: !!(sop.owner_user && sop.roles),
        vinculos: !!(sop.process_ref || sop.file || sop.steps.some(function (s) { return s.prompt || s.responsible_agent; })),
        revision: !!(sop.definition_of_done && sop.evidence_required)
      };
    }

    function render() {
      var done = completeness();
      container.innerHTML =
        '<div class="os-page-head"><div>' +
        '<div class="os-crumb" style="margin-bottom:4px"><a href="#/sop">Constructor de SOP</a> / ' + U.escapeHtml(sop.sop_code || sop.name) + '</div>' +
        '<div class="os-page-title">' + U.escapeHtml(sop.sop_title) + ' ' + ui.badgeStatus(sop.status) + '</div>' +
        '<div class="os-page-sub">' + U.escapeHtml(sop.objective || "Sin objetivo declarado todavía.") + '</div></div>' +
        '<div class="os-page-actions"><span class="os-save-state" id="sop-savestate"></span>' +
        '<select class="os-select" id="sop-status" style="max-width:150px">' + ui.opt(STATUS_FLOW, sop.status) + '</select>' +
        '<button class="os-btn" id="sop-preview">👁 Vista previa</button>' +
        '<button class="os-btn danger" id="sop-del">Eliminar</button></div></div>' +
        '<div class="os-steps-progress">' + SECTIONS.map(function (s) {
          return '<div class="sp' + (done[s.key] ? " done" : "") + '" data-jump="' + s.key + '">' + (done[s.key] ? "✓ " : "") + s.label + '</div>';
        }).join("") + '</div>' +
        '<div id="sop-basicos"></div><div id="sop-pasos"></div><div id="sop-responsables"></div><div id="sop-vinculos"></div><div id="sop-revision"></div>' +
        '<div style="height:20px"></div>';

      saveStateEl = container.querySelector("#sop-savestate"); ui.saveState(saveStateEl, "idle");
      container.querySelectorAll("[data-jump]").forEach(function (chip) {
        chip.onclick = function () { var el = container.querySelector("#sop-" + chip.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
      });
      container.addEventListener("input", markDirty); container.addEventListener("change", markDirty);

      renderBasicos(container.querySelector("#sop-basicos"));
      renderPasos(container.querySelector("#sop-pasos"));
      renderResponsables(container.querySelector("#sop-responsables"));
      renderVinculos(container.querySelector("#sop-vinculos"));
      renderRevision(container.querySelector("#sop-revision"));

      container.querySelector("#sop-status").onchange = function (e) {
        var next = e.target.value;
        ui.confirm("¿Cambiar el estado del SOP a \"" + next + "\"?").then(function (ok) {
          if (!ok) { e.target.value = sop.status; return; }
          save({ status: next }).then(function () { ui.toast("Estado actualizado", "ok"); render(); });
        });
      };
      container.querySelector("#sop-del").onclick = function () {
        ui.confirm("¿Eliminar este SOP? Esta acción no se puede deshacer.", { danger: true }).then(function (ok) {
          if (!ok) return;
          api.remove("OS SOP", sop.name).then(function () { ui.toast("SOP eliminado", "ok"); OS.router.navigate("/sop"); }).catch(ui.error);
        });
      };
      container.querySelector("#sop-preview").onclick = openPreview;
    }

    /* -------- Ctrl+S guarda; aviso si se navega con cambios sin guardar -------- */
    function keyHandler(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); doSaveAll(); }
    }
    document.addEventListener("keydown", keyHandler);
    var prevCleanup = mountDetail._cleanup;
    mountDetail._cleanup = function () { prevCleanup(); document.removeEventListener("keydown", keyHandler); };

    function save(patch) {
      ui.saveState(saveStateEl, "saving");
      return api.update("OS SOP", sop.name, patch).then(function (doc) {
        Object.assign(sop, doc); dirty = false; ui.saveState(saveStateEl, "saved"); return doc;
      }).catch(function (e) { ui.saveState(saveStateEl, "error"); ui.error(e); throw e; });
    }

    function collectBasicFields(root) {
      var payload = {};
      root.querySelectorAll("[f]").forEach(function (elx) { payload[elx.getAttribute("f")] = elx.type === "checkbox" ? (elx.checked ? 1 : 0) : elx.value; });
      return payload;
    }

    function doSaveAll() {
      var payload = {};
      ["#sop-basicos", "#sop-responsables", "#sop-vinculos", "#sop-revision"].forEach(function (sel) {
        var host = container.querySelector(sel); if (host) Object.assign(payload, collectBasicFields(host));
      });
      payload.steps = sop.steps;
      save(payload).then(function () { ui.toast("SOP guardado", "ok"); render(); });
    }

    /* -------- Secciones -------- */
    function renderBasicos(host) {
      host.innerHTML =
        '<div class="os-card"><div class="os-section-title">1 · Datos básicos</div>' +
        '<div class="os-row">' +
        fr("Título", '<input class="os-input" f="sop_title" value="' + U.escapeHtml(sop.sop_title || "") + '">') +
        fr("Código", '<input class="os-input" f="sop_code" value="' + U.escapeHtml(sop.sop_code || "") + '">') +
        fr("Versión", '<input class="os-input" f="version_label" value="' + U.escapeHtml(sop.version_label || "") + '">') + '</div>' +
        '<div class="os-row">' +
        fr("Área", '<input class="os-input" f="department" id="sop-dept" value="' + U.escapeHtml(sop.department || "") + '">') +
        fr("Disparador", '<input class="os-input" f="trigger" value="' + U.escapeHtml(sop.trigger || "") + '">') + '</div>' +
        fr("Objetivo — resultado que debe producirse", '<textarea class="os-textarea" f="objective">' + U.escapeHtml(sop.objective || "") + '</textarea>') +
        fr("Alcance — cuándo aplica y cuándo no", '<textarea class="os-textarea" f="scope">' + U.escapeHtml(sop.scope || "") + '</textarea>') +
        fr("Resultado esperado", '<textarea class="os-textarea" f="expected_result">' + U.escapeHtml(sop.expected_result || "") + '</textarea>') +
        '<div class="os-row">' +
        fr("Riesgo", '<select class="os-select" f="risk_level">' + ui.opt(["Low", "Medium", "High", "Critical"], sop.risk_level) + '</select>') +
        fr("Vigente desde", '<input class="os-input" type="date" f="valid_from" value="' + (sop.valid_from || "") + '">') +
        fr("Vigente hasta", '<input class="os-input" type="date" f="valid_until" value="' + (sop.valid_until || "") + '">') + '</div>' +
        '<div class="os-row">' +
        fr("Última revisión", '<input class="os-input" type="date" f="last_reviewed_on" value="' + (sop.last_reviewed_on || "") + '">') +
        fr("Próxima revisión", '<input class="os-input" type="date" f="next_review_on" value="' + (sop.next_review_on || "") + '">') +
        fr("Tiempo estimado (min)", '<input class="os-input" type="number" f="estimated_time_minutes" value="' + (sop.estimated_time_minutes || "") + '">') + '</div>' +
        '</div>';
      ui.attachLinkSearch(host.querySelector("#sop-dept"), "Department");
    }

    function renderResponsables(host) {
      host.innerHTML =
        '<div class="os-card"><div class="os-section-title">3 · Responsabilidad</div>' +
        '<div class="os-row">' +
        fr("Responsable", '<input class="os-input" f="owner_user" id="sop-owner" value="' + U.escapeHtml(sop.owner_user || "") + '">') +
        fr("Aprobador", '<input class="os-input" f="approved_by" id="sop-approver" value="' + U.escapeHtml(sop.approved_by || "") + '">') + '</div>' +
        fr("Responsables (lista libre)", '<textarea class="os-textarea" f="responsible_users">' + U.escapeHtml(sop.responsible_users || "") + '</textarea>') +
        fr("Roles participantes", '<textarea class="os-textarea" f="roles">' + U.escapeHtml(sop.roles || "") + '</textarea>', "Los permisos reales se controlan desde Role Permission Manager en ERPNext.") +
        '</div>';
      ui.attachLinkSearch(host.querySelector("#sop-owner"), "User");
      ui.attachLinkSearch(host.querySelector("#sop-approver"), "User");
    }

    function renderVinculos(host) {
      host.innerHTML =
        '<div class="os-card"><div class="os-section-title">4 · Vínculos</div>' +
        fr("Proceso vinculado", '<input class="os-input" f="process_ref" id="sop-process" value="' + U.escapeHtml(sop.process_ref || "") + '">') +
        fr("Herramientas y permisos requeridos", '<textarea class="os-textarea" f="tools">' + U.escapeHtml(sop.tools || "") + '</textarea>') +
        '<div class="os-field"><label>Archivo del SOP completo</label><div id="sop-file"></div>' +
        '<div class="hint">Sube el archivo mediante el mecanismo de Frappe (nunca queda incrustado como texto); si es un paso específico el que necesita su propio archivo, agrégalo en esa tarjeta dentro de Pasos.</div></div>' +
        '</div>';
      ui.attachLinkSearch(host.querySelector("#sop-process"), "OS Process");
      ui.fileField(host.querySelector("#sop-file"), {
        value: sop.file, maxSizeMB: 20,
        uploadMeta: { doctype: "OS SOP", docname: sop.name, fieldname: "file" },
        onChange: function (url) { sop.file = url; save({ file: url }).then(function () { ui.toast("Archivo actualizado", "ok"); }); }
      });
    }

    function renderRevision(host) {
      host.innerHTML =
        '<div class="os-card"><div class="os-section-title">5 · Revisión y cierre</div>' +
        fr("Definition of Done", '<textarea class="os-textarea" f="definition_of_done">' + U.escapeHtml(sop.definition_of_done || "") + '</textarea>') +
        fr("Evidencia a guardar", '<textarea class="os-textarea" f="evidence_required">' + U.escapeHtml(sop.evidence_required || "") + '</textarea>') +
        fr("Excepciones", '<textarea class="os-textarea" f="exceptions">' + U.escapeHtml(sop.exceptions || "") + '</textarea>') +
        fr("Controles", '<textarea class="os-textarea" f="controls">' + U.escapeHtml(sop.controls || "") + '</textarea>') +
        fr("Métricas (SLA, calidad, costo)", '<textarea class="os-textarea" f="metrics">' + U.escapeHtml(sop.metrics || "") + '</textarea>') +
        '<div style="display:flex;gap:8px;margin-top:6px">' +
        '<button class="os-btn primary" id="sop-savebtn">💾 Guardar borrador</button>' +
        (sop.status === "Draft" ? '<button class="os-btn" id="sop-submit">Enviar a revisión →</button>' : '') +
        '</div></div>';
      host.querySelector("#sop-savebtn").onclick = doSaveAll;
      var submitBtn = host.querySelector("#sop-submit");
      if (submitBtn) submitBtn.onclick = function () {
        var d = completeness();
        var missing = SECTIONS.filter(function (s) { return !d[s.key]; }).map(function (s) { return s.label; });
        if (missing.length) { ui.toast("Faltan secciones por completar: " + missing.join(", "), "warn"); return; }
        doSaveAll();
        save({ status: "In Review" }).then(function () { ui.toast("Enviado a revisión", "ok"); render(); });
      };
    }

    function openPreview() {
      var body = document.createElement("div");
      var stepsHtml = sop.steps.length ? sop.steps.slice().sort(function (a, b) { return (a.sequence || 0) - (b.sequence || 0); }).map(function (s) {
        return '<div class="os-flow-item" style="align-items:flex-start"><div class="n">' + (s.sequence || "·") + '</div><div style="flex:1">' +
          '<b>' + U.escapeHtml(s.step_title || "") + '</b> ' + ui.badgeExec(s.execution_type === "Humano" ? "H" : s.execution_type === "IA" ? "AI" : "H+AI") +
          '<div style="font-size:12.5px;margin-top:4px">' + (s.instruction || "<i>Sin instrucciones</i>") + '</div></div></div>';
      }).join("") : ui.empty("—", "Sin pasos aún");
      body.innerHTML =
        '<h2 style="margin-bottom:4px">' + U.escapeHtml(sop.sop_title) + '</h2>' +
        '<p class="muted">' + U.escapeHtml(sop.objective || "") + '</p>' +
        '<div class="os-section-title">Procedimiento</div>' + stepsHtml;
      ui.modal({ title: "Vista previa de lectura", body: body, actions: [{ label: "Cerrar", cls: "primary", onClick: function () { return true; } }] });
    }

    /* -------- Bloque B: pasos repetibles -------- */
    function renderPasos(host) {
      var openIdx = renderPasos._openIdx;
      host.innerHTML = '<div class="os-card"><div class="os-section-title" style="display:flex;align-items:center">2 · Procedimiento (pasos repetibles)' +
        '<button class="os-btn sm primary" style="margin-left:auto" id="sop-addstep">＋ Agregar paso</button></div>' +
        '<div id="sop-steps-list" class="os-flow-list"></div></div>';
      var list = host.querySelector("#sop-steps-list");
      if (!sop.steps.length) { list.innerHTML = ui.empty("📋", "Sin pasos todavía", "Cada paso guarda su propia información — no es un solo texto."); }
      sop.steps.forEach(function (step, idx) { list.appendChild(buildStepCard(step, idx, idx === openIdx)); });
      host.querySelector("#sop-addstep").onclick = function () {
        sop.steps.push({ sequence: sop.steps.length + 1, step_title: "Nuevo paso", execution_type: "Humano" });
        renderPasos._openIdx = sop.steps.length - 1;
        markDirty(); renderPasos(host);
      };
    }

    function buildStepCard(step, idx, open) {
      var card = document.createElement("div"); card.className = "os-card"; card.style.padding = "12px";
      var head = document.createElement("div");
      head.style.cssText = "display:flex;align-items:center;gap:10px;cursor:pointer";
      head.innerHTML = '<div class="n" style="width:24px;height:24px;border-radius:7px;background:var(--os-border-soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex:none">' + (step.sequence || idx + 1) + '</div>' +
        '<div style="flex:1"><b>' + U.escapeHtml(step.step_title || "Paso sin título") + '</b> ' + ui.badgeExec(step.execution_type === "Humano" ? "H" : step.execution_type === "IA" ? "AI" : "H+AI") +
        (step.evidence_required ? ' <span class="os-tag">evidencia obligatoria</span>' : "") + '</div>' +
        '<button class="os-btn ghost icon sm" data-a="up" title="Mover arriba" aria-label="Mover arriba">↑</button>' +
        '<button class="os-btn ghost icon sm" data-a="down" title="Mover abajo" aria-label="Mover abajo">↓</button>' +
        '<button class="os-btn ghost icon sm" data-a="dup" title="Duplicar" aria-label="Duplicar">⧉</button>' +
        '<button class="os-btn ghost icon sm" data-a="del" title="Eliminar" aria-label="Eliminar">✕</button>' +
        '<span class="os-tag">' + (open ? "▾" : "▸") + '</span>';
      card.appendChild(head);
      var body = document.createElement("div");
      body.hidden = !open; body.style.marginTop = "12px";
      card.appendChild(body);
      if (open) fillStepBody(body, step, idx);

      head.addEventListener("click", function (e) {
        if (e.target.closest("[data-a]")) return;
        renderPasos._openIdx = (renderPasos._openIdx === idx ? null : idx);
        renderPasos(document.getElementById("sop-pasos"));
      });
      head.querySelector('[data-a="up"]').onclick = function (e) { e.stopPropagation(); if (idx === 0) return; swapSteps(idx, idx - 1); };
      head.querySelector('[data-a="down"]').onclick = function (e) { e.stopPropagation(); if (idx === sop.steps.length - 1) return; swapSteps(idx, idx + 1); };
      head.querySelector('[data-a="dup"]').onclick = function (e) {
        e.stopPropagation();
        var copy = Object.assign({}, step); delete copy.name;
        copy.step_title = (step.step_title || "Paso") + " (copia)";
        sop.steps.splice(idx + 1, 0, copy);
        renumber(); markDirty(); renderPasos(document.getElementById("sop-pasos"));
      };
      head.querySelector('[data-a="del"]').onclick = function (e) {
        e.stopPropagation();
        ui.confirm("¿Eliminar el paso \"" + (step.step_title || "") + "\"?", { danger: true }).then(function (ok) {
          if (!ok) return;
          sop.steps.splice(idx, 1); renumber(); markDirty(); renderPasos(document.getElementById("sop-pasos"));
        });
      };
      return card;
    }

    function swapSteps(i, j) {
      var tmp = sop.steps[i]; sop.steps[i] = sop.steps[j]; sop.steps[j] = tmp;
      renumber(); markDirty(); renderPasos(document.getElementById("sop-pasos"));
    }
    function renumber() { sop.steps.forEach(function (s, i) { s.sequence = i + 1; }); }

    function fillStepBody(body, step, idx) {
      body.innerHTML =
        '<div class="os-row">' +
        fr("Nombre del paso", '<input class="os-input" data-sf="step_title" value="' + U.escapeHtml(step.step_title || "") + '">') +
        fr("Tipo de ejecución", '<select class="os-select" data-sf="execution_type">' + ui.opt(EXEC_TYPES, step.execution_type) + '</select>') + '</div>' +
        '<div class="os-field"><label>Instrucción detallada</label><div class="sf-rte"></div></div>' +
        '<div class="os-row">' +
        fr("Responsable (usuario)", '<input class="os-input sf-user" data-sf="responsible_user" value="' + U.escapeHtml(step.responsible_user || "") + '">') +
        fr("Rol responsable", '<input class="os-input sf-role" data-sf="responsible_role" value="' + U.escapeHtml(step.responsible_role || "") + '">') +
        fr("Agente IA (si aplica)", '<input class="os-input sf-agent" data-sf="responsible_agent" value="' + U.escapeHtml(step.responsible_agent || "") + '">') + '</div>' +
        (step.execution_type !== "Humano" ? fr("Prompt vinculado", '<input class="os-input sf-prompt" data-sf="prompt" value="' + U.escapeHtml(step.prompt || "") + '">') : "") +
        '<div class="os-row">' +
        fr("Entrada requerida", '<textarea class="os-textarea" data-sf="input_required">' + U.escapeHtml(step.input_required || "") + '</textarea>') +
        fr("Acción", '<textarea class="os-textarea" data-sf="action">' + U.escapeHtml(step.action || "") + '</textarea>') + '</div>' +
        '<div class="os-row">' +
        fr("Salida esperada", '<textarea class="os-textarea" data-sf="output_expected">' + U.escapeHtml(step.output_expected || "") + '</textarea>') +
        fr("Criterio de terminado", '<textarea class="os-textarea" data-sf="done_criteria">' + U.escapeHtml(step.done_criteria || "") + '</textarea>') + '</div>' +
        '<div class="os-row">' +
        fr("Tiempo estimado", '<input class="os-input" data-sf="estimated_time" value="' + U.escapeHtml(step.estimated_time || "") + '" placeholder="Ej. 15 min">') +
        fr("Condición", '<input class="os-input" data-sf="condition" value="' + U.escapeHtml(step.condition || "") + '">') +
        fr("Excepción", '<input class="os-input" data-sf="exception" value="' + U.escapeHtml(step.exception || "") + '">') + '</div>' +
        fr("Siguiente paso (referencia)", '<input class="os-input" data-sf="next_step_hint" value="' + U.escapeHtml(step.next_step_hint || "") + '">') +
        fr("Evidencia obligatoria", '<div class="os-check"><input type="checkbox" data-sf="evidence_required" ' + (step.evidence_required ? "checked" : "") + '> Este paso exige evidencia verificable</div>') +
        '<div class="os-field"><label>Archivo del paso</label><div class="sf-file"></div></div>';

      var rte = ui.richEditor(body.querySelector(".sf-rte"), { value: step.instruction || "" });
      body.querySelectorAll("[data-sf]").forEach(function (elx) {
        elx.addEventListener("change", function () {
          var f = elx.getAttribute("data-sf");
          step[f] = elx.type === "checkbox" ? (elx.checked ? 1 : 0) : elx.value;
        });
      });
      body.addEventListener("focusout", function () { step.instruction = rte.getHTML(); }, true);
      ui.attachLinkSearch(body.querySelector(".sf-user"), "User");
      ui.attachLinkSearch(body.querySelector(".sf-role"), "Role");
      ui.attachLinkSearch(body.querySelector(".sf-agent"), "OS Agent");
      var promptInput = body.querySelector(".sf-prompt"); if (promptInput) ui.attachLinkSearch(promptInput, "OS Prompt");
      ui.fileField(body.querySelector(".sf-file"), {
        value: step.file, maxSizeMB: 15,
        onChange: function (url) { step.file = url; markDirty(); }
      });
    }
  }

  OS.router.register("/sop", { title: "Constructor de SOP", mount: mountList, unmount: function () {} });
  OS.router.register("/sop/:name", {
    title: "SOP",
    mount: mountDetail,
    unmount: function () { if (mountDetail._cleanup) { mountDetail._cleanup(); mountDetail._cleanup = null; } }
  });
})(window);
