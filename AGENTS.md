# AGENTS

Instrucciones para OpenClaw, Claude, Codex y otros agentes que modifiquen o desplieguen este repositorio.

## Qué es este proyecto

LivingOrg OS es un portal empresarial sobre ERPNext/Frappe. El portal principal está en `portal/`; los Custom DocTypes están en `erpnext_setup/doctypes/`; despliegue y validación están en `scripts/`.

LivingOrg soporta DOS modos oficiales de deployment sobre la misma base de código:

- `bench`: Custom App nativa `livingorg_bridge` + sincronización REST de schema/portal.
- `api`: sincronización API-first sin SSH/Bench; las capacidades server-side deben provenir de Bridge preexistente, OpenClaw Runtime o Server Script Runtime habilitado por el administrador.

Antes de desplegar lee `deployment/manifest.json` y `deployment/README.md`.

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

## Archivos delicados

- `scripts/permissions.py`: fuente ejecutable de permisos OS.
- `scripts/deploy.py`: deployment canónico compartido.
- `scripts/deploy_api.py`: entrypoint explícito API-only para schema/portal.
- `scripts/preflight.py`: comprobaciones API de sólo lectura.
- `scripts/verify.py`: verificación de deployment/capacidades.
- `deployment/manifest.json`: contrato de modos y seguridad.
- `reinstall.py`, `cleanup_data.py`: destructivos; requieren doble guard y nunca son parte del flujo normal.
- `portal/assets/js/os-api.js`: única puerta REST del portal.
- `portal/assets/js/os-core.js`: shell/router/componentes compartidos.
- `portal/assets/js/os-hardening.js`: sanitización y hardening.
- `erpnext_setup/doctypes/os_process.json`, `os_sop.json`: ciclo de dependencias gestionado en deployment.
- `frappe_app/livingorg_bridge/`: runtime nativo; no degradar su seguridad para hacer funcionar el modo API.

## Cómo validar un cambio

```bash
python scripts/validate_repo.py
python -m compileall scripts *.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy_api.py --mode update --dry-run
```

Para JavaScript, ejecutar `node --check` sobre los `.js` modificados cuando Node esté disponible. Las pruebas visuales, permisos reales y acciones ERPNext requieren un sitio ERPNext de prueba.

## Cómo desplegar

### Bench / Custom App

Lee `deployment/bench/INSTALL.md`. Usa `--require-bridge` al finalizar para confirmar runtime completo.

### API / OpenClaw

Lee `deployment/api/INSTALL.md` y `deployment/openclaw/AGENT.md`.

Secuencia base:

```bash
python scripts/preflight.py
python scripts/validate_repo.py
python scripts/deploy_api.py --mode install --dry-run
python scripts/deploy_api.py --mode install
python scripts/verify.py
```

Nunca improvises dominios/rutas/credenciales. Usa `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` desde secret store/variables de entorno.

## Rollback

Lee `ROLLBACK.md`. Para cambios de frontend, revertir el commit y volver a ejecutar deployment. Para cambios de schema, evaluar compatibilidad antes de revertir; no borrar campos con datos automáticamente.

## Convenciones

- Commits pequeños: `fix:`, `refactor:`, `perf:`, `docs:`, `test:`, `feat:`.
- Comentarios explican el porqué, restricciones Frappe o compatibilidad.
- Vanilla JS, CSS variables, Grid/Flex, responsive mobile-first donde sea útil.
- Estados de UI: loading, empty, error, success y disabled cuando aplique.
- Cambios de deployment deben ser idempotentes y reintentables.

## Errores frecuentes

- Frappe puede devolver detalles de excepción en payload: el adapter los normaliza.
- `OS Viewer`/`OS Auditor` deben ser read-only.
- Un filtro visual por `actor_user` no reemplaza permisos documentales del servidor.
- Las instrucciones de un Step Run deben salir de snapshot para auditoría; el fallback a proceso vigente sólo cubre datos legacy.
- Los prototipos standalone no son fuente de verdad.
- Crear DocTypes por REST no instala `doc_events`, `has_permission` ni `permission_query_conditions` Python.
- API-first no significa frontend-first: secretos y reglas críticas permanecen fuera del navegador.

## Qué NO modificar automáticamente

- lógica de negocio de transiciones;
- permisos por documento/Company;
- política evidence-first del servidor;
- datos productivos;
- allowlists de acciones ERPNext;
- fronteras de seguridad entre browser/runtime/ERPNext.

Esos cambios pueden alterar comportamiento o seguridad y requieren revisión explícita.
