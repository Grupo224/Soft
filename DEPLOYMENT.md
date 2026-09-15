# DEPLOYMENT

Guía canónica para humanos y agentes. LivingOrg OS operativo tiene dos piezas: `livingorg_bridge` (server-side) y el portal/Custom DocTypes (deployment REST).

## Preflight

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
```

Variables: `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET`; opcionales `LIVINGORG_REPO_ROOT`, `FRAPPE_TIMEOUT_SECONDS`.

## Primera instalación

Sigue `INSTALL.md`: backup → instalar `livingorg_bridge` en bench → migrate → dry-run → deployment con verificación del Bridge.

```bash
python scripts/deploy.py --mode install --require-bridge
```

## Actualización

1. Backup del sitio.
2. Actualiza el repo con `git pull --ff-only` en la rama estable elegida.
3. Si cambió `frappe_app/livingorg_bridge`, actualiza la copia instalada por Bench y ejecuta:

```bash
bench --site TU-SITIO migrate
bench --site TU-SITIO clear-cache
```

4. Sincroniza schemas + portal:

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update --require-bridge
```

5. En producción:

```bash
bench restart
```

## Qué sincroniza `scripts/deploy.py`

- módulo y roles OS;
- child tables y Custom DocTypes;
- overlays aditivos de schema (`OS Process.actions`, campos runtime de `OS Run`/`OS Step Run`);
- permisos canónicos;
- assets HTML/CSS/JS;
- Web Page `/os`;
- capability check de `livingorg_bridge` cuando usas `--require-bridge`.

No borra registros existentes.

## Prueba operacional posterior

Ejecuta el smoke test de `INSTALL.md`. Debes verificar al menos:

- botón **Acciones ERPNext**;
- Run Test que crea Step Runs;
- Step Run asignado visible en Mi Trabajo;
- acción `LINK_DOCUMENT` o `CREATE_FROM_SOURCE`;
- `OS Document Link` creado;
- evidencia y aprobación bloqueadas en servidor cuando se exigen;
- aprobación por usuario/rol asignado;
- acceso al documento ERPNext desde el Run.

## Standalone legado

```bash
python scripts/deploy.py --mode standalone --dry-run
python scripts/deploy.py --mode standalone
```

No sustituye `/os` como aplicación operativa.

## Rollback

No uses `reinstall.py`. Sigue `ROLLBACK.md`: revert del commit, migrate del Custom App si aplica y redeploy del portal/schemas.

## Estado de verificación

CI/dry-run cubren sintaxis y consistencia estática. La instalación en un sitio ERPNext específico, sus impuestos, cuentas, permisos, workflows y customizations sigue marcada **REQUIERE VALIDACIÓN EN ERPNext** hasta ejecutar el smoke test en ese sitio.
