# ROLLBACK

## Principio

Los cambios de esta capa se despliegan desde Git. El rollback normal consiste en volver a un commit conocido y ejecutar nuevamente el deployment canónico. No uses `reinstall.py` como rollback.

## Frontend / documentación / scripts

```bash
git log --oneline --decorate -20
git checkout <commit-conocido>
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update
```

Después verifica `/os`, consola y Network.

## Un solo commit

En una rama de reparación, preferir `git revert <sha>` para conservar historial. Después vuelve a desplegar.

## Cambios de DocType

Agregar campos suele ser compatible hacia atrás. Eliminar o cambiar tipo/nombre de campos puede implicar pérdida o migración de datos y NO debe automatizarse como rollback.

Antes de revertir schema:

1. exporta/respaldá los registros afectados;
2. compara el JSON del DocType entre commits;
3. comprueba si el rollback elimina campos con datos;
4. si hay riesgo, crea una migración específica en vez de borrar el campo.

Los nuevos campos snapshot de `OS Step Run` son aditivos y pueden permanecer aunque un frontend anterior no los use.

## Operaciones destructivas

`reinstall.py` y `cleanup_data.py` no son herramientas de rollback. Están bloqueadas por defecto y requieren `LIVINGORG_ALLOW_DESTRUCTIVE=1` + `--confirm-destroy`.

## Credenciales

Nunca “hagas rollback” a una API key publicada. Una credencial expuesta permanece comprometida aunque vuelvas a un commit anterior.
