# AGENTS

Instrucciones para OpenClaw, Claude, Codex y otros agentes que modifiquen o desplieguen este repositorio.

## Qué es este proyecto

LivingOrg OS es un portal empresarial sobre ERPNext/Frappe. El portal principal está en `portal/`; los Custom DocTypes están en `erpnext_setup/doctypes/`; despliegue y validación están en `scripts/`.

LivingOrg soporta DOS modos oficiales de deployment sobre la misma base de código:

- `bench`: Custom App nativa `livingorg_bridge` + sincronización REST de schema/portal.
- `api`: sincronización API-first sin SSH/Bench; las capacidades server-side deben provenir de Bridge preexistente, OpenClaw Runtime o Server Script Runtime habilitado por el administrador.

## Versión de Organigrama obligatoria

```text
CURRENT STABLE CODE: Organigrama Vivo 2.0.0
WORK BRANCH:         release/organigrama-v2.0
PREVIOUS STABLE:     archive/organigrama-v1-stable
PREVIOUS COMMIT:     a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
```

Un agente que vaya a desplegar o modificar `/os#/org` DEBE leer en este orden:

1. `AGENTS.md`
2. `deployment/manifest.json`
3. `docs/ORGANIGRAMA_V2.md`
4. `docs/ORGANIGRAMA_MIGRATION_2.0.md`
5. `docs/ORGANIGRAMA_TESTING_2.0.md`
6. `SECURITY.md`
7. guía del modo Bench/API
8. `ROLLBACK.md`

No asumir que `portal/assets/js/pages/os-page-org.js` es la versión vigente. En 2.0 el entrypoint activo es `portal/assets/js/pages/os-page-org-v2.js`; el archivo 1.x está preservado deliberadamente.

## Reglas obligatorias

1. No modificar core de ERPNext, Frappe o Frappe CRM.
2. No borrar archivos, generaciones legacy ni funcionalidad sin una migración explícita aprobada.
3. No poner API keys, secrets, cookies, contraseñas o tokens en Git.
4. No llamar `fetch()` directamente desde módulos del portal: usar `OS.api`.
5. No confiar en validación frontend para autorización.
6. No renderizar HTML almacenado sin `OS.util.sanitizeHtml`.
7. No introducir frameworks/dependencias sin justificar problema, mantenimiento y deployment.
8. Mantener compatibilidad de APIs públicas y entrypoints legacy.
9. No crear forks del schema o frontend para cada deployment: `erpnext_setup/doctypes/` y `portal/` son fuente de verdad compartida.
10. INSTALL/UPDATE son no destructivos por defecto: no DROP, TRUNCATE, reinstall ni eliminación automática de DocTypes/campos/datos.
11. Nunca afirmar que el modo API tiene hooks Python si `livingorg_bridge` no está instalado.
12. Si falta runtime operativo en modo API, reportar `DEGRADED`; no sustituir seguridad server-side con JavaScript.
13. Para Organigrama 2.0, `title` es el nombre visual; el Link ERPNext es una fuente separada. No volver a mezclar ambas responsabilidades en un `label()` genérico.
14. No migrar, borrar ni “corregir” automáticamente relaciones históricas de `OS Org Relation` para ajustarlas a la matriz 2.0.
15. `Designation = Puesto`; `Employee = Persona`. Una Persona no debe convertirse en el contenedor de la información institucional del Puesto.
16. Process Studio y SOP Builder siguen siendo módulos separados; desde Organigrama únicamente se vinculan/navegan.

## Organigrama Vivo 2.0 — archivos delicados

- `portal/assets/js/pages/os-page-org-v2.js`: experiencia vigente, helpers de display, matriz semántica, sidebar y acciones contextuales.
- `portal/assets/js/pages/os-page-org.js`: implementación 1.x preservada. No editar para cambios 2.0 salvo decisión explícita de compatibilidad.
- `portal/assets/css/os-org-v2.css`: estilos exclusivamente 2.0.
- `portal/pages/os-web-page.html`: **orden crítico**: `os-page-org-v2.js` debe aparecer antes de `os-page-org.js`.
- `erpnext_setup/doctypes/os_role_card.json`: cerebro del Puesto.
- `erpnext_setup/doctypes/os_kpi_definition.json`: KPI estructurado por Puesto/Role Card.
- `erpnext_setup/doctypes/os_sop.json`: vínculo `responsible_node`.
- `frappe_app/livingorg_bridge/livingorg_bridge/governance.py`: validación server-side de jerarquía.
- `frappe_app/livingorg_bridge/livingorg_bridge/hooks.py`: activa `validate_org_relation`.
- `scripts/validate_org_v2.py`: contrato obligatorio. Cualquier cambio de arquitectura 2.0 debe mantener/actualizar este test.

