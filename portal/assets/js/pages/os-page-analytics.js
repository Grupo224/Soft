/*! Página: Analítica (/analytics) — SLA, cycle time, excepciones y Health Score, sin librerías externas. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  function bar(label, value, max, suffix) {
    var pct = max ? Math.round(value / max * 100) : 0;
    return '<div class="os-bar-row"><div class="lbl">' + U.escapeHtml(label) + '</div>' +
      '<div class="os-progress" style="flex:1"><i style="width:' + pct + '%"></i></div>' +
      '<div class="val">' + value + (suffix || '') + '</div></div>';
  }

  function minutesBetween(a, b) {
    if (!a || !b) return null;
    var d1 = new Date(a.replace(" ", "T")), d2 = new Date(b.replace(" ", "T"));
    if (isNaN(d1) || isNaN(d2)) return null;
    return Math.max(0, Math.round((d2 - d1) / 60000));
  }

  function groupCount(arr, key) {
    var out = {};
    arr.forEach(function (x) { var k = x[key] || "—"; out[k] = (out[k] || 0) + 1; });
    return out;
  }

  function mount(container) {
    container.innerHTML =
      '<div class="os-page-head"><div><div class="os-page-title">Analítica</div>' +
      '<div class="os-page-sub">Cycle time, SLA, excepciones y salud del sistema. Cada score se puede abrir en su composición.</div></div></div>' +
      '<div class="os-grid cols-4" id="an-kpis">' + [1, 2, 3, 4].map(function () { return '<div class="os-card">' + ui.skeleton(2) + '</div>'; }).join('') + '</div>' +
      '<div class="os-grid cols-2" style="margin-top:16px">' +
      '<div class="os-card"><div class="os-section-title">Runs por estado</div><div id="an-status">' + ui.skeleton(4) + '</div></div>' +
      '<div class="os-card"><div class="os-section-title">Health Score — composición transparente</div><div id="an-health">' + ui.skeleton(4) + '</div></div>' +
      '</div>' +
      '<div class="os-grid cols-2" style="margin-top:16px">' +
      '<div class="os-card"><div class="os-section-title">Procesos por volumen de ejecución</div><div id="an-procs">' + ui.skeleton(4) + '</div></div>' +
      '<div class="os-card"><div class="os-section-title">Principales causas de excepción</div><div id="an-errors">' + ui.skeleton(4) + '</div></div>' +
      '</div>';

    Promise.all([
      api.list("OS Run", { fields: ["name", "process_ref", "status", "started_at", "completed_at"], limit: 500 }).catch(function () { return []; }),
      api.list("OS Step Run", { fields: ["name", "status", "error_code"], filters: [["status", "=", "Failed"]], limit: 500 }).catch(function () { return []; }),
      api.list("OS Process", { fields: ["name", "status", "owner_user", "sop", "sla_minutes"], limit: 500 }).catch(function () { return []; }),
      api.list("OS Integration", { fields: ["name", "status"], limit: 200 }).catch(function () { return []; })
    ]).then(function (r) {
      var runs = r[0], failedSteps = r[1], processes = r[2], integrations = r[3];
      var completed = runs.filter(function (x) { return x.status === "Completed"; });
      var cycleTimes = completed.map(function (x) { return minutesBetween(x.started_at, x.completed_at); }).filter(function (x) { return x != null; });
      var avgCycle = cycleTimes.length ? Math.round(cycleTimes.reduce(function (a, b) { return a + b; }, 0) / cycleTimes.length) : 0;
      var failedRuns = runs.filter(function (x) { return x.status === "Failed"; }).length;
      var failRate = runs.length ? Math.round(failedRuns / runs.length * 100) : 0;

      container.querySelector("#an-kpis").innerHTML =
        '<div class="os-card os-kpi"><div class="n">' + runs.length + '</div><div class="l">Runs totales</div></div>' +
        '<div class="os-card os-kpi"><div class="n">' + completed.length + '</div><div class="l">Completados</div></div>' +
        '<div class="os-card os-kpi"><div class="n" style="' + (failRate > 15 ? "color:var(--os-red)" : "") + '">' + failRate + '%</div><div class="l">Tasa de excepción</div></div>' +
        '<div class="os-card os-kpi"><div class="n">' + avgCycle + ' min</div><div class="l">Cycle time promedio</div></div>';

      var byStatus = groupCount(runs, "status");
      var maxStatus = Math.max.apply(null, Object.keys(byStatus).map(function (k) { return byStatus[k]; }).concat([1]));
      container.querySelector("#an-status").innerHTML = Object.keys(byStatus).length ? Object.keys(byStatus).map(function (k) { return bar(k, byStatus[k], maxStatus); }).join("") : ui.empty("—", "Sin runs todavía");

      var byProc = groupCount(runs, "process_ref");
      var procKeys = Object.keys(byProc).sort(function (a, b) { return byProc[b] - byProc[a]; }).slice(0, 8);
      var maxProc = Math.max.apply(null, procKeys.map(function (k) { return byProc[k]; }).concat([1]));
      container.querySelector("#an-procs").innerHTML = procKeys.length ? procKeys.map(function (k) { return bar(k, byProc[k], maxProc); }).join("") : ui.empty("—", "Sin datos");

      var byErr = groupCount(failedSteps, "error_code");
      var errKeys = Object.keys(byErr).sort(function (a, b) { return byErr[b] - byErr[a]; }).slice(0, 8);
      var maxErr = Math.max.apply(null, errKeys.map(function (k) { return byErr[k]; }).concat([1]));
      container.querySelector("#an-errors").innerHTML = errKeys.length ? errKeys.map(function (k) { return bar(k, byErr[k], maxErr); }).join("") : ui.empty("✅", "Sin excepciones registradas");

      var pOwner = processes.length ? Math.round(processes.filter(function (p) { return p.owner_user; }).length / processes.length * 100) : 0;
      var pSop = processes.length ? Math.round(processes.filter(function (p) { return p.sop; }).length / processes.length * 100) : 0;
      var pSla = processes.length ? Math.round(processes.filter(function (p) { return p.sla_minutes; }).length / processes.length * 100) : 0;
      var pActive = processes.length ? Math.round(processes.filter(function (p) { return p.status === "Active"; }).length / processes.length * 100) : 0;
      var iHealthy = integrations.length ? Math.round(integrations.filter(function (i) { return i.status === "Connected"; }).length / integrations.length * 100) : 100;
      var health = Math.round((pOwner + pSop + pSla + pActive + iHealthy) / 5);

      container.querySelector("#an-health").innerHTML =
        '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><div style="font-size:32px;font-weight:800">' + health + '</div><div class="muted">/100 — abre la composición, no es un número mágico</div></div>' +
        bar("Ownership de procesos", pOwner, 100, "%") + bar("Documentación (SOP vinculado)", pSop, 100, "%") +
        bar("SLA definido", pSla, 100, "%") + bar("Procesos en Active", pActive, 100, "%") + bar("Integraciones saludables", iHealthy, 100, "%");
    }).catch(ui.error);
  }

  OS.router.register("/analytics", { title: "Analítica", mount: mount, unmount: function () {} });
})(window);
