# LivingOrg OS

LivingOrg OS es una capa operativa sobre ERPNext/Frappe para modelar estructura, procesos, SOPs y **ejecutar trabajo real vinculado a documentos ERPNext**, con evidencia, aprobaciones, agentes, conocimiento y KPIs sin modificar el core.

## Componentes

- `portal/`: portal principal `/os`, HTML/CSS/JavaScript Vanilla conectado por sesión same-origin.
- `erpnext_setup/doctypes/`: Custom DocTypes `OS *`, incluida la configuración `OS Process Action` y la trazabilidad `OS Document Link`.
- `frappe_app/livingorg_bridge/`: Custom Frappe App server-side para runs, transiciones, permisos documentales, aprobaciones y acciones ERPNext.
- `scripts/`: configuración, permisos canónicos, overlays de schema, cliente REST, validación y despliegue reproducible.
- `livingorg-os/`, `livingorg-os-v2/`, `livingorg-flow-studio-v3/`: generaciones standalone/prototipos visuales conservadas por compatibilidad y referencia UX.
- scripts raíz (`install.py`, `update.py`, `update_v2.py`, `deploy_standalone.py`): entrypoints legacy conservados; delegan en `scripts/deploy.py`.

## Qué significa “operativo”

Un paso puede declarar discretamente una acción como:

```text
Crear factura
ERPNext · CREATE_FROM_SOURCE
Sales Order → Sales Invoice
```

Al ejecutarse, LivingOrg usa el Bridge, respeta permisos nativos de ERPNext y registra el documento concreto en `OS Document Link`. Así la definición del proceso permanece reusable y cada Run conserva su propia trazabilidad.

## Regla de arquitectura

ERPNext/Frappe es la fuente de verdad. Los canvases y prototipos visuales no son una segunda base de datos. El frontend no es frontera de autorización: las reglas críticas viven en `livingorg_bridge`.

## Inicio rápido

1. Lee `SECURITY.md`.
2. Haz backup del sitio.
3. Instala `frappe_app/livingorg_bridge` en el bench (`bench get-app ...` + `install-app`).
4. Instala tooling: `python -m pip install -r requirements-deploy.txt`.
5. Exporta `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` fuera de Git.
6. Valida: `python scripts/validate_repo.py`.
7. Dry-run: `python scripts/deploy.py --mode install --dry-run`.
8. Despliega: `python scripts/deploy.py --mode install --require-bridge`.
9. Ejecuta el smoke test de `INSTALL.md`.

## Acciones ERPNext soportadas

`OPEN_DOCUMENT`, `CREATE_DOCUMENT`, `CREATE_FROM_SOURCE`, `UPDATE_DOCUMENT`, `SUBMIT_DOCUMENT` y `LINK_DOCUMENT`.

Los flujos estándar Quotation/Sales Order/Delivery Note/Sales Invoice/Purchase Order/Purchase Receipt/Purchase Invoice usan mappers nativos de ERPNext cuando el par está soportado. No se permiten métodos Python arbitrarios configurados desde el navegador.

## Seguridad

Nunca publiques API keys, API secrets, cookies, contraseñas ni tokens. El portal usa sesión same-origin. Los permisos de los DocTypes se normalizan desde `scripts/permissions.py`; el Bridge añade validación server-side y los documentos de ERPNext conservan sus permisos nativos.

> Versiones anteriores contenían credenciales hardcodeadas. Deben considerarse comprometidas y rotarse aunque ya no aparezcan en el HEAD actual. Ver `SECURITY.md`.

## Documentación

- `INSTALL.md`: instalación operativa completa.
- `docs/OPERATIONAL_ACTIONS.md`: acciones, DocTypes y trazabilidad.
- `ARCHITECTURE.md`: arquitectura y fronteras.
- `AGENTS.md`: instrucciones para agentes/ingenieros.
- `DEPLOYMENT.md`: despliegue y actualización.
- `ROLLBACK.md`: reversión.
- `SECURITY.md`: seguridad.
- `TROUBLESHOOTING.md`: diagnóstico.
- `CHANGELOG.md`: historial.
