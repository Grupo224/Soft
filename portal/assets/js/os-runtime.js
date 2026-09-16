/*!
 * LivingOrg OS — Runtime Adapter
 *
 * Permite que el frontend operativo conserve una sola base de código mientras
 * selecciona el runtime server-side disponible. No contiene secretos y sólo
 * remapea llamadas same-origin de OS.api.call().
 *
 * Modos:
 *   auto          -> intenta livingorg_bridge; si no existe, intenta API Server Scripts.
 *   bridge        -> exige livingorg_bridge.*
 *   server-script -> usa métodos livingorg_api_*.
 *   custom        -> usa LIVINGORG_RUNTIME_CONFIG.methods (same-origin).
 */
(function (global) {
  "use strict";

  var OS = global.OS = global.OS || {};
  if (!OS.api || typeof OS.api.call !== "function") return;

  var originalCall = OS.api.call.bind(OS.api);
  var config = global.LIVINGORG_RUNTIME_CONFIG || {};
  var requestedMode = String(config.mode || "auto").toLowerCase();
  var selectedMode = requestedMode === "auto" ? null : requestedMode;

  var serverScriptMap = {
    "livingorg_bridge.status.capabilities": "livingorg_api_capabilities",
    "livingorg_bridge.api.start_run": "livingorg_api_start_run",
    "livingorg_bridge.api.start_step": "livingorg_api_start_step",
    "livingorg_bridge.api.complete_step": "livingorg_api_complete_step",
    "livingorg_bridge.api.execute_action": "livingorg_api_execute_action",
    "livingorg_bridge.api.get_step_actions": "livingorg_api_get_step_actions",
    "livingorg_bridge.approvals.decide": "livingorg_api_decide_approval"
  };

  function isManagedMethod(path) {
    return Object.prototype.hasOwnProperty.call(serverScriptMap, path);
  }

  function customMap(path) {
    var methods = config.methods || {};
    return methods[path] || path;
  }

  function mappedPath(path, mode) {
    if (mode === "server-script") return serverScriptMap[path] || path;
    if (mode === "custom") return customMap(path);
    return path;
  }

  function absenceLooksReal(err) {
    if (!err) return false;
    if (err.status === 404) return true;
    var text = String(err.message || "") + " " + JSON.stringify(err.payload || {});
    return /ModuleNotFoundError|No module named|Failed to get method|has no attribute|method[^\n]{0,40}not found|does not exist/i.test(text);
  }

  function callInMode(mode, path, params, method) {
    return originalCall(mappedPath(path, mode), params, method);
  }

  OS.api.call = function (path, params, method) {
    if (!isManagedMethod(path)) return originalCall(path, params, method);

    if (selectedMode) {
      return callInMode(selectedMode, path, params, method);
    }

    // auto: Bridge es preferido porque ofrece hooks/permisos nativos completos.
    return callInMode("bridge", path, params, method).then(function (result) {
      selectedMode = "bridge";
      return result;
    }).catch(function (bridgeErr) {
      if (!absenceLooksReal(bridgeErr)) throw bridgeErr;
      return callInMode("server-script", path, params, method).then(function (result) {
        selectedMode = "server-script";
        return result;
      });
    });
  };

  OS.runtime = {
    requestedMode: requestedMode,
    getMode: function () { return selectedMode || "auto"; },
    getMethodMap: function () {
      return Object.assign({}, serverScriptMap);
    },
    resetAutoDetection: function () {
      if (requestedMode === "auto") selectedMode = null;
    }
  };
})(window);
