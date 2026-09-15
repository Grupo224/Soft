# Modo A — Bench / Custom App

Este modo conserva la arquitectura nativa existente y es la opción recomendada cuando existe acceso al servidor/bench.

## Requisitos

- ERPNext/Frappe v15+ por HTTPS.
- acceso autorizado al bench;
- backup reciente;
- Python 3.10+ para tooling externo;
- `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` fuera de Git.

## Instalación

1. Obtén la rama/commit exacto a desplegar.
2. Haz backup del sitio.
3. Instala `frappe_app/livingorg_bridge` con Bench.
4. Ejecuta migrate y clear-cache.
5. Ejecuta validación estática y dry-run.
6. Sincroniza schema + portal con `scripts/deploy.py --mode install --require-bridge`.
7. Ejecuta VERIFY y smoke test.

Ejemplo:

```bash
bench get-app --soft-link /RUTA/Soft/frappe_app/livingorg_bridge
bench --site TU-SITIO install-app livingorg_bridge
bench --site TU-SITIO migrate
bench --site TU-SITIO clear-cache

python scripts/validate_repo.py
python scripts/deploy.py --mode install --dry-run
python scripts/deploy.py --mode install --require-bridge
python scripts/verify.py --require-bridge
```

## Actualización

No reinstales. Actualiza el Custom App, ejecuta migrate/clear-cache y después sincroniza schema/portal con modo `update`.

```bash
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update --require-bridge
python scripts/verify.py --require-bridge
```

## Capacidades

Este modo proporciona el runtime completo de `livingorg_bridge`: validaciones server-side, filtros de permisos por documento, runs, step runs, evidencia, aprobaciones y acciones ERPNext allowlist.

## Regla de compatibilidad

Los archivos en `erpnext_setup/doctypes/` y `portal/` son compartidos con el modo API. No crees forks del schema o del frontend sólo para este modo.
