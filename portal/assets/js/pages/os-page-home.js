/*! Página: Command Center (/) — pulso operativo general. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;
  var stopPoll;

  var EXEC_LABEL = { H: "Humano", "H+AI": "Humano + IA", "AI→H": "IA → Humano", AI: "IA autónoma", SYS: "Sistema" };
  var EXEC_COLOR = { H: "var(--os-a-h)", "H+AI": "var(--os-a-hai)", "AI→H": "var(--os-a-aih)", AI: "var(--os-a-ai)", SYS: "var(--os-a-sys)" };

  function kpiCard(n, label, tone, ratio) {
    var pct = Math.round(Math.max(0.04, Math.min(1, ratio || 0)) * 100);
    return '<div class="os-card os-kpi"><div class="n" style="' + (tone ? "color:" + tone : "") + '">' + n + '</div><div class="l">' + label + '</div>' +
      (ratio != null ? '<div class="os-kpi-meter"><i style="width:' + pct + '%;background:' + (tone || "var(--os-brand)") + '"></i></div>' : '') + '</div>';
  }

  function execMapHtml(counts) {
    var total = 0; Object.keys(counts).forEach(function (k) { total += counts[k]; });
    if (!total) return '<div class="os-empty-inline">Aún no defines pasos en tus procesos. Cada paso declara quién ejecuta: Humano, IA o Sistema.</div>';
    var bar = '<div class="os-execmap-bar">' + Object.keys(EXEC_LABEL).map(function (k) {
      var pct = counts[k] / total * 100; if (!pct) return "";
      return '<div class="seg" style="width:' + pct + '%;background:' + EXEC_COLOR[k] + '" title="' + EXEC_LABEL[k] + ': ' + counts[k] + ' pasos">' + (pct > 9 ? Math.round(pct) + '%' : '') + '</div>';
    }).join("") + '</div>';
    var legend = '<div class="os-execmap-legend">' + Object.keys(EXEC_LABEL).map(function (k) {
      return '<div class="li"><span class="sw" style="background:' + EXEC_COLOR[k] + '"></span>' + EXEC_LABEL[k] + ' <b>' + (counts[k] || 0) + '</b></div>';
    }).join("") + '</div>';
    return bar + legend;
  }

  function healthRingSvg(score) {
    var C = 2 * Math.PI * 42, off = C * (1 - score / 100);
    var color = score >= 75 ? "var(--os-green)" : score >= 50 ? "var(--os-amber)" : "var(--os-red)";
    return '<svg viewBox="0 0 100 100" class="os-health-ring">' +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="var(--os-border)" stroke-width="9"/>' +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" ' +
      'stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '" transform="rotate(-90 50 50)"/>' +
      '<text x="50" y="49" text-anchor="middle" class="v">' + score + '</text>' +
      '<text x="50" y="64" text-anchor="middle" class="l">SALUD</text></svg>';
  }
  function healthLegendRow(label, v, color) {
    return '<div class="os-health-row"><span class="dot" style="background:' + color + '"></span>' + label +
      '<span class="track"><i style="width:' + v + '%;background:' + color + '"></i></span><span class="v">' + v + '%</span></div>';
  }

  function load(container) {
    var h = new Date().getHours();
    var saludo = h < 12 ? "Buen día" : h < 19 ? "Buenas tardes" : "Buenas noches";
    container.innerHTML =
      '<div class="os-hero"><div class="os-topo os-hero-topo">' + (OS.topoSvg || "") + '</div>' +
      '<div class="os-hero-inner"><div>' +
      '<div class="os-hero-eyebrow"><span class="dot"></span>Sistema vivo · en línea</div>' +
      '<h1>' + saludo + '</h1>' +
      '<div class="os-hero-sub">Pulso operativo de hoy: qué está vivo, qué espera tu decisión y qué conviene revisar.</div></div>' +
      '<div class="os-hero-actions">' +
      '<a class="os-btn" href="#/org">🏛 Ver organigrama</a>' +
      '<a class="os-btn primary" href="#/processes">＋ Nuevo proceso</a>' +
      '</div></div></div>' +
      '<div class="os-grid cols-4" id="os-home-kpis">' + [1, 2, 3, 4].map(function () { return '<div class="os-card">' + ui.skeleton(2) + '</div>'; }).join("") + '</div>' +
      '<div class="os-grid" style="grid-template-columns:1.6fr 1fr;margin-top:16px" id="os-home-mid">' +
      '  <div class="os-card"><div class="os-section-title">🗺 Mapa de ejecución</div><div id="os-home-execmap">' + ui.skeleton(3) + '</div></div>' +
      '  <div class="os-card"><div class="os-section-title">🛡 Health Score del sistema</div><div id="os-home-health">' + ui.skeleton(3) + '</div></div>' +
      '</div>' +
      '<div class="os-page-actions" style="margin:18px 0 6px">' +
      '<a class="os-btn" href="#/sop">📘 Registrar SOP</a>' +
      '<a class="os-btn" href="#/agents">🤖 Ver agentes</a>' +
      '<a class="os-btn" href="#/knowledge">🗂 Subir conocimiento</a>' +
      '</div>' +
      '<div class="os-grid cols-2" style="margin-top:10px">' +
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
      api.list("OS Process", { fields: ["name", "process_title", "status", "risk_level", "modified", "sop", "kpis", "definition_of_done", "sla_minutes"], orderBy: "modified desc", limit: 200 }).catch(function () { return []; }),
      api.list("OS Integration", { fields: ["name", "provider", "status"], limit: 0 }).catch(function () { return []; }),
      api.list("OS Process Step", { fields: ["execution_type"], limit: 0 }).catch(function () { return []; })
    ]).then(function (r) {
      var runs = r[0], approvals = r[1], processesAll = r[2], integrations = r[3], allSteps = r[4];
      var processesRecent = processesAll.slice(0, 6);
      var blocked = runs.filter(function (x) { return x.status === "Failed"; }).length;
      var degraded = integrations.filter(function (x) { return x.status !== "Connected"; }).length;

      container.querySelector("#os-home-kpis").innerHTML =
        kpiCard(runs.length, "Runs activos / en espera") +
        kpiCard(blocked, "Runs bloqueados o fallidos", blocked ? "var(--os-red)" : null, runs.length ? blocked / runs.length : 0) +
        kpiCard(approvals.length, "Aprobaciones pendientes", approvals.length ? "var(--os-amber)" : null, approvals.length ? 1 : 0) +
        kpiCard(degraded, "Integraciones degradadas", degraded ? "var(--os-amber)" : "var(--os-green)", integrations.length ? degraded / integrations.length : 0);

      // Mapa de ejecución: distribución real de execution_type entre todos los pasos.
      var counts = {}; Object.keys(EXEC_LABEL).forEach(function (k) { counts[k] = 0; });
      allSteps.forEach(function (s) { if (counts[s.execution_type] != null) counts[s.execution_type]++; });
      container.querySelector("#os-home-execmap").innerHTML = execMapHtml(counts);

      // Health Score: cobertura documental, KPI/DoD definidos, SLA y salud de integraciones.
      var n = processesAll.length || 1;
      var docPct = Math.round(processesAll.filter(function (p) { return p.sop; }).length / n * 100);
      var kpiPct = Math.round(processesAll.filter(function (p) { return p.kpis; }).length / n * 100);
      var dodPct = Math.round(processesAll.filter(function (p) { return p.definition_of_done; }).length / n * 100);
      var intPct = integrations.length ? Math.round(integrations.filter(function (i) { return i.status === "Connected"; }).length / integrations.length * 100) : 100;
      var score = processesAll.length ? Math.round((docPct + kpiPct + dodPct + intPct) / 4) : intPct;
      container.querySelector("#os-home-health").innerHTML =
        '<div class="os-health"><div class="os-health-ringwrap">' + healthRingSvg(score) + '</div><div class="os-health-legend">' +
        healthLegendRow("SOP vinculado", docPct, "var(--os-brand)") +
        healthLegendRow("KPI definido", kpiPct, "var(--os-green)") +
        healthLegendRow("DoD definido", dodPct, "var(--os-blue)") +
        healthLegendRow("Integraciones sanas", intPct, "var(--os-a-sys)") +
        '</div></div>';

      container.querySelector("#os-home-runs").innerHTML = runs.length ? runs.map(function (x) {
        return '<div class="os-flow-item"><div class="n">▶</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.run_code || x.name) + '</b> · ' + U.escapeHtml(x.process || "") + '</div>' +
          '<div class="muted" style="font-size:11.5px">paso actual: ' + U.escapeHtml(x.current_step_key || "—") + ' · ' + U.timeAgo(x.started_at) + '</div></div>' +
          ui.badgeStatus(x.status) + '</div>';
      }).join("") : ui.empty("✅", "Nada pendiente", "No hay runs bloqueados ni en espera.");
      container.querySelectorAll("#os-home-runs .os-flow-item").forEach(function (el, i) {
        ui.clickableRow(el, function () { OS.router.navigate("/runs/" + runs[i].name); });
      });

      container.querySelector("#os-home-approvals").innerHTML = approvals.length ? approvals.map(function (x) {
        return '<div class="os-flow-item"><div class="n">✅</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.run) + '</b></div>' +
          '<div class="muted" style="font-size:11.5px">para ' + U.escapeHtml(x.requested_to || x.requested_role || "—") + ' · ' + U.timeAgo(x.requested_at) + '</div></div>' +
          '<a class="os-btn sm" href="#/approvals">Revisar</a></div>';
      }).join("") : ui.empty("🟢", "Sin aprobaciones pendientes");

      container.querySelector("#os-home-processes").innerHTML = processesRecent.length ? processesRecent.map(function (x) {
        return '<div class="os-flow-item"><div class="n">🔀</div><div style="flex:1">' +
          '<div><b>' + U.escapeHtml(x.process_title) + '</b></div>' +
          '<div class="muted" style="font-size:11.5px">' + U.timeAgo(x.modified) + '</div></div>' +
          ui.badgeStatus(x.status) + '</div>';
      }).join("") : ui.empty("—", "Aún no hay procesos creados");
      container.querySelectorAll("#os-home-processes .os-flow-item").forEach(function (el, i) {
        ui.clickableRow(el, function () { OS.router.navigate("/processes/" + processesRecent[i].name); });
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
