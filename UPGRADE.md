# UPGRADE

## Actualización normal

```bash
git pull --ff-only
python -m pip install -r requirements-deploy.txt
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update
```

## Antes de actualizar

- lee `CHANGELOG.md`;
- compara cambios en `erpnext_setup/doctypes/`;
- respalda datos antes de cambios de schema no aditivos;
- verifica que las variables de entorno apunten al sitio correcto;
- nunca copies credenciales desde commits antiguos.

## Compatibilidad de schema

Preferir cambios aditivos: campos nuevos, opciones nuevas compatibles y assets nuevos. Cambios destructivos (renombrar/eliminar campos, cambiar semántica de estados, eliminar roles) requieren migración explícita y no deben introducirse dentro de un simple update.

## Permisos

El deployment vuelve a aplicar `scripts/permissions.py`. Si la operación requiere un cambio de permisos, modifica primero la matriz canónica, documenta el motivo y valida con usuarios de cada rol.

## Legacy

`install.py`, `update.py`, `update_v2.py` y `deploy_standalone.py` son wrappers compatibles. Nuevas automatizaciones deben invocar `scripts/deploy.py`. No borres los wrappers hasta que todos sus consumidores hayan migrado.

## Post-upgrade

Ejecuta pruebas funcionales de navegación, formularios, CRUD, filtros, adjuntos, errores, mobile y permisos. Un dry-run exitoso no demuestra que la instancia ERPNext funciona correctamente en runtime.
