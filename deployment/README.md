# Deployment dual — LivingOrg OS

LivingOrg OS soporta dos rutas oficiales de despliegue sobre la misma base de código, schema y frontend.

## Principio

No existen ediciones separadas del producto. `erpnext_setup/doctypes/` y `portal/` son la fuente de verdad compartida. La diferencia es únicamente cómo se instala y dónde vive la lógica operativa server-side.

## Modo A — Bench / Custom App

Usa `frappe_app/livingorg_bridge/` como runtime nativo de Frappe. Requiere acceso al bench para instalar/actualizar el Custom App y ejecutar migrate/clear-cache. Es el modo con integración nativa completa: hooks de validación, permission query conditions, has_permission, runs, step runs, evidencia, aprobaciones y acciones ERPNext.

Consulta `deployment/bench/INSTALL.md`.

## Modo B — API-First / OpenClaw

No requiere SSH ni Bench para sincronizar schema, roles, permisos canónicos, assets y `/os`. Usa exclusivamente HTTPS + Frappe REST API con un usuario técnico.

El modo API NO debe fingir que los hooks Python del Custom App existen. Las capacidades operativas que dependen de `livingorg_bridge` requieren uno de estos runtimes:

1. runtime externo controlado por OpenClaw, o
2. Server Scripts/API Scripts instalables por API cuando el sitio ya permita Server Scripts.

Si ninguno está disponible, el despliegue API puede instalar y administrar schema + portal, pero debe reportar las capacidades operativas faltantes en VERIFY.

Consulta `deployment/api/INSTALL.md` y `deployment/api/API_MATRIX.md`.

## Operaciones estándar

Ambos modos deben exponer conceptualmente cuatro operaciones:

- `INSTALL`: crea lo faltante y actualiza definiciones compatibles; nunca reinstala el sitio.
- `UPDATE`: sincroniza diferencias de forma idempotente.
- `VERIFY`: sólo lectura; valida identidad, schema, roles, assets, Web Page y runtime.
- `ROLLBACK`: revierte código/configuración de forma controlada; nunca elimina datos productivos automáticamente.

## Seguridad

- Secrets exclusivamente en variables de entorno o secret store del agente.
- Nunca incrustar API Secret en HTML/JS.
- `SAFE_MODE` es la política por defecto: no borrar DocTypes, campos, datos ni archivos de negocio.
- El navegador no es frontera de autorización.
- El modo API no debe sustituir validaciones server-side por validaciones sólo frontend.

## Para agentes

Lee en este orden:

1. `AGENTS.md`
2. `deployment/manifest.json`
3. `deployment/openclaw/AGENT.md`
4. `docs/INSTALACION_ERPNext_VIRGEN.md` (**el deber ser**: fases con candado, checklist de cero errores, ruta incremental por entregas)
5. la guía del modo solicitado
6. `SECURITY.md`
7. `ROLLBACK.md`
