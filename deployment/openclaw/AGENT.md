# OpenClaw Deployment Agent Contract

Este archivo define cómo debe actuar OpenClaw al instalar, actualizar o verificar LivingOrg OS.

## Objetivo

Permitir que el usuario indique solamente repositorio, rama, ERPNext y modo de despliegue sin que el agente improvise arquitectura ni operaciones destructivas.

## Orden de lectura obligatorio

1. `/AGENTS.md`
2. `/deployment/manifest.json`
3. `/SECURITY.md`
4. `/deployment/README.md`
5. guía específica del modo solicitado
6. `/ROLLBACK.md`

## Modos

### `bench`

Usar cuando el usuario autoriza SSH/Bench. Instalar/verificar `livingorg_bridge` y después sincronizar schema/portal.

### `api`

Usar cuando el usuario prohíbe SSH/Bench o solicita API-only. No intentar instalar un Custom App Python. No intentar editar `site_config.json`. Sincronizar mediante Frappe REST API.

### `auto`

Sólo usar si el usuario no especificó modo. Detectar primero `livingorg_bridge.status.capabilities`. Si está disponible y el usuario permite esa arquitectura, usar Bridge. Si no está disponible, seleccionar API y reportar la capacidad operativa real.

## Reglas no negociables

- Nunca borrar archivos o datos para "limpiar" una instalación.
- Nunca ejecutar `reinstall.py` o `cleanup_data.py` durante INSTALL/UPDATE.
- Nunca almacenar API Secret en Git ni en assets públicos.
- Nunca enviar el API Secret al navegador.
- Nunca confiar en controles frontend como autorización.
- No crear una segunda copia de los DocTypes para API.
- No crear un segundo frontend para API.
- `erpnext_setup/doctypes/` y `portal/` son fuente de verdad compartida.
- Toda operación debe poder reintentarse sin duplicar objetos.

## Flujo API recomendado

1. Validar variables/secretos.
2. `GET /api/method/frappe.auth.get_logged_user`.
3. Ejecutar preflight de lectura.
4. Ejecutar validación local del repo.
5. Dry-run.
6. Crear/actualizar Module Def y Roles.
7. Crear/actualizar child DocTypes y DocTypes padre en el orden de `scripts/deploy.py`.
8. Aplicar overlays/permisos canónicos.
9. Subir assets del portal.
10. Crear/actualizar Web Page `/os`.
11. Ejecutar VERIFY.
12. Emitir resumen de cambios y capacidades faltantes.

## Política de escritura

INSTALL y UPDATE permiten `POST`/`PUT` de objetos administrados por LivingOrg. `DELETE` no forma parte del flujo normal. Si una versión futura requiere una operación destructiva debe existir migración explícita versionada, backup comprobado y autorización específica del usuario.

## Runtime operativo en modo API

No reescribir la seguridad del Bridge como JavaScript. Las funciones `start_run`, `start_step`, `complete_step`, `execute_action`, approvals y evidence enforcement requieren runtime server-side.

Opciones válidas:

- `livingorg_bridge` ya instalado (entonces no es API-only puro, aunque el schema/portal se actualicen por API);
- runtime externo OpenClaw con allowlist y auditoría;
- Server Script Runtime cuando Server Scripts ya estén habilitados.

Si ninguno existe, marcar instalación `DEGRADED`, conservar acceso administrativo al modelado y deshabilitar acciones operativas que requieran backend.

## Resultado final obligatorio

Reportar siempre:

- repositorio/rama/commit usados;
- modo efectivo;
- ERPNext base URL sin secretos;
- objetos creados/actualizados/verificados;
- estado `FULL`, `API_RUNTIME`, `DEGRADED` o `FAILED`;
- fallas o capacidades pendientes;
- cero secretos en salida/logs.
