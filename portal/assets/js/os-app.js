/*! Punto de entrada. Se carga al final (todas las páginas ya están registradas en OS.router). */
(function () {
  "use strict";
  function start() { window.OS.boot("os-app-root"); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
