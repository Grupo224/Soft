/* LivingOrg OS — complemento de Mi Trabajo para actor_role y estado Approved. */
(function (global) {
  "use strict";
  var OS = global.OS;
  if (!OS || !OS.api || !OS.ui || !OS.util) return;
  var api = OS.api, ui = OS.ui, U = OS.util;
  var busy = false;

  function isOpenWork() {
    return (global.location.hash || "").split("?")[0] === "#/work" && !!document.querySelector("#chip-open.active");
  }
  function esc(v) { return U.escapeHtml(v == null ? "" : String(v)); }

  function card(row, source) {
    return '<div class="os-card os-op-extra-work" data-n="' + esc(row.name) + '" style="display:flex;align-items:center;gap:14px;margin-top:8px">' +
      '<div style="flex:1"><div><b>' + esc(row.step_title_snapshot || row.step_key) + '</b> ' + ui.badgeExec(row.execution_type_snapshot) + '</div>' +
      '<div class="muted" style="font-size:12px">Run ' + esc(row.run) + ' · ' + esc(source) + '</div></div>' +
      ui.badgeStatus(row.status) + '<div style="display:flex;gap:6px">' +
      (row.status === "Queued" ? '<button class="os-btn sm" data-a="start">Iniciar</button>' : '') +
      (["Running","Waiting","Approved"].indexOf(row.status) >= 0 ? '<button class="os-btn sm primary" data-a="complete">Operar / completar</button>' : '') +
      '</div></div>';
  }

  function load() {
    if (!isOpenWork() || busy) return;
    var host = document.querySelector("#os-work-list");
    if (!host) return;
    busy = true;
    api.call("livingorg_bridge.status.current_roles", {}, "GET").catch(function () { return []; }).then(function (roles) {
      var fields = ["name","run","step_key","step_title_snapshot","execution_type_snapshot","actor_user","actor_role","status","queued_at"];
      var calls = [
        api.list("OS Step Run", { fields: fields, filters: [["actor_user","=",OS.session.user],["status","=","Approved"]], orderBy:"queued_at desc", limit:100 })
      ];
      if (roles && roles.length) {
        calls.push(api.list("OS Step Run", { fields: fields, filters: [["actor_role","in",roles],["status","in",["Queued","Running","Waiting","Approved"]]], orderBy:"queued_at desc", limit:100 }));
      } else calls.push(Promise.resolve([]));
      return Promise.all(calls);
    }).then(function (groups) {
      if (!isOpenWork()) return;
      var hostNow = document.querySelector("#os-work-list"); if (!hostNow) return;
      var existing = {};
      hostNow.querySelectorAll("[data-n]").forEach(function (el) { existing[el.dataset.n] = true; });
      var rows = [], seen = {};
      (groups[0] || []).forEach(function (r) { if (!existing[r.name] && !seen[r.name]) { seen[r.name]=1; rows.push({row:r,source:"aprobado · listo para cerrar"}); } });
      (groups[1] || []).forEach(function (r) { if (!existing[r.name] && !seen[r.name]) { seen[r.name]=1; rows.push({row:r,source:"asignado a rol " + (r.actor_role || "")}); } });
      var old = hostNow.querySelector("#os-extra-work"); if (old) old.remove();
      if (!rows.length) return;
      var wrap = document.createElement("div"); wrap.id = "os-extra-work"; wrap.innerHTML = '<div class="os-section-title" style="margin-top:16px">Pendientes por rol / aprobación</div>' + rows.map(function (x) { return card(x.row,x.source); }).join("");
      hostNow.appendChild(wrap);
    }).catch(function () {}).finally(function () { busy = false; });
  }

  var observer = new MutationObserver(function () { setTimeout(load, 40); });
  function start() {
    observer.observe(document.getElementById("os-app-root") || document.body, { childList:true, subtree:true });
    global.addEventListener("hashchange", function () { setTimeout(load, 100); });
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#chip-open")) setTimeout(load, 120); });
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(window);
