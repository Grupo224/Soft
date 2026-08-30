/*!
 * OS Core — sesión, estado, utilidades, componentes UI, router y shell de la app.
 * Depende de os-api.js (debe cargarse antes).
 */
(function (global) {
  "use strict";
  var OS = global.OS = global.OS || {};
  var api = OS.api;

  /* ============================= Utilidades ============================= */
  var util = {
    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms);
      };
    },
    escapeHtml: function (s) {
      if (s === undefined || s === null) return "";
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },
    initials: function (name) {
      if (!name) return "?";
      var parts = String(name).replace(/[@._-]/g, " ").trim().split(/\s+/);
      return ((parts[0] || "")[0] || "").toUpperCase() + ((parts[1] || "")[0] || "").toUpperCase();
    },
    fmtDate: function (v) {
      if (!v) return "—";
      var d = new Date(v.replace ? v.replace(" ", "T") : v);
      if (isNaN(d)) return v;
      return d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" }) +
        " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    },
    timeAgo: function (v) {
      if (!v) return "—";
      var d = new Date(v.replace ? v.replace(" ", "T") : v);
      if (isNaN(d)) return v;
      var s = Math.floor((Date.now() - d.getTime()) / 1000);
      if (s < 60) return "hace segundos";
      if (s < 3600) return "hace " + Math.floor(s / 60) + " min";
      if (s < 86400) return "hace " + Math.floor(s / 3600) + " h";
      return "hace " + Math.floor(s / 86400) + " d";
    },
    uid: function (prefix) { return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10); },
    qs: function (name) {
      var m = new RegExp("[?&#]" + name + "=([^&]*)").exec(global.location.href);
      return m ? decodeURIComponent(m[1]) : null;
    },
    clamp: function (n, min, max) { return Math.max(min, Math.min(max, n)); },
    downloadText: function (filename, text) {
      var blob = new Blob([text], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    }
  };
  OS.util = util;

  /* ============================= Store (pub/sub) ============================= */
  var listeners = {};
  var stateData = { user: null, roles: [], filters: {} };
  var store = {
    get: function (k) { return stateData[k]; },
    set: function (k, v) { stateData[k] = v; (listeners[k] || []).forEach(function (fn) { fn(v); }); },
    on: function (k, fn) { (listeners[k] = listeners[k] || []).push(fn); return function () {
      listeners[k] = listeners[k].filter(function (f) { return f !== fn; });
    }; },
    draft: {
      save: function (key, data) { try { localStorage.setItem("os_draft_" + key, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {} },
      load: function (key) { try { var v = JSON.parse(localStorage.getItem("os_draft_" + key)); return v && v.data; } catch (e) { return null; } },
      clear: function (key) { try { localStorage.removeItem("os_draft_" + key); } catch (e) {} }
    }
  };
  OS.store = store;

  /* ============================= Sesión / permisos ============================= */
  var session = {
    user: null,
    roles: [],
    hasRole: function (role) { return session.roles.indexOf(role) !== -1 || session.roles.indexOf("System Manager") !== -1 || session.roles.indexOf("Administrator") !== -1; },
    can: function (anyOfRoles) {
      if (!anyOfRoles || !anyOfRoles.length) return true;
      return anyOfRoles.some(session.hasRole);
    }
  };
  OS.session = session;

  /* ============================= UI: toasts ============================= */
  /* Los elementos flotantes (toast/modal/inspector/palette) se anclan dentro de #os-app-root
   * y no en document.body, porque las variables de diseño (--os-*) están ámbito-limitadas a .os-app. */
  function appendToAppRoot(elx) { (OS.rootEl || document.body).appendChild(elx); }

  var toastHost;
  function ensureToastHost() {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "os-toasts";
      appendToAppRoot(toastHost);
    }
    return toastHost;
  }
  var ui = {};
  ui.toast = function (msg, kind, ms) {
    var host = ensureToastHost();
    var el = document.createElement("div");
    el.className = "os-toast " + (kind || "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = ".25s"; setTimeout(function () { el.remove(); }, 250); }, ms || 3800);
  };
  ui.error = function (err) {
    var msg = (err && err.message) || "Ocurrió un error inesperado.";
    ui.toast(msg, "err", 5000);
    if (err && err.correlationId) console.warn("[OS] error, correlation id:", err.correlationId, err);
  };

  /* ---- Modal ---- */
  ui.modal = function (opts) {
    var bg = document.createElement("div");
    bg.className = "os-modal-bg";
    var box = document.createElement("div");
    box.className = "os-modal";
    box.innerHTML =
      '<div class="os-modal-head"><div class="os-modal-title">' + util.escapeHtml(opts.title || "") +
      '</div><div class="os-spacer"></div><button class="os-btn ghost icon" data-close>✕</button></div>' +
      '<div class="os-modal-body"></div><div class="os-modal-foot"></div>';
    box.querySelector(".os-modal-body").appendChild(opts.body || document.createTextNode(""));
    var foot = box.querySelector(".os-modal-foot");
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement("button");
      b.className = "os-btn " + (a.cls || "");
      b.textContent = a.label;
      b.onclick = function () { if (a.onClick(close) !== false && !a.keepOpen) close(); };
      foot.appendChild(b);
    });
    bg.appendChild(box);
    appendToAppRoot(bg);
    function close() { bg.remove(); }
    bg.addEventListener("click", function (e) { if (e.target === bg && opts.dismissible !== false) close(); });
    box.querySelector("[data-close]").onclick = close;
    return { close: close, el: box };
  };

  ui.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var body = document.createElement("div");
      body.textContent = message;
      var m = ui.modal({
        title: opts.title || "Confirmar acción",
        body: body,
        actions: [
          { label: opts.cancelLabel || "Cancelar", cls: "ghost", onClick: function () { resolve(false); } },
          { label: opts.okLabel || "Confirmar", cls: opts.danger ? "danger" : "primary", onClick: function () { resolve(true); } }
        ]
      });
    });
  };

  ui.skeleton = function (n) {
    var out = "";
    for (var i = 0; i < (n || 3); i++) out += '<div class="os-skel line" style="width:' + (60 + Math.random() * 35 | 0) + '%"></div>';
    return out;
  };

  ui.empty = function (icon, title, sub) {
    return '<div class="os-empty"><div class="ico">' + icon + '</div><div><b>' + util.escapeHtml(title) + '</b></div>' +
      (sub ? '<div style="margin-top:4px">' + util.escapeHtml(sub) + '</div>' : "") + '</div>';
  };

  ui.badgeStatus = function (status) {
    var map = {
      Draft: "st-draft", Pilot: "st-pilot", Active: "st-active", Degraded: "st-degraded",
      Blocked: "st-blocked", Waiting: "st-waiting", Retired: "st-retired",
      Queued: "st-waiting", Running: "st-active", Approved: "st-active",
      Completed: "st-active", Failed: "st-blocked", Skipped: "st-retired", Cancelled: "st-retired",
      Pending: "st-waiting", Rejected: "st-blocked", Connected: "st-active", Disconnected: "st-blocked"
    };
    var cls = map[status] || "st-draft";
    return '<span class="os-badge ' + cls + '"><span class="dot"></span>' + util.escapeHtml(status || "—") + '</span>';
  };
  ui.badgeRisk = function (risk) {
    if (!risk) return "";
    return '<span class="os-badge risk-' + risk.toLowerCase() + '">' + util.escapeHtml(risk) + '</span>';
  };
  ui.badgeExec = function (code) {
    var map = { H: "exec-h", "H+AI": "exec-hai", "AI→H": "exec-aih", "AI→H": "exec-aih", AI: "exec-ai", SYS: "exec-sys" };
    var cls = map[code] || "exec-h";
    var labels = { H: "Humano", "H+AI": "Humano + IA", "AI→H": "IA → Humano", AI: "IA autónoma", SYS: "Sistema" };
    return '<span class="os-badge ' + cls + '" title="' + (labels[code] || "") + '">' + util.escapeHtml(code) + '</span>';
  };

  /* ---- Inspector (panel lateral reutilizable) ---- */
  ui.inspector = (function () {
    var el;
    function ensure() {
      if (!el) {
        el = document.createElement("div");
        el.className = "os-inspector";
        el.innerHTML = '<div class="os-inspector-head"></div><div class="os-inspector-body os-scroll"></div><div class="os-inspector-foot"></div>';
        appendToAppRoot(el);
      }
      return el;
    }
    return {
      open: function (opts) {
        var box = ensure();
        box.querySelector(".os-inspector-head").innerHTML =
          '<div style="flex:1"><div style="font-weight:800;font-size:15px">' + util.escapeHtml(opts.title || "") + '</div>' +
          (opts.subtitle ? '<div style="font-size:12px;color:var(--os-text-mute)">' + util.escapeHtml(opts.subtitle) + '</div>' : "") + '</div>' +
          '<button class="os-btn ghost icon" data-close>✕</button>';
        var body = box.querySelector(".os-inspector-body");
        body.innerHTML = "";
        if (typeof opts.body === "string") body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
        var foot = box.querySelector(".os-inspector-foot");
        foot.innerHTML = "";
        if (opts.foot) { if (typeof opts.foot === "string") foot.innerHTML = opts.foot; else foot.appendChild(opts.foot); }
        box.querySelector("[data-close]").onclick = function () { ui.inspector.close(); if (opts.onClose) opts.onClose(); };
        requestAnimationFrame(function () { box.classList.add("open"); });
        if (OS.rootEl) OS.rootEl.classList.add("os-inspector-active");
        return box;
      },
      close: function () { if (el) el.classList.remove("open"); if (OS.rootEl) OS.rootEl.classList.remove("os-inspector-active"); },
      body: function () { return el && el.querySelector(".os-inspector-body"); }
    };
  })();

  ui.saveState = function (el, status) {
    // status: idle|saving|saved|error
    el.className = "os-save-state " + (status === "idle" ? "" : status);
    el.innerHTML = '<span class="dot"></span>' + ({ idle: "Sin cambios", saving: "Guardando…", saved: "Guardado", error: "Error al guardar" }[status] || "");
  };

  /** Autocompletado genérico para campos Link contra frappe.desk.search.search_link (mismo mecanismo que usa Desk). */
  ui.attachLinkSearch = function (input, doctype, onSelect) {
    var box = document.createElement("div");
    box.className = "os-link-suggest os-scroll";
    box.style.cssText = "position:absolute;z-index:80;background:var(--os-bg-soft);border:1px solid var(--os-border);" +
      "border-radius:8px;margin-top:2px;max-height:220px;overflow:auto;box-shadow:var(--os-shadow);display:none";
    input.parentNode.style.position = input.parentNode.style.position || "relative";
    input.parentNode.appendChild(box);
    var doSearch = util.debounce(function (txt) {
      api.call("frappe.client.get_list", {
        doctype: doctype, filters: JSON.stringify([["name", "like", "%" + txt + "%"]]),
        fields: JSON.stringify(["name"]), limit_page_length: 10, order_by: "modified desc"
      }, "GET").then(function (rows) {
        rows = rows || [];
        if (!rows.length) { box.style.display = "none"; return; }
        box.innerHTML = rows.map(function (r) { return '<div class="os-palette-item" data-v="' + util.escapeHtml(r.name) + '">' + util.escapeHtml(r.name) + '</div>'; }).join("");
        box.style.display = "block";
        box.querySelectorAll("[data-v]").forEach(function (el) {
          el.onclick = function () { input.value = el.dataset.v; box.style.display = "none"; onSelect && onSelect(el.dataset.v); };
        });
      }).catch(function () { box.style.display = "none"; });
    }, 250);
    input.addEventListener("input", function () { if (input.value.trim().length >= 1) doSearch(input.value.trim()); else box.style.display = "none"; });
    input.addEventListener("blur", function () { setTimeout(function () { box.style.display = "none"; }, 180); });
    input.addEventListener("focus", function () { if (input.value.trim().length >= 1) doSearch(input.value.trim()); });
  };

  OS.ui = ui;

  /* ============================= Router (hash-based, mismo Web Page) ============================= */
  var routes = []; // {pattern, regex, keys, def}
  var current = null;
  function compile(pattern) {
    var keys = [];
    var regex = new RegExp("^" + pattern.replace(/:[^/]+/g, function (m) { keys.push(m.slice(1)); return "([^/]+)"; }) + "$");
    return { regex: regex, keys: keys };
  }
  var router = {
    register: function (pattern, def) {
      var c = compile(pattern);
      routes.push({ pattern: pattern, regex: c.regex, keys: c.keys, def: def });
    },
    navigate: function (path) { global.location.hash = "#" + path; },
    resolve: function () {
      var hash = global.location.hash.replace(/^#/, "") || "/";
      var path = hash.split("?")[0];
      for (var i = 0; i < routes.length; i++) {
        var m = routes[i].regex.exec(path);
        if (m) {
          var params = {};
          routes[i].keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); });
          return { route: routes[i], params: params, path: path };
        }
      }
      return null;
    },
    start: function (mountEl, onChange) {
      function render() {
        var match = router.resolve();
        if (current && current.def.unmount) { try { current.def.unmount(); } catch (e) {} }
        OS.ui.inspector.close();
        mountEl.innerHTML = "";
        if (!match) {
          mountEl.innerHTML = OS.ui.empty("🧭", "Página no encontrada", "Usa el menú lateral para navegar.");
          current = null; onChange && onChange(null);
          return;
        }
        current = match.route;
        onChange && onChange(match.route.def, match.params);
        try { match.route.def.mount(mountEl, match.params); }
        catch (e) { console.error(e); mountEl.innerHTML = OS.ui.empty("⚠️", "Error al cargar la vista", e.message); }
      }
      global.addEventListener("hashchange", render);
      render();
    }
  };
  OS.router = router;

  /* ============================= Polling helper ============================= */
  OS.poll = function (fn, ms) {
    var stopped = false;
    function loop() {
      if (stopped || document.hidden) return schedule();
      Promise.resolve(fn()).catch(function () {}).then(schedule);
    }
    function schedule() { if (!stopped) setTimeout(loop, ms); }
    schedule();
    return function stop() { stopped = true; };
  };

  /* ============================= App shell (sidebar + topbar) ============================= */
  var NAV = [
    { group: "Operación" },
    { path: "/", icon: "⌘", label: "Command Center" },
    { path: "/work", icon: "🗂", label: "Mi Trabajo" },
    { path: "/approvals", icon: "✅", label: "Aprobaciones" },
    { path: "/runs", icon: "▶", label: "Ejecución" },
    { group: "Diseño" },
    { path: "/org", icon: "🏛", label: "Organigrama Vivo" },
    { path: "/processes", icon: "🔀", label: "Procesos" },
    { path: "/sop", icon: "📘", label: "SOPs" },
    { group: "Inteligencia" },
    { path: "/agents", icon: "🤖", label: "Agentes" },
    { path: "/prompts", icon: "✳", label: "Prompts" },
    { path: "/analytics", icon: "📊", label: "Analítica" },
    { group: "Conocimiento" },
    { path: "/knowledge", icon: "📚", label: "Fuentes" },
    { path: "/skills", icon: "🧩", label: "Skills" },
    { group: "Gobierno" },
    { path: "/integrations", icon: "🔌", label: "Integraciones" },
    { path: "/roles", icon: "🎖", label: "Role Cards" },
    { path: "/kpis", icon: "🎯", label: "KPIs" }
  ];

  function buildShell(root) {
    root.innerHTML =
      '<div class="os-shell">' +
      '  <aside class="os-sidebar">' +
      '    <div class="os-brand"><div class="os-logo">OS</div><div><div class="os-brand-title">LivingOrg OS</div>' +
      '    <div class="os-brand-sub">sobre ERPNext / Frappe</div></div></div>' +
      '    <nav class="os-nav" id="os-nav"></nav>' +
      '    <div class="os-sidebar-foot">v1.0 · Portal HTML/CSS/JS<br>Sin modificar el core.</div>' +
      '  </aside>' +
      '  <div class="os-main">' +
      '    <header class="os-topbar">' +
      '      <div class="os-crumb" id="os-crumb">Cargando…</div>' +
      '      <div class="os-spacer"></div>' +
      '      <div class="os-search" id="os-open-palette"><span>🔎</span><span>Buscar o saltar a…</span><span class="os-spacer"></span><kbd>Ctrl</kbd><kbd>K</kbd></div>' +
      '      <div class="os-user-chip" id="os-user-chip"><div class="os-avatar" id="os-avatar">?</div><div><div id="os-user-name" style="font-size:12.5px;font-weight:700">—</div></div></div>' +
      '    </header>' +
      '    <main class="os-content" id="os-view"></main>' +
      '  </div>' +
      '</div>';

    var navEl = root.querySelector("#os-nav");
    NAV.forEach(function (item) {
      if (item.group) {
        var g = document.createElement("div"); g.className = "os-nav-group"; g.textContent = item.group;
        navEl.appendChild(g); return;
      }
      var a = document.createElement("a");
      a.href = "#" + item.path;
      a.dataset.path = item.path;
      a.innerHTML = '<span class="os-ico">' + item.icon + '</span><span>' + item.label + '</span>';
      navEl.appendChild(a);
    });

    root.querySelector("#os-user-chip").onclick = function () {
      OS.ui.modal({
        title: "Sesión",
        body: (function () { var d = document.createElement("div"); d.innerHTML =
          '<div class="os-field"><label>Usuario</label><div>' + util.escapeHtml(session.user || "Guest") + '</div></div>' +
          '<div class="os-field"><label>Roles OS detectados</label><div>' + (session.roles.filter(function(r){return r.indexOf("OS ")===0;}).join(", ") || "Ninguno (revisa Role Permission Manager)") + '</div></div>';
          return d; })(),
        actions: [
          { label: "Ir al Escritorio ERPNext", cls: "ghost", onClick: function () { global.location.href = "/app"; return false; } },
          { label: "Cerrar sesión", cls: "danger", onClick: function () { api.logout().then(function () { global.location.href = "/login"; }); return false; } }
        ]
      });
    };

    return { navEl: navEl };
  }

  function markActiveNav(root, path) {
    root.querySelectorAll(".os-nav a").forEach(function (a) {
      a.classList.toggle("active", a.dataset.path === path || (path && path.indexOf(a.dataset.path) === 0 && a.dataset.path !== "/"));
    });
  }

  /* ---- Command palette (Ctrl+K) ---- */
  function openPalette() {
    var bg = document.createElement("div"); bg.className = "os-palette-bg";
    var box = document.createElement("div"); box.className = "os-palette";
    box.innerHTML = '<input placeholder="Buscar procesos, runs, agentes… o escribe un comando" autofocus>' +
      '<div class="os-palette-list"></div>';
    bg.appendChild(box); appendToAppRoot(bg);
    var input = box.querySelector("input"), list = box.querySelector(".os-palette-list");
    var items = NAV.filter(function (n) { return n.path; }).map(function (n) { return { title: n.label, sub: "Navegar", path: n.path }; });
    function render(filter) {
      var f = (filter || "").toLowerCase();
      var shown = items.filter(function (i) { return i.title.toLowerCase().indexOf(f) !== -1; });
      list.innerHTML = shown.map(function (i, idx) {
        return '<div class="os-palette-item' + (idx === 0 ? " sel" : "") + '" data-path="' + i.path + '"><span>' + i.title + '</span><span class="t">' + i.sub + '</span></div>';
      }).join("") || '<div class="os-palette-item">Sin resultados</div>';
      list.querySelectorAll(".os-palette-item[data-path]").forEach(function (el) {
        el.onclick = function () { router.navigate(el.dataset.path); close(); };
      });
    }
    render("");
    input.oninput = function () { render(input.value); };
    function close() { bg.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
    setTimeout(function () { input.focus(); }, 30);
  }

  /* ============================= Módulo CRUD genérico ============================= */
  /* Fábrica de páginas lista+detalle para DocTypes de gobierno/configuración
   * (Agentes, Prompts, SOP, Integraciones, Role Cards, KPIs) sin repetir boilerplate. */
  ui.fieldRow = function (l, html, hint) { return '<div class="os-field"><label>' + l + (hint ? ' <span class="hint">' + hint + "</span>" : "") + '</label>' + html + '</div>'; };
  ui.opt = function (list, sel) { return list.map(function (v) { return '<option' + (v === sel ? " selected" : "") + '>' + v + '</option>'; }).join(""); };

  function renderFieldHtml(f, value) {
    var v = value === undefined || value === null ? "" : value;
    switch (f.type) {
      case "select": return ui.fieldRow(f.label, '<select class="os-select" data-f="' + f.name + '">' + ui.opt(f.options, v) + '</select>', f.hint);
      case "textarea": return ui.fieldRow(f.label, '<textarea class="os-textarea" data-f="' + f.name + '" style="font-family:inherit">' + util.escapeHtml(v) + '</textarea>', f.hint);
      case "code": return ui.fieldRow(f.label, '<textarea class="os-textarea" data-f="' + f.name + '">' + util.escapeHtml(v) + '</textarea>', f.hint);
      case "check": return ui.fieldRow(f.label, '<div class="os-check" style="padding-top:6px"><input type="checkbox" data-f="' + f.name + '" ' + (v ? "checked" : "") + '> Sí</div>', f.hint);
      case "number": return ui.fieldRow(f.label, '<input class="os-input" type="number" data-f="' + f.name + '" value="' + util.escapeHtml(v) + '">', f.hint);
      case "link": return ui.fieldRow(f.label, '<input class="os-input" data-f="' + f.name + '" data-link="' + f.linkDoctype + '" value="' + util.escapeHtml(v) + '">', f.hint);
      default: return ui.fieldRow(f.label, '<input class="os-input" data-f="' + f.name + '" value="' + util.escapeHtml(v) + '">', f.hint);
    }
  }
  function wireFields(root) { root.querySelectorAll("[data-link]").forEach(function (elx) { ui.attachLinkSearch(elx, elx.dataset.link); }); }
  function collectFields(root) {
    var payload = {};
    root.querySelectorAll("[data-f]").forEach(function (elx) { payload[elx.dataset.f] = elx.type === "checkbox" ? (elx.checked ? 1 : 0) : elx.value; });
    return payload;
  }

  ui.simpleModule = function (cfg) {
    // cfg: {path,title,doctype,icon,columns[],fields[],titleField,codeField,statusField,statusOptions,subtitleField,emptyHint}
    function mountList(container) {
      container.innerHTML =
        '<div class="os-page-head"><div><div class="os-page-title">' + cfg.title + '</div>' +
        (cfg.subtitle ? '<div class="os-page-sub">' + cfg.subtitle + '</div>' : "") + '</div>' +
        '<div class="os-page-actions"><button class="os-btn primary" id="sm-new">＋ Nuevo</button></div></div>' +
        '<div class="os-toolbar"><input class="os-input" id="sm-search" placeholder="Buscar…" style="max-width:240px"></div>' +
        '<div class="os-table-wrap"><div class="os-card" id="sm-table">' + ui.skeleton(5) + '</div></div>';

      var fields = (cfg.columns || []).map(function (c) { return c.field; });
      var all = [];
      function render() {
        var q = container.querySelector("#sm-search").value.toLowerCase();
        var rows = !q ? all : all.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(q) !== -1; });
        var host = container.querySelector("#sm-table");
        if (!rows.length) { host.innerHTML = ui.empty(cfg.icon || "▦", "Sin registros", cfg.emptyHint || "Crea el primero."); return; }
        host.innerHTML = '<table class="os-table"><thead><tr>' + (cfg.columns || []).map(function (c) { return "<th>" + c.label + "</th>"; }).join("") + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return "<tr data-n='" + r.name + "'>" + (cfg.columns || []).map(function (c) { return "<td>" + (c.render ? c.render(r) : util.escapeHtml(r[c.field] || "—")) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table>";
        host.querySelectorAll("tr[data-n]").forEach(function (tr) { tr.onclick = function () { router.navigate(cfg.path + "/" + tr.dataset.n); }; });
      }
      api.list(cfg.doctype, { fields: fields.concat(["name"]), orderBy: "modified desc", limit: 300 }).then(function (rows) { all = rows; render(); }).catch(ui.error);
      container.querySelector("#sm-search").oninput = render;
      container.querySelector("#sm-new").onclick = function () { openCreate(); };

      function openCreate() {
        var body = document.createElement("div");
        body.innerHTML = (cfg.fields || []).map(function (f) { return renderFieldHtml(f, f.default); }).join("");
        wireFields(body);
        ui.modal({
          title: "Nuevo — " + cfg.title, body: body,
          actions: [{ label: "Cancelar", cls: "ghost", onClick: function () { return true; } },
          {
            label: "Crear", cls: "primary", onClick: function () {
              var payload = collectFields(body);
              if (cfg.titleField && !payload[cfg.titleField]) { ui.toast("Falta un campo obligatorio", "warn"); return false; }
              api.create(cfg.doctype, payload).then(function (doc) { ui.toast("Creado", "ok"); router.navigate(cfg.path + "/" + doc.name); }).catch(ui.error);
            }
          }]
        });
      }
    }

    function mountDetail(container, params) {
      container.innerHTML = ui.skeleton(6);
      api.get(cfg.doctype, params.name).then(function (doc) {
        container.innerHTML =
          '<div class="os-page-head"><div><div class="os-crumb" style="margin-bottom:4px"><a href="#' + cfg.path + '">' + cfg.title + '</a> / ' + util.escapeHtml(doc.name) + '</div>' +
          '<div class="os-page-title">' + util.escapeHtml(doc[cfg.titleField] || doc.name) + (cfg.statusField ? " " + ui.badgeStatus(doc[cfg.statusField]) : "") + '</div>' +
          (cfg.subtitleField ? '<div class="os-page-sub">' + util.escapeHtml(doc[cfg.subtitleField] || "") + '</div>' : "") + '</div>' +
          '<div class="os-page-actions"><span class="os-save-state" id="sm-save"></span>' +
          (cfg.statusField ? '<select class="os-select" id="sm-status" style="max-width:150px">' + ui.opt(cfg.statusOptions || [], doc[cfg.statusField]) + '</select>' : "") +
          '<button class="os-btn danger" id="sm-del">Eliminar</button><button class="os-btn primary" id="sm-save-btn">Guardar</button></div></div>' +
          '<div class="os-card">' + (cfg.fields || []).map(function (f) { return renderFieldHtml(f, doc[f.name]); }).join("") + '</div>' +
          (cfg.related ? '<div class="os-card" id="sm-related" style="margin-top:14px">' + ui.skeleton(3) + '</div>' : '');
        wireFields(container);
        ui.saveState(container.querySelector("#sm-save"), "idle");

        if (cfg.related) cfg.related(container.querySelector("#sm-related"), doc);

        var statusSel = container.querySelector("#sm-status");
        function doSave(extra) {
          ui.saveState(container.querySelector("#sm-save"), "saving");
          var payload = collectFields(container);
          Object.assign(payload, extra || {});
          api.update(cfg.doctype, doc.name, payload).then(function (d2) {
            Object.assign(doc, d2); ui.saveState(container.querySelector("#sm-save"), "saved"); ui.toast("Guardado", "ok");
          }).catch(function (e) { ui.saveState(container.querySelector("#sm-save"), "error"); ui.error(e); });
        }
        container.querySelector("#sm-save-btn").onclick = function () { doSave(); };
        if (statusSel) statusSel.onchange = function () { var extra = {}; extra[cfg.statusField] = statusSel.value; doSave(extra); };
        container.querySelector("#sm-del").onclick = function () {
          ui.confirm("¿Eliminar \"" + (doc[cfg.titleField] || doc.name) + "\"? Esta acción no se puede deshacer.", { danger: true }).then(function (ok) {
            if (!ok) return;
            api.remove(cfg.doctype, doc.name).then(function () { ui.toast("Eliminado", "ok"); router.navigate(cfg.path); }).catch(ui.error);
          });
        };
      }).catch(function (e) { container.innerHTML = ui.empty("⚠️", "No se pudo abrir el registro", e.message); });
    }

    router.register(cfg.path, { title: cfg.title, mount: mountList, unmount: function () {} });
    router.register(cfg.path + "/:name", { title: cfg.title, mount: mountDetail, unmount: function () {} });
  };

  /* ============================= Boot ============================= */
  OS.boot = function (rootId) {
    var root = document.getElementById(rootId);
    if (!root) { console.error("[OS] contenedor #" + rootId + " no encontrado"); return; }
    OS.rootEl = root; // ancla para toasts/modales/inspector/palette (ver appendToAppRoot)
    root.innerHTML = '<div class="os-gate"><div class="os-ico">⏳</div><h2>Cargando LivingOrg OS…</h2></div>';

    api.whoami().then(function (user) {
      if (!user || user === "Guest") {
        root.innerHTML = '<div class="os-gate"><div class="ico">🔒</div><h2>Necesitas iniciar sesión</h2>' +
          '<p>Este portal opera sobre la sesión autenticada de ERPNext/Frappe. Inicia sesión para continuar.</p>' +
          '<a class="os-btn primary" href="/login?redirect-to=' + encodeURIComponent(global.location.pathname + global.location.hash) + '">Iniciar sesión</a></div>';
        return;
      }
      session.user = user;
      // roles: intentamos leer de frappe.boot si el sitio lo expone; si no, se resuelve por permisos reales al usar cada DocType.
      try { session.roles = (global.frappe && global.frappe.boot && global.frappe.boot.user && global.frappe.boot.user.roles) || []; } catch (e) { session.roles = []; }

      var shell = buildShell(root);
      root.querySelector("#os-avatar").textContent = util.initials(user);
      root.querySelector("#os-user-name").textContent = user;

      var viewEl = root.querySelector("#os-view");
      router.start(viewEl, function (def, params) {
        markActiveNav(root, (router.resolve() || {}).path);
        root.querySelector("#os-crumb").innerHTML = def ? "<b>" + util.escapeHtml(def.title || "") + "</b>" : "";
        document.title = (def && def.title ? def.title + " · " : "") + "LivingOrg OS";
      });

      root.querySelector("#os-open-palette").onclick = openPalette;
      document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      });
    }).catch(function (err) {
      OS.ui && OS.ui.error ? OS.ui.error(err) : console.error(err);
      root.innerHTML = OS.ui.empty("⚠️", "No se pudo conectar con ERPNext", (err && err.message) || "");
    });
  };
})(window);
