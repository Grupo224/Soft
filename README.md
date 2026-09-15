# LivingOrg OS

LivingOrg OS es una capa operativa sobre ERPNext/Frappe para modelar estructura, procesos, SOPs y **ejecutar trabajo real vinculado a documentos ERPNext**, con evidencia, aprobaciones, agentes, conocimiento y KPIs sin modificar el core.

## Estado de versiones

### CURRENT STABLE — Organigrama Vivo 2.0

- Rama recomendada: `release/organigrama-v2.0`
- Ruta: `/os#/org`
- Frontend activo: `portal/assets/js/pages/os-page-org-v2.js`
- Arquitectura: `docs/ORGANIGRAMA_V2.md`
- Migración: `docs/ORGANIGRAMA_MIGRATION_2.0.md`
- Pruebas: `docs/ORGANIGRAMA_TESTING_2.0.md`

### PREVIOUS STABLE — Organigrama Vivo 1.x

- Rama preservada: `archive/organigrama-v1-stable`
- Commit preservado: `a2b7b88ae3dbbf38b1c93a466c9419e7977af19f`
- Frontend histórico: `portal/assets/js/pages/os-page-org.js`

**No crear archivos `_old`, `_backup`, `_final2`.** Git mantiene el histórico. En 2.0 el archivo 1.x incluso permanece sin reescribir; `os-page-org-v2.js` se carga antes y registra primero `/org`.

## Qué cambia en Organigrama Vivo 2.0

La experiencia primaria ahora sigue:

```text
Empresa
  └── Departamento
        ├── Subdepartamento
        └── Puesto
              ├── Persona(s)
              ├── Agente IA
              ├── KPIs
              ├── Procesos
              ├── SOPs
              └── Documentos
```

`Designation = Puesto` y `Employee = Persona`. Una persona puede cambiar sin perder la ficha del puesto.

Se reparó la inconsistencia de nombres: `title` es el nombre visual canónico y la entidad ERPNext vinculada se muestra por separado. No se borran ni migran automáticamente relaciones históricas.

## Componentes

- `portal/`: portal principal `/os`, HTML/CSS/JavaScript Vanilla conectado por sesión same-origin.
- `erpnext_setup/doctypes/`: Custom DocTypes `OS *`, incluida la configuración `OS Process Action` y la trazabilidad `OS Document Link`.
- `frappe_app/livingorg_bridge/`: Custom Frappe App server-side para runs, transiciones, permisos documentales, aprobaciones, acciones ERPNext y validación semántica de la jerarquía 2.0.
- `scripts/`: configuración, permisos canónicos, overlays de schema, cliente REST, validación y despliegue reproducible.
- `deployment/`: contrato oficial de despliegue dual Bench/API, manifest y guías para OpenClaw.
- `livingorg-os/`, `livingorg-os-v2/`, `livingorg-flow-studio-v3/`: generaciones standalone/prototipos visuales conservadas por compatibilidad y referencia UX.
- scripts raíz (`install.py`, `update.py`, `update_v2.py`, `deploy_standalone.py`): entrypoints legacy conservados; delegan en `scripts/deploy.py`.

## Dos modos oficiales de despliegue

LivingOrg mantiene **una sola base de código, un solo schema y un solo frontend activo**. La instalación puede hacerse de dos formas:

### A. Bench / Custom App

Modo nativo completo. Instala `livingorg_bridge` mediante Bench y después sincroniza schema/portal vía REST. Mantiene hooks Python, permission query conditions, has_permission, lógica operativa server-side y validación server-side de `OS Org Relation`.

Guía: `deployment/bench/INSTALL.md`.

### B. API-First / OpenClaw

Modo sin SSH y sin Bench para sincronizar Module Def, roles, Custom DocTypes, permisos canónicos, assets y `/os` mediante Frappe REST API.

Las capacidades que normalmente viven en `livingorg_bridge` requieren un runtime server-side real: Bridge preexistente, OpenClaw Runtime externo o Server Script Runtime cuando el sitio ya tenga Server Scripts habilitados. Si no existe runtime, VERIFY lo reporta como `DEGRADED`; nunca se simula seguridad server-side en JavaScript.

Para Organigrama 2.0, la UI API-only evita jerarquías inválidas, pero la validación server-side equivalente sólo existe si hay Bridge/runtime compatible. Esto está declarado en `deployment/manifest.json`.

Guía: `deployment/api/INSTALL.md`.

## Qué significa “operativo”

Un paso puede declarar discretamente una acción como:

```text
Crear factura
ERPNext · CREATE_FROM_SOURCE
Sales Order → Sales Invoice
```

