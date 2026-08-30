/*! Página: Command Center (/) — pulso operativo general. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;
  var stopPoll;

  function kpiCard(n, label, tone) {
    return '<div class="os-card os-kpi"><div class="n" style="' + (tone ? "color:" + tone : "") + '">' + n + '</div><div class="l">' + label + '</div></div>';
  }

  function load(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Centro de Mando</div>' +
      '<div class="os-page-sub">Pulso de procesos, aprobaciones y salud del sistema en tiempo casi real.</div></div>' +
      '<div class="os-page-actions">' +
      '<a class="os-btn primary" href="#/processes">＋ Nuevo proceso</a>' +
      '<a class="os-btn" href="#/sop">📘 Registrar SOP</a>' +
      '<a class="os-btn" href="#/agents">🤖 Ver agentes</a>' +
      '</div></div>' +
      '<div class="os-grid cols-4" id="os-home-kpis">' + [1,2,3,4].map(function(){return '<div class="os-card">'+ui.skeleton(2)+'</div>';}).join("") + '</div>' +
      '<div class="os-grid cols-2" style="margin-top:16px">' +
      '  <div class="os-card"><div class="os-section-title">Runs en espera / bloqueados</div><div id="os-home-runs">' + ui.skeleton(4) + '</div></div>' +
      '  <div class="os-card"><div class="os-section-title">Aprobaciones pendientes</div><div id="os-home-approvals">' + ui.skeleton(4) + '</div></div>' +
      '</div>' +
      '<div class="os-grid cols-2" style="margin-top:16px">' +
      '  <div class="os-card"><div class="os-section-title">Últimos procesos modificados</div><div id="os-home-processes">' + ui.skeleton(4) + '</div></div>' +
      '  <div class="os-card"><div class="os-section-title">Integraciones</div><div id="os-home-integrations">' + ui.skeleton(3) + '</div></div>' +
      '</div>';

    return Promise.all([
      api.list("OS Run", { fields: ["name", "run_code", "process", "status", "started_at", "current_step_key"], filters: [["status", "in", ["Queued", "Running", "Waiting", "Failed"]]], orderBy: "started_at asc", limit: 8 }).catch(function () { return []; }),
      api.list("OS Approval", { fields: ["name", "run", "requested_to", "requested_role", "status", "requested_at"], filters: [["status", "=", "Pending"]], orderBy: "requested_at asc", limit: 8 }).catch(function () { return []; }),
      api.list("OS Process", { fields: ["name", "process_title", "status", "risk_level", "modified"], orderBy: "modified desc", limit: 6 }).catch(function () { return []; }),
      api.list("OS Integration", { fields: ["name", "provider", "status"], limit: 20 }).catch(function () { return []; })
    ]).then(function (r) {
      var runs = r[0], approvals = r[1], processes = r[2], integrations = r[3];
      var blocked = runs.filter(function (x) { return x.status === "Failed"; }).length;
      var degraded = integrations.filter(function (x) { return x.status !== "Connected"; }).length;

      container.querySelector("#os-home-kpis").innerHTML =
        kpiCard(runs.length, "Runs activos / en espera") +
        kpiCard(blocked, "Runs bloqueados o fallidos", blocked ? "var(--os-red)" : null) +
        kpiCard(approvals.length, "Aprobaciones pendientes", approvals.length ? "var(--os-amber)" : null) +
        kpiCard(degraded, "Integraciones degradadas", degraded ? "var(--os-amber)" : "var(--os-green)");

      container.querySelector("#os-home-runs").innerHTML = runs.length ? runs.map(function (x) {
        return '<div class="os-flow-item"><div class="n">▶</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.run_code || x.name) + '</b> · ' + U.escapeHtml(x.process || "") + '</div>' +
          '<div class="muted" style="font-size:11.5px">paso actual: ' + U.escapeHtml(x.current_step_key || "—") + ' · ' + U.timeAgo(x.started_at) + '</div></div>' +
          ui.badgeStatus(x.status) + '</div>';
      }).join("") : ui.empty("✅", "Nada pendiente", "No hay runs bloqueados ni en espera.");
      container.querySelectorAll("#os-home-runs .os-flow-item").forEach(function (el, i) {
        el.onclick = function () { OS.router.navigate("/runs/" + runs[i].name); };
      });

      container.querySelector("#os-home-approvals").innerHTML = approvals.length ? approvals.map(function (x) {
        return '<div class="os-flow-item"><div class="n">✅</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.run) + '</b></div>' +
          '<div class="muted" style="font-size:11.5px">para ' + U.escapeHtml(x.requested_to || x.requested_role || "—") + ' · ' + U.timeAgo(x.requested_at) + '</div></div>' +
          '<a class="os-btn sm" href="#/approvals">Revisar</a></div>';
      }).join("") : ui.empty("🟢", "Sin aprobaciones pendientes");

      container.querySelector("#os-home-processes").innerHTML = processes.length ? processes.map(function (x) {
        return '<div class="os-flow-item"><div class="n">🔀</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.process_title) + '</b></div>' +
          '<div class="muted" style="font-size:11.5px">' + U.timeAgo(x.modified) + '</div></div>' +
          ui.badgeStatus(x.status) + '</div>';
      }).join("") : ui.empty("—", "Aún no hay procesos creados");
      container.querySelectorAll("#os-home-processes .os-flow-item").forEach(function (el, i) {
        el.onclick = function () { OS.router.navigate("/processes/" + processes[i].name); };
      });

      container.querySelector("#os-home-integrations").innerHTML = integrations.length ? integrations.map(function (x) {
        return '<div class="os-flow-item"><div class="n">🔌</div><div style="flex:1"><b>' + U.escapeHtml(x.provider || x.name) + '</b></div>' + ui.badgeStatus(x.status) + '</div>';
      }).join("") : ui.empty("—", "Ninguna integración registrada", "Documenta al menos metadatos y estado (nunca secretos).");
    }).catch(ui.error);
  }

  OS.router.register("/", {
    title: "Centro de Mando",
    mount: function (container) {
      load(container);
      stopPoll = OS.poll(function () { return load(container); }, 25000);
    },
    unmount: function () { stopPoll && stopPoll(); }
  });
})(window);
