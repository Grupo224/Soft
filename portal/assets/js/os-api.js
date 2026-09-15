/*!
 * OS API Adapter — única puerta de entrada a Frappe/ERPNext REST API.
 * - Sesión same-origin + CSRF.
 * - Timeout por AbortController.
 * - Normalización de errores HTTP y excepciones Frappe dentro de HTTP 200.
 * - Correlation id y logging técnico acotado, sin secretos ni payloads sensibles.
 */
(function (global) {
  "use strict";

  var DEFAULT_TIMEOUT = 20000;
  var MAX_LOG_ENTRIES = 100;

  function uuid() {
    return "os-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  var csrfToken = null;
  function isValidCsrf(t) {
    return !!(t && t !== "None" && t !== "none" && t !== "null" && t !== "undefined" && t !== "{{ csrf_token }}");
  }
  function getCsrfToken() {
    if (isValidCsrf(csrfToken)) return csrfToken;
    try {
      if (global.frappe) {
        if (isValidCsrf(global.frappe.csrf_token)) { csrfToken = global.frappe.csrf_token; return csrfToken; }
        if (global.frappe.boot && isValidCsrf(global.frappe.boot.csrf_token)) { csrfToken = global.frappe.boot.csrf_token; return csrfToken; }
      }
    } catch (e) {
      // Frappe puede no estar expuesto en Website; se usan los fallbacks siguientes.
    }
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && isValidCsrf(meta.getAttribute("content"))) { csrfToken = meta.getAttribute("content"); return csrfToken; }
    if (isValidCsrf(global.csrf_token)) { csrfToken = global.csrf_token; return csrfToken; }
    return null;
  }
  // La Web Page /os sirve frappe.csrf_token = "None": se obtiene el CSRF real de la sesión.
  function fetchCsrfToken() {
    return fetch("/api/method/livingorg_api_csrf", { credentials: "same-origin", headers: { "Accept": "application/json" } })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        try {
          var payload = JSON.parse(text);
          var t = payload && payload.message;
          if (isValidCsrf(t)) csrfToken = t;
        } catch (e) {}
        return csrfToken;
      })
      .catch(function () { return null; });
  }

  function buildQuery(params) {
    var qs = [];
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null || value === "") return;
      if (typeof value !== "string") value = JSON.stringify(value);
      qs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    return qs.length ? "?" + qs.join("&") : "";
  }

  function parseServerMessage(payload) {
    if (!payload || !payload._server_messages) return null;
    try {
      var messages = JSON.parse(payload._server_messages);
      if (!messages.length) return null;
      var first = typeof messages[0] === "string" ? JSON.parse(messages[0]) : messages[0];
      return first && first.message ? String(first.message) : null;
    } catch (e) {
      return null;
    }
  }

  // Frappe valida los campos Link contra la base: un valor que no existe devuelve
  // "No se pudo encontrar Compañía: 1, Owner User: 1" (HTTP 417). Se traduce a un
  // mensaje accionable en lugar del texto crudo del motor.
  function humanizeLinkValidation(msg) {
    var m = /(?:No se pudo encontrar|Could not find)\s+(.+)/i.exec(msg || "");
    if (!m) return null;
    var parts = m[1].split(",").map(function (piece) {
      var kv = /^\s*(.+?):\s*(.+?)\s*$/.exec(piece);
      return kv ? "\u00ab" + kv[2] + "\u00bb no existe en " + kv[1] : null;
    }).filter(Boolean);
    if (!parts.length) return null;
    return "Valor no v\u00e1lido: " + parts.join("; ") + ". Elige un valor de la lista de sugerencias del campo.";
  }

  function friendlyMessage(status, payload) {
    var serverMessage = parseServerMessage(payload);
    if (serverMessage) return humanizeLinkValidation(serverMessage) || serverMessage;
    if (payload && payload.message && typeof payload.message === "string") return payload.message;
    if (payload && payload.exc_type) return payload.exc_type + ": revisa el identificador de correlación.";
    switch (status) {
      case 401: return "Tu sesión expiró o no has iniciado sesión.";
      case 403: return "No tienes permiso para esta acción u objeto.";
      case 404: return "El recurso solicitado no existe.";
      case 409: return "El registro fue modificado por otra persona. Recarga antes de guardar.";
      case 417: return "ERPNext rechazó la operación por una validación del servidor.";
      case 422: return "Los datos enviados no pasaron validación.";
      case 429: return "Hay demasiadas solicitudes. Intenta de nuevo en unos segundos.";
      case 500: case 502: case 503: case 504: return "ERPNext no pudo completar la operación. Intenta nuevamente.";
      case 0: return "No hay conexión con el servidor o la solicitud agotó el tiempo de espera.";
      default: return "Error inesperado del servidor (" + status + ").";
    }
  }

  function parsePayload(text) {
    if (!text) return {};
    try { return JSON.parse(text); }
    catch (e) { return { raw: text.slice(0, 1000) }; }
  }

  function isFrappeException(payload) {
    return !!(payload && (payload.exc || payload.exception));
  }

  var api = {
    correlationLog: []
  };

  function logRequest(entry) {
    api.correlationLog.push(entry);
    if (api.correlationLog.length > MAX_LOG_ENTRIES) api.correlationLog.shift();
  }

  function makeError(status, correlationId, payload, fallbackMessage) {
    return {
      ok: false,
      status: status,
      correlationId: correlationId,
      message: fallbackMessage || friendlyMessage(status, payload),
      payload: payload
    };
  }

  function request(method, url, body, opts) {
    opts = opts || {};
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutMs = opts.timeout || DEFAULT_TIMEOUT;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    var correlationId = uuid();
    var startedAt = Date.now();

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
      fetchOpts.body = body;
    } else if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json; charset=utf-8";
      fetchOpts.body = JSON.stringify(body);
    }

    return fetch(url, fetchOpts).then(function (response) {
      return response.text().then(function (text) {
        if (timer) clearTimeout(timer);
        var payload = parsePayload(text);
        var durationMs = Date.now() - startedAt;
        logRequest({ id: correlationId, method: method, url: url.split("?")[0], status: response.status, durationMs: durationMs, at: new Date().toISOString() });

        if (!response.ok || isFrappeException(payload)) {
          var status = response.ok && isFrappeException(payload) ? 500 : response.status;
          if (status === 401 && global.dispatchEvent) {
            global.dispatchEvent(new CustomEvent("os:session-expired", { detail: { correlationId: correlationId } }));
          }
          return Promise.reject(makeError(status, correlationId, payload));
        }
        return { ok: true, status: response.status, correlationId: correlationId, data: payload };
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.ok === false) return Promise.reject(err);
      var isAbort = err && err.name === "AbortError";
      var normalized = makeError(
        0,
        correlationId,
        null,
        isAbort ? "La solicitud tardó demasiado (timeout)." : friendlyMessage(0, {})
      );
      logRequest({ id: correlationId, method: method, url: url.split("?")[0], status: 0, durationMs: Date.now() - startedAt, at: new Date().toISOString() });
      return Promise.reject(normalized);
    });
  }

  function resourceUrl(doctype, name) {
    var url = "/api/resource/" + encodeURIComponent(doctype);
    if (name) url += "/" + encodeURIComponent(name);
    return url;
  }

  api.request = request;
  api.whoami = function () {
    return request("GET", "/api/method/frappe.auth.get_logged_user").then(function (r) {
      return r.data && r.data.message;
    });
  };
  api.logout = function () { return request("POST", "/api/method/logout"); };
  api.list = function (doctype, opts) {
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
  };
  api.count = function (doctype, filters) {
    var params = { doctype: doctype };
    if (filters) params.filters = JSON.stringify(filters);
    return request("GET", "/api/method/frappe.client.get_count" + buildQuery(params))
      .then(function (r) { return r.data.message || 0; });
  };
  api.get = function (doctype, name) {
    return request("GET", resourceUrl(doctype, name)).then(function (r) { return r.data.data; });
  };
  api.create = function (doctype, payload) {
    return request("POST", resourceUrl(doctype), payload).then(function (r) { return r.data.data; });
  };
  api.update = function (doctype, name, payload) {
    return request("PUT", resourceUrl(doctype, name), payload).then(function (r) { return r.data.data; });
  };
  api.remove = function (doctype, name) {
    return request("DELETE", resourceUrl(doctype, name)).then(function () { return true; });
  };
  api.call = function (dottedPath, params, method) {
    method = method || "POST";
    var url = "/api/method/" + dottedPath;
    if (method === "GET") url += buildQuery(params);
    return request(method, url, method === "GET" ? undefined : params).then(function (r) { return r.data.message; });
  };
  api.uploadFile = function (file, opts) {
    opts = opts || {};
    var fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("is_private", opts.isPrivate === false ? "0" : "1");
    if (opts.doctype) fd.append("doctype", opts.doctype);
    if (opts.docname) fd.append("docname", opts.docname);
    if (opts.fieldname) fd.append("fieldname", opts.fieldname);
    return request("POST", "/api/method/upload_file", fd, { timeout: opts.timeout || 60000 })
      .then(function (r) { return r.data.message; });
  };

  global.OS = global.OS || {};
  global.OS.api = api;

  // Precarga el CSRF real (la Web Page no lo expone válido) para escrituras posteriores.
  fetchCsrfToken();
})(window);