## Otros archivos delicados

- `scripts/permissions.py`: fuente ejecutable de permisos OS.
- `scripts/deploy.py`: deployment canónico compartido.
- `scripts/deploy_api.py`: entrypoint explícito API-only para schema/portal.
- `scripts/preflight.py`: comprobaciones API de sólo lectura.
- `scripts/verify.py`: verificación de deployment/capacidades.
- `deployment/manifest.json`: contrato de modos, versión y seguridad.
- `reinstall.py`, `cleanup_data.py`: destructivos; requieren doble guard y nunca son parte del flujo normal.
- `portal/assets/js/os-api.js`: única puerta REST del portal.
- `portal/assets/js/os-core.js`: shell/router/componentes compartidos.
- `portal/assets/js/os-canvas.js`: motor compartido. Reutilizar; no reescribir por comodidad.
- `portal/assets/js/os-hardening.js`: sanitización y hardening.
- `frappe_app/livingorg_bridge/`: runtime nativo; no degradar su seguridad para hacer funcionar el modo API.

## Cómo validar un cambio 2.0

```bash
python scripts/validate_repo.py
python scripts/validate_org_v2.py
python -m compileall -q scripts frappe_app *.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy_api.py --mode update --dry-run
```

Para JavaScript, ejecutar `node --check` sobre los `.js` modificados. GitHub Actions hace estas comprobaciones en `release/**`.

Las pruebas reales definidas en `docs/ORGANIGRAMA_TESTING_2.0.md` requieren un ERPNext de staging. Sin ellas, el estado máximo es `READY FOR STAGING`, no `READY FOR PRODUCTION`.

## Cómo desplegar

### Bench / Custom App

Lee `deployment/bench/INSTALL.md` y `docs/ORGANIGRAMA_MIGRATION_2.0.md`. Usa `--require-bridge` al finalizar para confirmar runtime completo y validación server-side de jerarquía.

### API / OpenClaw

Lee `deployment/api/INSTALL.md` y `deployment/openclaw/AGENT.md`.

Secuencia base de actualización 2.0:

```bash
git checkout release/organigrama-v2.0
python scripts/preflight.py
python scripts/validate_repo.py
python scripts/validate_org_v2.py
python scripts/deploy_api.py --mode update --dry-run
python scripts/deploy_api.py --mode update
python scripts/verify.py
```

Nunca improvises dominios/rutas/credenciales. Usa `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` desde secret store/variables de entorno.

## Rollback

Lee `ROLLBACK.md`. Para Organigrama 1.x usa la referencia exacta `archive/organigrama-v1-stable` / `a2b7b88ae3dbbf38b1c93a466c9419e7977af19f`.

No elimines campos 2.0 como parte de un rollback normal; el frontend antiguo puede ignorarlos y así se preservan los datos nuevos.

## Convenciones

- Commits pequeños: `fix:`, `refactor:`, `perf:`, `docs:`, `test:`, `feat:`.
- Comentarios explican el porqué, restricciones Frappe o compatibilidad.
- Vanilla JS, CSS variables, Grid/Flex, responsive mobile-first donde sea útil.
- Estados de UI: loading, empty, error, success y disabled cuando aplique.
- Cambios de deployment deben ser idempotentes y reintentables.
- No crear archivos `_old`, `_backup`, `_final2`; Git se encarga del histórico.

## Errores frecuentes

- Frappe puede devolver detalles de excepción en payload: el adapter los normaliza.
- `OS Viewer`/`OS Auditor` deben ser read-only mediante permisos efectivos normalizados.
- Un filtro visual por `actor_user` no reemplaza permisos documentales del servidor.
- Las instrucciones de un Step Run deben salir de snapshot para auditoría; el fallback a proceso vigente sólo cubre datos legacy.
- Los prototipos standalone no son fuente de verdad.
- Crear DocTypes por REST no instala `doc_events`, `has_permission` ni `permission_query_conditions` Python.
- API-first no significa frontend-first: secretos y reglas críticas permanecen fuera del navegador.
- Invertir el orden de `os-page-org-v2.js` y `os-page-org.js` reactiva accidentalmente la ruta 1.x.

## Qué NO modificar automáticamente

- lógica de negocio de transiciones;
- permisos por documento/Company;
- política evidence-first del servidor;
- datos productivos;
- allowlists de acciones ERPNext;
- fronteras de seguridad entre browser/runtime/ERPNext;
- relaciones históricas de Organigrama sólo porque no cumplen la nueva matriz.

Esos cambios pueden alterar comportamiento o seguridad y requieren revisión explícita.