En modo Bench, LivingOrg usa el Bridge, respeta permisos nativos de ERPNext y registra el documento concreto en `OS Document Link`. En modo API, una operación equivalente sólo se considera disponible cuando existe un runtime server-side verificado.

## Regla de arquitectura

ERPNext/Frappe es la fuente de verdad. Los canvases y prototipos visuales no son una segunda base de datos. El frontend no es frontera de autorización.

`erpnext_setup/doctypes/` y `portal/` son fuente de verdad compartida para ambos modos de deployment. No mantener copias separadas por modo.

## Inicio rápido — Bench

1. Lee `SECURITY.md` y `docs/ORGANIGRAMA_MIGRATION_2.0.md`.
2. Haz backup del sitio.
3. Instala/actualiza `frappe_app/livingorg_bridge` en el bench.
4. Instala tooling: `python -m pip install -r requirements-deploy.txt`.
5. Exporta `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` fuera de Git.
6. Valida: `python scripts/validate_repo.py && python scripts/validate_org_v2.py`.
7. Dry-run: `python scripts/deploy.py --mode update --dry-run --require-bridge`.
8. Despliega: `python scripts/deploy.py --mode update --require-bridge`.
9. Verifica: `python scripts/verify.py --require-bridge`.
10. Ejecuta `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.

## Inicio rápido — API / OpenClaw

1. Usa la rama `release/organigrama-v2.0` y lee `deployment/openclaw/AGENT.md`.
2. Configura `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` únicamente en el secret store/entorno del agente.
3. Ejecuta `python scripts/preflight.py`.
4. Valida: `python scripts/validate_repo.py && python scripts/validate_org_v2.py`.
5. Dry-run: `python scripts/deploy_api.py --mode update --dry-run`.
6. Despliega: `python scripts/deploy_api.py --mode update`.
7. Verifica: `python scripts/verify.py`.
8. Ejecuta `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.
9. Revisa `deployment/api/API_MATRIX.md` para conocer las capacidades reales del runtime.

## Acciones ERPNext soportadas por el Bridge

`OPEN_DOCUMENT`, `CREATE_DOCUMENT`, `CREATE_FROM_SOURCE`, `UPDATE_DOCUMENT`, `SUBMIT_DOCUMENT` y `LINK_DOCUMENT`.

Los flujos estándar Quotation/Sales Order/Delivery Note/Sales Invoice/Purchase Order/Purchase Receipt/Purchase Invoice usan mappers nativos de ERPNext cuando el par está soportado. No se permiten métodos Python arbitrarios configurados desde el navegador.

## Seguridad

Nunca publiques API keys, API secrets, cookies, contraseñas ni tokens. El portal usa sesión same-origin. Los permisos de los DocTypes se normalizan desde `scripts/permissions.py`; el Bridge añade validación server-side y los documentos de ERPNext conservan sus permisos nativos.

El usuario técnico/API pertenece al deployment/runtime, nunca al JavaScript del navegador. INSTALL y UPDATE son no destructivos por defecto.

> Versiones anteriores contenían credenciales hardcodeadas. Deben considerarse comprometidas y rotarse aunque ya no aparezcan en el HEAD actual. Ver `SECURITY.md`.

## Documentación

- `docs/ORGANIGRAMA_V2.md`: arquitectura de Organigrama Vivo 2.0.
- `docs/ORGANIGRAMA_MIGRATION_2.0.md`: migración aditiva y rollback lógico.
- `docs/ORGANIGRAMA_TESTING_2.0.md`: pruebas obligatorias.
- `deployment/README.md`: arquitectura dual.
- `deployment/manifest.json`: contrato machine-readable y versión vigente.
- `deployment/bench/INSTALL.md`: instalación Bench/Custom App.
- `deployment/api/INSTALL.md`: instalación API-first.
- `deployment/api/API_MATRIX.md`: matriz de capacidades.
- `deployment/openclaw/AGENT.md`: reglas para OpenClaw y agentes.
- `INSTALL.md`: instalación operativa completa legacy/canónica Bench.
- `docs/OPERATIONAL_ACTIONS.md`: acciones, DocTypes y trazabilidad.
- `ARCHITECTURE.md`: arquitectura y fronteras generales.
- `AGENTS.md`: instrucciones para agentes/ingenieros.
- `DEPLOYMENT.md`: despliegue y actualización.
- `ROLLBACK.md`: reversión.
- `SECURITY.md`: seguridad.
- `TROUBLESHOOTING.md`: diagnóstico.
- `CHANGELOG.md`: historial.
