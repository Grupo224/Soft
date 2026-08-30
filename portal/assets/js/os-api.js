/*!
 * OS API Adapter — única puerta de entrada a Frappe/ERPNext REST API.
 * Nadie más en el portal debe usar fetch() directo (regla del SOP técnico, sección 7.2).
 * - Adjunta CSRF/sesión same-origin.
 * - Normaliza errores 401/403/404/409/422/500.
 * - Aplica timeout y un correlation id por request (trazabilidad en logs de servidor/proxy).
 * - Nunca contiene secretos: usa siempre la sesión autenticada de Frappe (cookies same-origin).
 */
(function (global) {
  "use strict";

  var DEFAULT_TIMEOUT = 20000;

  function uuid() {
    return "os-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getCsrfToken() {
    try {
      if (global.frappe && global.frappe.csrf_token && global.frappe.csrf_token !== "{{ csrf_token }}") {
        return global.frappe.csrf_token;
      }
    } catch (e) {}
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute("content");
    if (global.csrf_token) return global.csrf_token;
    return null;
  }

  function buildQuery(params) {
    var qs = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "") return;
      if (typeof v !== "string") v = JSON.stringify(v);
      qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return qs.length ? "?" + qs.join("&") : "";
  }

  function friendlyMessage(status, payload) {
    if (payload && payload._server_messages) {
      try {
        var msgs = JSON.parse(payload._server_messages);
        var m0 = msgs[0] ? JSON.parse(msgs[0]) : null;
        if (m0 && m0.message) return m0.message;
      } catch (e) {}
    }
    if (payload && payload.message && typeof payload.message === "string") return payload.message;
    if (payload && payload.exc_type) return payload.exc_type + ": revisa la consola para detalle técnico.";
    switch (status) {
      case 401: return "Tu sesión expiró o no has iniciado sesión.";
      case 403: return "No tienes permiso para esta acción u objeto.";
      case 404: return "El recurso solicitado no existe.";
      case 409: return "El registro fue modificado por otra persona. Recarga antes de guardar.";
      case 422: return "Los datos enviados no pasaron validación.";
      case 0: return "No hay conexión con el servidor (timeout o red).";
      default: return "Error inesperado del servidor (" + status + ").";
    }
  }

  function request(method, url, body, opts) {
    opts = opts || {};
    var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timeoutMs = opts.timeout || DEFAULT_TIMEOUT;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    var correlationId = uuid();

    var headers = {
      "Accept": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken() || "",
      "X-Correlation-Id": correlationId
    };
    var fetchOpts = {
      method: method,
      credentials: "same-origin",
      headers: headers,
      signal: controller ? controller.signal : undefined
    };
    if (body instanceof FormData) {
      fetchOpts.body = body; // browser sets multipart boundary
    } else if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json; charset=utf-8";
      fetchOpts.body = JSON.stringify(body);
    }

    return fetch(url, fetchOpts).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (text) {
        var payload = null;
        try { payload = text ? JSON.parse(text) : {}; } catch (e) { payload = { raw: text }; }
        if (!res.ok) {
          return Promise.reject({
            ok: false, status: res.status, correlationId: correlationId,
            message: friendlyMessage(res.status, payload), payload: payload
          });
        }
        return { ok: true, status: res.status, correlationId: correlationId, data: payload };
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.ok === false) return Promise.reject(err);
      var isAbort = err && (err.name === "AbortError");
      return Promise.reject({
        ok: false, status: 0, correlationId: correlationId,
        message: isAbort ? "La solicitud tardó demasiado (timeout)." : friendlyMessage(0, {}),
        payload: err
      });
    });
  }

  function resourceUrl(doctype, name) {
    var u = "/api/resource/" + encodeURIComponent(doctype);
    if (name) u += "/" + encodeURIComponent(name);
    return u;
  }

  var api = {
    correlationLog: [],

    /** Usuario de la sesión actual (Guest si no autenticado). */
    whoami: function () {
      return request("GET", "/api/method/frappe.auth.get_logged_user").then(function (r) {
        return r.data && r.data.message;
      });
    },

    logout: function () {
      return request("POST", "/api/method/logout");
    },

    /** Lista documentos. filters: [["field","=","value"], ...] u objeto {field:"value"}. */
    list: function (doctype, opts) {
      opts = opts || {};
      var params = {
        fields: JSON.stringify(opts.fields || ["name"]),
        limit_page_length: opts.limit || 0,
        limit_start: opts.start || 0
      };
      if (opts.filters) params.filters = JSON.stringify(opts.filters);
      if (opts.orFilters) params.or_filters = JSON.stringify(opts.orFilters);
      if (opts.orderBy) params.order_by = opts.orderBy;
      return request("GET", resourceUrl(doctype) + buildQuery(params)).then(function (r) {
        return r.data.data || [];
      });
    },

    /** Cuenta documentos vía el reporte estándar de conteo. */
    count: function (doctype, filters) {
      var params = { doctype: doctype };
      if (filters) params.filters = JSON.stringify(filters);
      return request("GET", "/api/method/frappe.client.get_count" + buildQuery(params))
        .then(function (r) { return r.data.message || 0; })
        .catch(function () { return null; });
    },

    get: function (doctype, name) {
      return request("GET", resourceUrl(doctype, name)).then(function (r) { return r.data.data; });
    },

    create: function (doctype, payload) {
      return request("POST", resourceUrl(doctype), payload).then(function (r) { return r.data.data; });
    },

    update: function (doctype, name, payload) {
      return request("PUT", resourceUrl(doctype, name), payload).then(function (r) { return r.data.data; });
    },

    remove: function (doctype, name) {
      return request("DELETE", resourceUrl(doctype, name)).then(function (r) { return true; });
    },

    /** Invoca un método whitelisted (frappe.call equivalente). */
    call: function (dottedPath, params, method) {
      method = method || "POST";
      var url = "/api/method/" + dottedPath;
      if (method === "GET") url += buildQuery(params);
      return request(method, url, method === "GET" ? undefined : params).then(function (r) { return r.data.message; });
    },

    /** Sube un archivo como evidencia u otro adjunto. */
    uploadFile: function (file, opts) {
      opts = opts || {};
      var fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("is_private", opts.isPrivate === false ? "0" : "1");
      if (opts.doctype) fd.append("doctype", opts.doctype);
      if (opts.docname) fd.append("docname", opts.docname);
      if (opts.fieldname) fd.append("fieldname", opts.fieldname);
      return request("POST", "/api/method/upload_file", fd).then(function (r) { return r.data.message; });
    }
  };

  global.OS = global.OS || {};
  global.OS.api = api;
})(window);
