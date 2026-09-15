# AGENTS

Instrucciones para OpenClaw, Claude, Codex y otros agentes que modifiquen este repositorio.

## Qué es este proyecto

LivingOrg OS es un portal empresarial sobre ERPNext/Frappe. El portal principal está en `portal/`; los Custom DocTypes están en `erpnext_setup/doctypes/`; despliegue y validación están en `scripts/`.

## Reglas obligatorias

1. No modificar core de ERPNext, Frappe o Frappe CRM.
2. No borrar archivos, generaciones legacy ni funcionalidad sin una migración explícita aprobada.
3. No poner API keys, secrets, cookies, contraseñas o tokens en Git.
4. No llamar `fetch()` directamente desde módulos del portal: usar `OS.api`.
5. No confiar en validación frontend para autorización.
6. No renderizar HTML almacenado sin `OS.util.sanitizeHtml`.
7. No introducir frameworks/dependencias sin justificar problema, mantenimiento y deployment.
8. Mantener compatibilidad de APIs públicas y entrypoints legacy.

## Archivos delicados

- `scripts/permissions.py`: fuente ejecutable de permisos OS.
- `scripts/deploy.py`: deployment canónico.
- `reinstall.py`, `cleanup_data.py`: destructivos; requieren doble guard.
- `portal/assets/js/os-api.js`: única puerta REST.
- `portal/assets/js/os-core.js`: shell/router/componentes compartidos.
- `portal/assets/js/os-hardening.js`: sanitización y hardening.
- `erpnext_setup/doctypes/os_process.json`, `os_sop.json`: ciclo de dependencias gestionado en deployment.

## Cómo validar un cambio

```bash
python scripts/validate_repo.py
python -m compileall scripts *.py
python scripts/deploy.py --mode update --dry-run
```

Para JavaScript, ejecutar `node --check` sobre los `.js` modificados cuando Node esté disponible. Las pruebas visuales y de permisos reales requieren un ERPNext de prueba.

## Cómo desplegar

Lee `DEPLOYMENT.md`. Nunca improvises dominios/rutas/credenciales. Usa `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET`.

## Rollback

Lee `ROLLBACK.md`. Para cambios de frontend, revertir el commit y volver a ejecutar deployment. Para cambios de schema, evaluar compatibilidad antes de revertir; no borrar campos con datos automáticamente.

## Convenciones

- Commits pequeños: `fix:`, `refactor:`, `perf:`, `docs:`, `test:`.
- Comentarios explican el porqué, restricciones Frappe o compatibilidad.
- Vanilla JS, CSS variables, Grid/Flex, responsive mobile-first donde sea útil.
- Estados de UI: loading, empty, error, success y disabled cuando aplique.

## Errores frecuentes

- Frappe puede devolver detalles de excepción en payload: el adapter los normaliza.
- `OS Viewer`/`OS Auditor` deben ser read-only.
- Un filtro visual por `actor_user` no reemplaza permisos documentales del servidor.
- Las instrucciones de un Step Run deben salir de snapshot para auditoría; el fallback a proceso vigente sólo cubre datos legacy.
- Los prototipos standalone no son fuente de verdad.

## Qué NO modificar automáticamente

- lógica de negocio de transiciones;
- permisos por documento/Company;
- política evidence-first del servidor;
- arquitectura hacia Custom App;
- datos productivos.

Esos cambios pueden alterar comportamiento o arquitectura y requieren revisión explícita.
