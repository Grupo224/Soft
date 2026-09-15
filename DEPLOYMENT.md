# DEPLOYMENT

Guía canónica para humanos y agentes automatizados. No uses secretos embebidos en código.

## Prerrequisitos

Completa `INSTALL.md` y confirma:

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
```

Variables obligatorias: `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET`. Opcionales: `LIVINGORG_REPO_ROOT`, `FRAPPE_TIMEOUT_SECONDS`.

## Desplegar portal ERPNext

```bash
python scripts/deploy.py --mode update
```

Este comando:

1. conserva/crea el módulo y roles;
2. carga los JSON de DocTypes;
3. normaliza permisos con `scripts/permissions.py`;
4. actualiza o crea DocTypes sin borrar datos;
5. reemplaza los assets públicos del portal por nombre;
6. actualiza o crea la Web Page con ruta `/os`.

## Desplegar standalone `/livingorg`

```bash
python scripts/deploy.py --mode standalone --dry-run
python scripts/deploy.py --mode standalone
```

## Cache busting

Portal:

```bash
python cache_bust.py
```

Standalone:

```bash
python cache_bust_livingorg.py
```

Los scripts actualizan la clave `?v=` y vuelven a desplegar usando la configuración segura central.

## Actualizar una instalación existente

```bash
git pull --ff-only
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update
```

Después ejecuta las pruebas manuales de `TROUBLESHOOTING.md` y `COMPATIBILITY.md`.

## Reinstalación destructiva

NO es un procedimiento normal. El script se bloquea salvo doble confirmación:

```bash
export LIVINGORG_ALLOW_DESTRUCTIVE=1
python reinstall.py --confirm-destroy
```

Antes de ejecutarlo exporta/respaldá los datos y lee `ROLLBACK.md`. No automatices esta orden en CI.

## Comprobaciones posteriores

- Abrir `/os` autenticado.
- Comprobar Network: sin 401/403/404/422/500 inesperados.
- Comprobar Console: 0 errores JavaScript no controlados.
- Verificar permisos con un usuario por rol, no con Administrator.
- Verificar 320, 360, 375, 390, 430 px, tablet y desktop.
- Confirmar que el editor enriquecido elimina `script`, event handlers y URLs no permitidas.

## Estado de verificación

Los scripts incluyen validaciones estáticas y dry-run. Una ejecución real contra cada sitio ERPNext es **REQUIERE VALIDACIÓN EN ERPNext** porque el repositorio no contiene las credenciales ni el runtime del cliente.
