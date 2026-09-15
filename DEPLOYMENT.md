# DEPLOYMENT

Guía canónica para humanos y agentes. LivingOrg OS soporta dos modos oficiales sobre la misma base de código:

- **Bench / Custom App**: runtime nativo `livingorg_bridge` + sincronización REST.
- **API-First / OpenClaw**: sincronización sin SSH/Bench; runtime operativo separado cuando no existe Bridge.

## Versión vigente

```text
CURRENT STABLE CODE: Organigrama Vivo 2.0.0
RECOMMENDED BRANCH:  release/organigrama-v2.0
PREVIOUS STABLE:     archive/organigrama-v1-stable
PREVIOUS COMMIT:     a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
PORTAL:              /os#/org
```

Lee primero `deployment/manifest.json`, `docs/ORGANIGRAMA_MIGRATION_2.0.md` y `deployment/README.md`.

**Sitio ERPNext nuevo (virgen):** sigue `docs/INSTALACION_ERPNext_VIRGEN.md` — fases con candado, checklist de cero errores y ruta incremental por entregas. Es el "deber ser" del despliegue.

## Variables comunes

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="TU_API_KEY"
export FRAPPE_API_SECRET="TU_API_SECRET"
```

Opcionales: `LIVINGORG_REPO_ROOT`, `FRAPPE_TIMEOUT_SECONDS`.

Nunca guardar secretos en Git ni en assets públicos.

## Preflight común para 2.0

Antes de escribir en ERPNext:

```bash
git checkout release/organigrama-v2.0
python scripts/validate_repo.py
python scripts/validate_org_v2.py
```

`validate_org_v2.py` debe terminar en `PASS org-v2` antes de continuar.

# Modo A — Bench / Custom App

El modo recomendado cuando se necesita enforcement server-side completo, incluida la validación semántica de `OS Org Relation`.

## Primera instalación

Sigue `deployment/bench/INSTALL.md` / `INSTALL.md`: backup → instalar `livingorg_bridge` en bench → migrate → dry-run → deployment con verificación del Bridge.

```bash
python scripts/deploy.py --mode install --dry-run --require-bridge
python scripts/deploy.py --mode install --require-bridge
python scripts/verify.py --require-bridge
```

## Actualización 1.x → 2.0

1. Backup del sitio.
2. Confirmar que Git está en `release/organigrama-v2.0`.
3. Ejecutar `python scripts/validate_repo.py`.
4. Ejecutar `python scripts/validate_org_v2.py`.
5. Actualizar `frappe_app/livingorg_bridge` en Bench porque 2.0 añade validación server-side de `OS Org Relation`.
6. Ejecutar el migrate/clear-cache requerido por la operación de Bench.
7. Dry-run del schema/portal.
8. Desplegar schema + assets + Web Page.
9. VERIFY.
10. Ejecutar `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.

```bash
python scripts/deploy.py --mode update --dry-run --require-bridge
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

## Primera instalación 2.0

```bash
python scripts/validate_repo.py
python scripts/validate_org_v2.py
python scripts/deploy_api.py --mode install --dry-run
python scripts/deploy_api.py --mode install
python scripts/verify.py
```

## Actualización 1.x → 2.0

```bash
python scripts/preflight.py
python scripts/validate_repo.py
python scripts/validate_org_v2.py
python scripts/deploy_api.py --mode update --dry-run
python scripts/deploy_api.py --mode update
python scripts/verify.py
```

Después ejecuta el checklist E2E de `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.

## Qué sincroniza 2.0 por API

- módulo y roles OS;
- child tables y Custom DocTypes;
- campos aditivos de `OS Role Card`, `OS KPI Definition` y `OS SOP`;
- overlays aditivos de schema;
- permisos canónicos serializados en los Custom DocTypes;
- `os-org-v2.css`;
- `os-page-org-v2.js` y el frontend legacy preservado;
- demás assets HTML/CSS/JS;
- Web Page `/os` con v2 cargada antes de v1.

## Qué NO puede instalar por sí solo

REST no instala `frappe_app/livingorg_bridge` ni sus hooks Python. En concreto no crea por arte de API:

- `doc_events` Python;
- `permission_query_conditions` Python;
- `has_permission` Python;
- módulos importables bajo `livingorg_bridge.*`.

Por eso, en API-only puro, las reglas de jerarquía 2.0 se previenen desde el portal, pero no deben presentarse como enforcement server-side frente a un cliente REST arbitrario. Para esa frontera se requiere Bridge preexistente u otro runtime compatible.

Consulta `deployment/api/API_MATRIX.md`.

`verify.py` debe reportar `DEGRADED` si schema/portal están correctos pero no existe runtime operativo confirmado. Eso no es un error de instalación del schema, pero sí una limitación funcional que debe mostrarse explícitamente.

# Orden de assets crítico de Organigrama 2.0

En `portal/pages/os-web-page.html` debe mantenerse:

```text
os-page-org-v2.js
os-page-org.js
```

En ese orden. El router resuelve la primera ruta `/org` registrada. Invertirlo reactiva 1.x.

# Fuente de verdad compartida

Ambos modos consumen los mismos recursos:

- `erpnext_setup/doctypes/` — schema;
- `scripts/permissions.py` — permisos canónicos;
- `scripts/schema_overlays.py` — overlays;
- `portal/` — frontend;
- `deployment/manifest.json` — versión y contrato machine-readable.

No crear árboles `api_doctypes/` o `bench_doctypes/` ni frontends duplicados.

# Seguridad / idempotencia

INSTALL y UPDATE son no destructivos por defecto. No usar `reinstall.py` ni `cleanup_data.py`; no DROP/TRUNCATE ni eliminar campos con datos automáticamente. La migración 2.0 no transforma ni borra relaciones históricas de Organigrama.

# Standalone legado

```bash
python scripts/deploy.py --mode standalone --dry-run
python scripts/deploy.py --mode standalone
```

No sustituye `/os` como aplicación operativa.

# Prueba operacional posterior

Además del checklist de Organigrama 2.0, cuando el runtime operativo esté disponible verifica al menos:

- botón **Acciones ERPNext**;
- Run Test que crea Step Runs;
- Step Run asignado visible en Mi Trabajo;
- acción `LINK_DOCUMENT` o `CREATE_FROM_SOURCE`;
- `OS Document Link` creado;
- evidencia y aprobación bloqueadas en servidor cuando se exigen;
- aprobación por usuario/rol asignado;
- acceso al documento ERPNext desde el Run.

# Rollback

Para Organigrama 2.0, la referencia exacta es:

```text
archive/organigrama-v1-stable
a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
```

No uses `reinstall.py`. Sigue `ROLLBACK.md` y `docs/ORGANIGRAMA_MIGRATION_2.0.md`. No elimines los campos nuevos durante rollback: un frontend 1.x puede ignorarlos y así no pierdes información capturada en 2.0.

# Estado de verificación

CI/dry-run cubren sintaxis, estructura y contrato estático. Hasta ejecutar el checklist E2E sobre un ERPNext de staging, la clasificación máxima es **READY FOR STAGING**. `READY FOR PRODUCTION` exige las pruebas definidas en `docs/ORGANIGRAMA_TESTING_2.0.md`.
