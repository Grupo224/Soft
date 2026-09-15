# DEPLOYMENT

Guía canónica para humanos y agentes. LivingOrg OS soporta dos modos oficiales sobre la misma base de código:

- **Bench / Custom App**: runtime nativo `livingorg_bridge` + sincronización REST.
- **API-First / OpenClaw**: sincronización sin SSH/Bench; runtime operativo separado cuando no existe Bridge.

Lee primero `deployment/manifest.json` y `deployment/README.md`.

## Variables comunes

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="TU_API_KEY"
export FRAPPE_API_SECRET="TU_API_SECRET"
```

Opcionales: `LIVINGORG_REPO_ROOT`, `FRAPPE_TIMEOUT_SECONDS`.

Nunca guardar secretos en Git ni en assets públicos.

# Modo A — Bench / Custom App

## Preflight

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
```

## Primera instalación

Sigue `deployment/bench/INSTALL.md` / `INSTALL.md`: backup → instalar `livingorg_bridge` en bench → migrate → dry-run → deployment con verificación del Bridge.

```bash
python scripts/deploy.py --mode install --require-bridge
python scripts/verify.py --require-bridge
```

## Actualización

1. Backup del sitio.
2. Actualiza el repo con `git pull --ff-only` en la rama estable elegida.
3. Si cambió `frappe_app/livingorg_bridge`, actualiza la copia instalada por Bench y ejecuta migrate/clear-cache.
4. Sincroniza schema + portal.
5. Ejecuta verify y smoke test.

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update --require-bridge
python scripts/verify.py --require-bridge
```

En producción, aplica el restart que corresponda a tu operación de Bench.

# Modo B — API-First / OpenClaw

Este modo NO requiere SSH ni Bench para sincronizar objetos administrados por LivingOrg.

## Preflight de sólo lectura

```bash
python scripts/preflight.py
```

Valida identidad y acceso básico sin escribir.

## Primera instalación

```bash
python scripts/validate_repo.py
python scripts/deploy_api.py --mode install --dry-run
python scripts/deploy_api.py --mode install
python scripts/verify.py
```

## Actualización

```bash
python scripts/validate_repo.py
python scripts/deploy_api.py --mode update --dry-run
python scripts/deploy_api.py --mode update
python scripts/verify.py
```

## Qué sincroniza el modo API

- módulo y roles OS;
- child tables y Custom DocTypes;
- overlays aditivos de schema;
- permisos canónicos serializados en los Custom DocTypes;
- assets HTML/CSS/JS;
- Web Page `/os`.

## Qué NO puede instalar por sí solo

REST no instala `frappe_app/livingorg_bridge` ni sus hooks Python. En concreto no crea por arte de API:

- `doc_events` Python;
- `permission_query_conditions` Python;
- `has_permission` Python;
- módulos importables bajo `livingorg_bridge.*`.

Las operaciones críticas requieren Bridge preexistente, OpenClaw Runtime externo o Server Script Runtime cuando el sitio ya permita Server Scripts. Consulta `deployment/api/API_MATRIX.md`.

`verify.py` debe reportar `DEGRADED` si schema/portal están correctos pero no existe runtime operativo confirmado. Eso no es un error de instalación del schema, pero sí una limitación funcional que debe mostrarse explícitamente.

# Fuente de verdad compartida

Ambos modos consumen los mismos recursos:

- `erpnext_setup/doctypes/` — schema;
- `scripts/permissions.py` — permisos canónicos;
- `scripts/schema_overlays.py` — overlays;
- `portal/` — frontend.

No crear árboles `api_doctypes/` o `bench_doctypes/` ni frontends duplicados.

# Seguridad / idempotencia

INSTALL y UPDATE son no destructivos por defecto. No usar `reinstall.py` ni `cleanup_data.py`; no DROP/TRUNCATE ni eliminar campos con datos automáticamente. Las migraciones destructivas futuras requieren versión explícita, backup verificado y autorización específica.

# Standalone legado

```bash
python scripts/deploy.py --mode standalone --dry-run
python scripts/deploy.py --mode standalone
```

No sustituye `/os` como aplicación operativa.

# Prueba operacional posterior

Cuando el runtime operativo esté disponible, verifica al menos:

- botón **Acciones ERPNext**;
- Run Test que crea Step Runs;
- Step Run asignado visible en Mi Trabajo;
- acción `LINK_DOCUMENT` o `CREATE_FROM_SOURCE`;
- `OS Document Link` creado;
- evidencia y aprobación bloqueadas en servidor cuando se exigen;
- aprobación por usuario/rol asignado;
- acceso al documento ERPNext desde el Run.

# Rollback

No uses `reinstall.py`. Sigue `ROLLBACK.md`: revert del commit y redeploy compatible. En modo Bench, migrate del Custom App cuando aplique. En modo API, no eliminar schema/datos automáticamente para igualar un commit antiguo.

# Estado de verificación

CI/dry-run cubren sintaxis y consistencia estática. La instalación en un ERPNext específico, sus impuestos, cuentas, permisos, workflows y customizations sigue marcada **REQUIERE VALIDACIÓN EN ERPNext** hasta ejecutar VERIFY/smoke test en ese sitio.
