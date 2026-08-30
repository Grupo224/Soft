/*! Páginas: Execution Center (/runs) y Timeline de un Run (/runs/:name). */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;
  var TERMINAL = ["Completed", "Failed", "Cancelled", "Skipped"];

  function mountList(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Execution Center</div>' +
      '<div class="os-page-sub">Instancias reales de procesos: timeline, estados, errores y evidencia.</div></div></div>' +
      '<div class="os-toolbar"><select class="os-select" id="r-status" style="max-width:200px"><option value="">Todos los estados</option>' +
      ["Queued", "Running", "Waiting", "Approved", "Completed", "Failed", "Skipped", "Cancelled"].map(function (s) { return "<option>" + s + "</option>"; }).join("") +
      '</select></div><div class="os-table-wrap"><div class="os-card" id="r-table">' + ui.skeleton(6) + '</div></div>';

    function load() {
      var filters = [];
      var st = container.querySelector("#r-status").value;
      if (st) filters.push(["status", "=", st]);
      api.list("OS Run", { fields: ["name", "run_code", "process", "status", "started_at", "completed_at", "current_step_key"], filters: filters, orderBy: "started_at desc", limit: 150 })
        .then(function (rows) {
          var host = container.querySelector("#r-table");
          if (!rows.length) { host.innerHTML = ui.empty("▶", "Sin runs", "Ejecuta un proceso en modo prueba desde Process Studio."); return; }
          host.innerHTML = '<table class="os-table"><thead><tr><th>Run</th><th>Proceso</th><th>Estado</th><th>Paso actual</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>' +
            rows.map(function (r) {
              return "<tr data-n='" + r.name + "'><td><b>" + U.escapeHtml(r.run_code || r.name) + "</b></td><td>" + U.escapeHtml(r.process || "") + "</td>" +
                "<td>" + ui.badgeStatus(r.status) + "</td><td class='muted'>" + U.escapeHtml(r.current_step_key || "—") + "</td>" +
                "<td class='muted'>" + U.timeAgo(r.started_at) + "</td><td class='muted'>" + (r.completed_at ? U.timeAgo(r.completed_at) : "—") + "</td></tr>";
            }).join("") + "</tbody></table>";
          host.querySelectorAll("tr[data-n]").forEach(function (tr) { tr.onclick = function () { OS.router.navigate("/runs/" + tr.dataset.n); }; });
        }).catch(ui.error);
    }
    load();
    container.querySelector("#r-status").onchange = load;
    return OS.poll(load, 20000);
  }

  function mountDetail(container, params) {
    container.innerHTML = '<div id="r-head">' + ui.skeleton(3) + '</div><div class="os-card" id="r-timeline" style="margin-top:14px">' + ui.skeleton(6) + '</div>';
    var name = params.name;

    function load() {
      return Promise.all([
        api.get("OS Run", name),
        api.list("OS Step Run", { fields: ["name", "step_key", "step_title_snapshot", "execution_type_snapshot", "actor_user", "actor_agent", "status", "queued_at", "started_at", "completed_at", "attempt_no", "error_code", "error_message", "evidence_required", "approval_required"], filters: [["run", "=", name]], orderBy: "queued_at asc", limit: 200 })
      ]).then(function (r) {
        var run = r[0], steps = r[1];
        container.querySelector("#r-head").innerHTML =
          '<div class="os-page-head"><div><div class="os-crumb" style="margin-bottom:4px"><a href="#/runs">Execution Center</a> / ' + U.escapeHtml(run.run_code || run.name) + '</div>' +
          '<div class="os-page-title">' + U.escapeHtml(run.run_code || run.name) + ' ' + ui.badgeStatus(run.status) + '</div>' +
          '<div class="os-page-sub">Proceso <a href="#/processes/' + run.process + '">' + U.escapeHtml(run.process) + '</a> · versión ' + U.escapeHtml(run.process_version || "—") + ' · iniciado por ' + U.escapeHtml(run.initiated_by || "—") + '</div></div>' +
          '<div class="os-page-actions">' +
          (TERMINAL.indexOf(run.status) === -1 ? '<button class="os-btn danger" id="r-cancel">Cancelar run</button>' : '') +
          '</div></div>' +
          '<div class="os-toolbar"><span class="os-tag">correlation: ' + U.escapeHtml(run.correlation_id || "—") + '</span>' +
          '<span class="os-tag">inicio ' + U.fmtDate(run.started_at) + '</span>' +
          (run.completed_at ? '<span class="os-tag">fin ' + U.fmtDate(run.completed_at) + '</span>' : '') + '</div>' +
          (run.summary ? '<div class="os-card">' + U.escapeHtml(run.summary) + '</div>' : '');

        var cancelBtn = container.querySelector("#r-cancel");
        if (cancelBtn) cancelBtn.onclick = function () {
          ui.confirm("¿Cancelar este run? Los pasos en curso quedarán marcados como cancelados.").then(function (ok) {
            if (!ok) return;
            api.update("OS Run", name, { status: "Cancelled", completed_at: new Date().toISOString().slice(0, 19).replace("T", " ") }).then(function () { ui.toast("Run cancelado", "ok"); load(); }).catch(ui.error);
          });
        };

        var host = container.querySelector("#r-timeline");
        if (!steps.length) { host.innerHTML = ui.empty("—", "Sin pasos registrados todavía"); return; }
        host.innerHTML = '<div class="os-section-title">Timeline de ejecución</div><div class="os-timeline">' + steps.map(function (s) {
          var cls = s.status === "Completed" ? "completed" : s.status === "Failed" ? "failed" : (s.status === "Running" ? "running" : (s.status === "Waiting" ? "waiting" : ""));
          return '<div class="os-timeline-item ' + cls + '" data-n="' + s.name + '">' +
            '<div style="display:flex;justify-content:space-between;gap:10px"><div>' +
            '<b>' + U.escapeHtml(s.step_title_snapshot || s.step_key) + '</b> ' + ui.badgeExec(s.execution_type_snapshot) + ' ' + ui.badgeStatus(s.status) +
            '<div class="muted" style="font-size:11.5px">' + U.escapeHtml(s.actor_user || s.actor_agent || "—") + ' · intento ' + (s.attempt_no || 1) + ' · ' + U.timeAgo(s.queued_at) + '</div>' +
            (s.error_message ? '<div style="color:var(--os-red);font-size:12px;margin-top:4px">⚠ ' + U.escapeHtml(s.error_code || "") + ': ' + U.escapeHtml(s.error_message) + '</div>' : '') +
            '</div>' + (s.status === "Failed" ? '<button class="os-btn sm" data-retry="' + s.name + '" data-attempt="' + (s.attempt_no || 1) + '">Reintentar</button>' : '') + '</div></div>';
        }).join("") + '</div>';

        host.querySelectorAll("[data-retry]").forEach(function (b) {
          b.onclick = function (e) { e.stopPropagation();
            api.update("OS Step Run", b.dataset.retry, { status: "Queued", attempt_no: parseInt(b.dataset.attempt, 10) + 1, error_code: "", error_message: "" }).then(function () { ui.toast("Paso reencolado", "ok"); load(); }).catch(ui.error);
          };
        });
        host.querySelectorAll(".os-timeline-item").forEach(function (elx) {
          elx.onclick = function () { openStepDetail(elx.dataset.n, steps.find(function (s) { return s.name === elx.dataset.n; })); };
        });
      });
    }

    function openStepDetail(id, step) {
      api.list("OS Evidence", { fields: ["name", "evidence_type", "file", "external_reference", "summary", "verification_status", "verified_by"], filters: [["step_run", "=", id]], limit: 20 }).catch(function () { return []; })
        .then(function (evidence) {
          var body = document.createElement("div");
          body.innerHTML =
            '<div class="os-section-title">Entrada</div><pre style="white-space:pre-wrap;font-size:11.5px">' + U.escapeHtml(step.input_json || "—") + '</pre>' +
            '<div class="os-section-title">Salida</div><pre style="white-space:pre-wrap;font-size:11.5px">' + U.escapeHtml(step.output_json || "—") + '</pre>' +
            '<div class="os-section-title">Evidencia (' + evidence.length + ')</div>' +
            (evidence.length ? evidence.map(function (e) {
              return '<div class="os-flow-item"><div class="n">📎</div><div style="flex:1"><b>' + U.escapeHtml(e.evidence_type) + '</b>' +
                (e.file ? ' — <a href="' + e.file + '" target="_blank">archivo</a>' : '') +
                (e.summary ? '<div class="muted" style="font-size:11.5px">' + U.escapeHtml(e.summary) + '</div>' : '') + '</div>' + ui.badgeStatus(e.verification_status) + '</div>';
            }).join("") : ui.empty("—", "Sin evidencia registrada", step.evidence_required ? "Este paso la exige." : ""));
          ui.inspector.open({ title: step.step_title_snapshot || step.step_key, subtitle: "Step Run " + id, body: body });
        });
    }

    load();
    return OS.poll(load, 15000);
  }

  OS.router.register("/runs", { title: "Execution Center", mount: function (c) { this._stop = mountList(c); }, unmount: function () { this._stop && this._stop(); } });
  OS.router.register("/runs/:name", { title: "Run", mount: function (c, p) { this._stop = mountDetail(c, p); }, unmount: function () { this._stop && this._stop(); } });
})(window);
