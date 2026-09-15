# LivingOrg OS

LivingOrg OS es una capa operativa sobre ERPNext/Frappe para modelar estructura, procesos, SOPs y **ejecutar trabajo real vinculado a documentos ERPNext**, con evidencia, aprobaciones, agentes, conocimiento y KPIs sin modificar el core.

## Componentes

- `portal/`: portal principal `/os`, HTML/CSS/JavaScript Vanilla conectado por sesión same-origin.
- `erpnext_setup/doctypes/`: Custom DocTypes `OS *`, incluida la configuración `OS Process Action` y la trazabilidad `OS Document Link`.
- `frappe_app/livingorg_bridge/`: Custom Frappe App server-side para runs, transiciones, permisos documentales, aprobaciones y acciones ERPNext.
- `scripts/`: configuración, permisos canónicos, overlays de schema, cliente REST, validación y despliegue reproducible.
- `deployment/`: contrato oficial de despliegue dual Bench/API, manifest y guías para OpenClaw.
- `livingorg-os/`, `livingorg-os-v2/`, `livingorg-flow-studio-v3/`: generaciones standalone/prototipos visuales conservadas por compatibilidad y referencia UX.
- scripts raíz (`install.py`, `update.py`, `update_v2.py`, `deploy_standalone.py`): entrypoints legacy conservados; delegan en `scripts/deploy.py`.

## Dos modos oficiales de despliegue

LivingOrg mantiene **una sola base de código, un solo schema y un solo frontend**. La instalación puede hacerse de dos formas:

### A. Bench / Custom App

Modo nativo completo. Instala `livingorg_bridge` mediante Bench y después sincroniza schema/portal vía REST. Mantiene hooks Python, permission query conditions, has_permission y toda la lógica operativa server-side.

Guía: `deployment/bench/INSTALL.md`.

### B. API-First / OpenClaw

Modo sin SSH y sin Bench para sincronizar Module Def, roles, Custom DocTypes, permisos canónicos, assets y `/os` mediante Frappe REST API.

Las capacidades que normalmente viven en `livingorg_bridge` requieren un runtime server-side real: Bridge preexistente, OpenClaw Runtime externo o Server Script Runtime cuando el sitio ya tenga Server Scripts habilitados. Si no existe runtime, VERIFY lo reporta como `DEGRADED`; nunca se simula seguridad server-side en JavaScript.

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

1. Lee `SECURITY.md`.
2. Haz backup del sitio.
3. Instala `frappe_app/livingorg_bridge` en el bench (`bench get-app ...` + `install-app`).
4. Instala tooling: `python -m pip install -r requirements-deploy.txt`.
5. Exporta `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` fuera de Git.
6. Valida: `python scripts/validate_repo.py`.
7. Dry-run: `python scripts/deploy.py --mode install --dry-run`.
8. Despliega: `python scripts/deploy.py --mode install --require-bridge`.
9. Verifica: `python scripts/verify.py --require-bridge`.
10. Ejecuta el smoke test de `INSTALL.md`.

## Inicio rápido — API / OpenClaw

1. Lee `deployment/openclaw/AGENT.md`.
2. Configura `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` únicamente en el secret store/entorno del agente.
3. Ejecuta `python scripts/preflight.py`.
4. Valida: `python scripts/validate_repo.py`.
5. Dry-run: `python scripts/deploy_api.py --mode install --dry-run`.
6. Despliega: `python scripts/deploy_api.py --mode install`.
7. Verifica: `python scripts/verify.py`.
8. Revisa `deployment/api/API_MATRIX.md` para conocer las capacidades reales del runtime.

## Acciones ERPNext soportadas por el Bridge

`OPEN_DOCUMENT`, `CREATE_DOCUMENT`, `CREATE_FROM_SOURCE`, `UPDATE_DOCUMENT`, `SUBMIT_DOCUMENT` y `LINK_DOCUMENT`.

Los flujos estándar Quotation/Sales Order/Delivery Note/Sales Invoice/Purchase Order/Purchase Receipt/Purchase Invoice usan mappers nativos de ERPNext cuando el par está soportado. No se permiten métodos Python arbitrarios configurados desde el navegador.

## Seguridad

Nunca publiques API keys, API secrets, cookies, contraseñas ni tokens. El portal usa sesión same-origin. Los permisos de los DocTypes se normalizan desde `scripts/permissions.py`; el Bridge añade validación server-side y los documentos de ERPNext conservan sus permisos nativos.

El usuario técnico/API pertenece al deployment/runtime, nunca al JavaScript del navegador. INSTALL y UPDATE son no destructivos por defecto.

> Versiones anteriores contenían credenciales hardcodeadas. Deben considerarse comprometidas y rotarse aunque ya no aparezcan en el HEAD actual. Ver `SECURITY.md`.

## Documentación

- `deployment/README.md`: arquitectura dual.
- `deployment/manifest.json`: contrato machine-readable de deployment.
- `deployment/bench/INSTALL.md`: instalación Bench/Custom App.
- `deployment/api/INSTALL.md`: instalación API-first.
- `deployment/api/API_MATRIX.md`: matriz de capacidades.
- `deployment/openclaw/AGENT.md`: reglas para OpenClaw y agentes.
- `INSTALL.md`: instalación operativa completa legacy/canónica Bench.
- `docs/OPERATIONAL_ACTIONS.md`: acciones, DocTypes y trazabilidad.
- `ARCHITECTURE.md`: arquitectura y fronteras.
- `AGENTS.md`: instrucciones para agentes/ingenieros.
- `DEPLOYMENT.md`: despliegue y actualización.
- `ROLLBACK.md`: reversión.
- `SECURITY.md`: seguridad.
- `TROUBLESHOOTING.md`: diagnóstico.
- `CHANGELOG.md`: historial.
