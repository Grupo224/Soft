/*! Páginas: Mi Trabajo (/work) y Aprobaciones (/approvals). */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  /* ============================= /work ============================= */
  function mountWork(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Mi Trabajo</div>' +
      '<div class="os-page-sub">Solo pasos y tareas asignadas a ti. Nada se marca como terminado sin evidencia si el paso lo exige.</div></div></div>' +
      '<div class="os-toolbar"><span class="os-chip active" id="chip-open">Pendientes</span><span class="os-chip" id="chip-all">Todo mi historial</span></div>' +
      '<div id="os-work-list">' + ui.skeleton(5) + '</div>';

    function load(onlyOpen) {
      var filters = [["actor_user", "=", OS.session.user]];
      if (onlyOpen) filters.push(["status", "in", ["Queued", "Running", "Waiting"]]);
      api.list("OS Step Run", {
        fields: ["name", "run", "step_key", "step_title_snapshot", "execution_type_snapshot", "status", "queued_at", "started_at", "evidence_required", "approval_required"],
        filters: filters, orderBy: "queued_at desc", limit: 100
      }).then(function (rows) {
        var host = container.querySelector("#os-work-list");
        if (!rows.length) { host.innerHTML = ui.empty("🎉", "Sin pendientes", "No tienes pasos asignados en este filtro."); return; }
        host.innerHTML = rows.map(function (r) {
          return '<div class="os-card" style="display:flex;align-items:center;gap:14px" data-n="' + r.name + '">' +
            '<div style="flex:1"><div><b>' + U.escapeHtml(r.step_title_snapshot || r.step_key) + '</b> ' + ui.badgeExec(r.execution_type_snapshot) + '</div>' +
            '<div class="muted" style="font-size:12px">Run ' + U.escapeHtml(r.run) + ' · ' + U.timeAgo(r.queued_at) + (r.evidence_required ? " · requiere evidencia" : "") + '</div></div>' +
            ui.badgeStatus(r.status) +
            '<div style="display:flex;gap:6px">' +
            (r.status === "Queued" ? '<button class="os-btn sm" data-a="start">Iniciar</button>' : "") +
            (r.status === "Running" || r.status === "Waiting" ? '<button class="os-btn sm primary" data-a="complete">Completar</button>' : "") +
            '</div></div>';
        }).join("");
        host.querySelectorAll("[data-a='start']").forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation(); var n = b.closest("[data-n]").dataset.n;
            api.update("OS Step Run", n, { status: "Running", started_at: new Date().toISOString().slice(0, 19).replace("T", " ") }).then(function () { ui.toast("Tarea iniciada", "ok"); load(onlyOpen); }).catch(ui.error);
          };
        });
        host.querySelectorAll("[data-a='complete']").forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation(); var n = b.closest("[data-n]").dataset.n; var row = rows.find(function (r) { return r.name === n; }); openComplete(row, function () { load(onlyOpen); }); };
        });
      }).catch(ui.error);
    }
    load(true);
    container.querySelector("#chip-open").onclick = function () { toggle(true); };
    container.querySelector("#chip-all").onclick = function () { toggle(false); };
    function toggle(open) {
      container.querySelector("#chip-open").classList.toggle("active", open);
      container.querySelector("#chip-all").classList.toggle("active", !open);
      load(open);
    }
  }

  /** Busca las instrucciones del paso (viven en OS Process Step, no se snapshotean
   * en OS Step Run) para que quien ejecuta sepa qué se le pide antes de completar. */
  function fetchStepInstructions(stepRun) {
    return api.get("OS Run", stepRun.run).then(function (run) {
      if (!run.process_ref) return "";
      return api.get("OS Process", run.process_ref).then(function (proc) {
        var step = (proc.steps || []).find(function (s) { return s.step_key === stepRun.step_key; });
        return (step && step.instructions) || "";
      });
    }).catch(function () { return ""; });
  }

  function openComplete(stepRun, done) {
    var body = document.createElement("div");
    body.innerHTML =
      '<div id="c-instructions"></div>' +
      '<div class="os-field"><label>Resultado / comentario</label><textarea class="os-textarea" id="c-comment" placeholder="Qué se hizo, decisión tomada, siguiente acción…"></textarea></div>' +
      (stepRun.evidence_required ? '<div class="os-field"><label>Evidencia requerida</label><input type="file" id="c-file"><div class="hint">También puedes referenciar un documento ERPNext ya existente.</div>' +
        '<input class="os-input" id="c-ref" placeholder="reference_doctype:reference_name (opcional)" style="margin-top:6px"></div>' : "");
    fetchStepInstructions(stepRun).then(function (instr) {
      var host = body.querySelector("#c-instructions");
      if (host) host.innerHTML = instr ? '<div class="os-section-title">Instrucciones del paso</div><div class="os-card" style="margin-bottom:14px;white-space:pre-wrap;font-size:13px">' + U.escapeHtml(instr) + '</div>' : '';
    });
    ui.modal({
      title: "Completar: " + (stepRun.step_title_snapshot || stepRun.step_key), body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: "Marcar completado", cls: "primary", onClick: function () {
            var comment = body.querySelector("#c-comment").value.trim();
            var fileInput = body.querySelector("#c-file");
            var finish = function (evidenceOk) {
              if (stepRun.evidence_required && !evidenceOk) { ui.toast("Este paso exige evidencia verificable antes de completarse.", "warn"); return; }
              api.update("OS Step Run", stepRun.name, { status: "Completed", completed_at: new Date().toISOString().slice(0, 19).replace("T", " "), output_json: JSON.stringify({ comment: comment }) })
                .then(function () { ui.toast("Paso completado", "ok"); done(); }).catch(ui.error);
            };
            if (fileInput && fileInput.files && fileInput.files[0]) {
              api.uploadFile(fileInput.files[0], { doctype: "OS Step Run", docname: stepRun.name, fieldname: "file" }).then(function (f) {
                api.create("OS Evidence", { run: stepRun.run, step_run: stepRun.name, evidence_type: "File", file: f.file_url, summary: comment, verification_status: "Pending" })
                  .then(function () { finish(true); }).catch(ui.error);
              }).catch(ui.error);
            } else if (body.querySelector("#c-ref") && body.querySelector("#c-ref").value.trim()) {
              var parts = body.querySelector("#c-ref").value.trim().split(":");
              api.create("OS Evidence", { run: stepRun.run, step_run: stepRun.name, evidence_type: "Record", reference_doctype: parts[0], reference_name: parts[1], summary: comment, verification_status: "Pending" })
                .then(function () { finish(true); }).catch(ui.error);
            } else { finish(!stepRun.evidence_required); }
          }
        }
      ]
    });
  }

  /* ============================= /approvals ============================= */
  function mountApprovals(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Bandeja de Aprobaciones</div>' +
      '<div class="os-page-sub">Un flujo no avanza hasta que exista una decisión válida.</div></div></div>' +
      '<div id="os-appr-list">' + ui.skeleton(5) + '</div>';

    function load() {
      api.list("OS Approval", {
        fields: ["name", "run", "step_run", "process_ref", "requested_to", "requested_role", "status", "requested_at", "due_by", "risk_level", "context_snapshot"],
        filters: [["status", "=", "Pending"]], orderBy: "requested_at asc", limit: 100
      }).then(function (rows) {
        var host = container.querySelector("#os-appr-list");
        if (!rows.length) { host.innerHTML = ui.empty("✅", "Bandeja vacía", "No hay decisiones pendientes."); return; }
        host.innerHTML = rows.map(function (r) {
          return '<div class="os-card" data-n="' + r.name + '">' +
            '<div style="display:flex;justify-content:space-between;gap:10px"><div>' +
            '<div><b>Run ' + U.escapeHtml(r.run) + '</b>' + (r.process_ref ? ' · <a href="#/processes/' + r.process_ref + '">' + U.escapeHtml(r.process_ref) + '</a>' : '') + ' ' + (r.risk_level ? ui.badgeRisk(r.risk_level) : '') + '</div>' +
            '<div class="muted" style="font-size:12px">Paso: ' + U.escapeHtml(r.step_run || "—") + ' · solicitado a ' + U.escapeHtml(r.requested_to || r.requested_role || "—") + ' · ' + U.timeAgo(r.requested_at) +
            (r.due_by ? ' · vence ' + U.fmtDate(r.due_by) : '') + '</div>' +
            (r.context_snapshot ? '<pre style="white-space:pre-wrap;font-size:11.5px;color:var(--os-text-dim);margin-top:8px">' + U.escapeHtml(r.context_snapshot).slice(0, 400) + '</pre>' : "") +
            '</div><div style="display:flex;gap:6px;align-self:flex-start">' +
            '<button class="os-btn danger sm" data-a="reject">Rechazar</button><button class="os-btn primary sm" data-a="approve">Aprobar</button>' +
            '</div></div></div>';
        }).join("");
        host.querySelectorAll("[data-a]").forEach(function (b) {
          b.onclick = function () { decide(b.closest("[data-n]").dataset.n, b.dataset.a === "approve", load); };
        });
      }).catch(ui.error);
    }
    load();
  }

  function decide(name, approve, done) {
    var body = document.createElement("div");
    body.innerHTML = '<div class="os-field"><label>Comentario de decisión</label><textarea class="os-textarea" id="d-comment" placeholder="Motivo de la decisión…"></textarea></div>';
    ui.modal({
      title: approve ? "Aprobar" : "Rechazar", body: body,
      actions: [
        { label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
        {
          label: approve ? "Confirmar aprobación" : "Confirmar rechazo", cls: approve ? "primary" : "danger", onClick: function () {
            var comment = body.querySelector("#d-comment").value.trim();
            api.update("OS Approval", name, {
              status: approve ? "Approved" : "Rejected", decided_by: OS.session.user,
              decided_at: new Date().toISOString().slice(0, 19).replace("T", " "), decision_comment: comment
            }).then(function (doc) {
              ui.toast("Decisión registrada", "ok");
              if (doc.step_run) {
                api.update("OS Step Run", doc.step_run, approve ? { status: "Approved" } : { status: "Failed", error_code: "APPROVAL_REJECTED", error_message: comment }).catch(function () {});
              }
              done();
            }).catch(ui.error);
          }
        }
      ]
    });
  }

  OS.router.register("/work", { title: "Mi Trabajo", mount: mountWork, unmount: function () {} });
  OS.router.register("/approvals", { title: "Aprobaciones", mount: mountApprovals, unmount: function () {} });
})(window);
