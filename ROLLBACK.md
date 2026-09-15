# ROLLBACK

## Principio

Los cambios de esta capa se despliegan desde Git. El rollback normal consiste en volver a un commit conocido y ejecutar nuevamente el deployment canónico. No uses `reinstall.py` como rollback.

## Referencias Organigrama Vivo

```text
CURRENT:  release/organigrama-v2.0
PREVIOUS: archive/organigrama-v1-stable
COMMIT 1.x: a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
```

La rama `archive/organigrama-v1-stable` es la referencia de recuperación de la experiencia anterior. No debe recibir desarrollo nuevo.

## Rollback Organigrama Vivo 2.0 → 1.x

1. Respaldar el sitio actual antes de revertir código.
2. Cambiar el checkout a `archive/organigrama-v1-stable` o al commit exacto anterior.
3. Ejecutar validación del código anterior.
4. Dry-run del deployment.
5. Volver a desplegar portal/schema compatible.
6. Verificar `/os#/org`.

Ejemplo:

```bash
git fetch origin
git checkout archive/organigrama-v1-stable
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update
```

En modo API-only usa el entrypoint API correspondiente de esa versión.

### NO eliminar campos 2.0 durante rollback

Organigrama 2.0 añadió campos opcionales en `OS Role Card`, `OS KPI Definition` y `OS SOP`. El frontend 1.x puede ignorarlos. Dejarlos instalados es más seguro que borrarlos y evita perder información capturada en 2.0.

No borrar automáticamente:

```text
OS Role Card.org_node
OS Role Card.purpose
OS Role Card.objectives
OS Role Card.functions
OS Role Card.competencies
OS Role Card.tools
OS Role Card.process_refs
OS Role Card.sop_refs
OS KPI Definition.org_node
OS KPI Definition.role_card
OS KPI Definition.designation
OS SOP.responsible_node
```

## Frontend / documentación / scripts general

```bash
git log --oneline --decorate -20
git checkout <commit-conocido>
python scripts/validate_repo.py
python scripts/deploy.py --mode update --dry-run
python scripts/deploy.py --mode update
```

Después verifica `/os`, consola y Network.

## Un solo commit

En una rama de reparación, preferir `git revert <sha>` para conservar historial. Para regresar toda la versión de Organigrama usa la rama de archivo anterior en lugar de reconstruir manualmente archivos antiguos.

## Cambios de DocType

Agregar campos suele ser compatible hacia atrás. Eliminar o cambiar tipo/nombre de campos puede implicar pérdida o migración de datos y NO debe automatizarse como rollback.

Antes de revertir schema:

1. exporta/respalda los registros afectados;
2. compara el JSON del DocType entre commits;
3. comprueba si el rollback elimina campos con datos;
4. si hay riesgo, crea una migración específica en vez de borrar el campo.

## Bridge

Si Organigrama 2.0 fue desplegado con `livingorg_bridge`, el código v2 añade `validate_org_relation` como hook. Para rollback total del runtime:

1. checkout del código anterior del Custom App;
2. seguir el procedimiento Bench de actualización/migrate correspondiente;
3. no eliminar registros ni campos agregados por 2.0.

## Operaciones destructivas

`reinstall.py` y `cleanup_data.py` no son herramientas de rollback. Están bloqueadas por defecto y requieren `LIVINGORG_ALLOW_DESTRUCTIVE=1` + `--confirm-destroy`.

## Credenciales

Nunca “hagas rollback” a una API key publicada. Una credencial expuesta permanece comprometida aunque vuelvas a un commit anterior.

## Validación posterior

Un rollback sólo se considera correcto cuando:

- `/os#/org` carga;
- nodos y relaciones históricos siguen visibles;
- no se eliminaron Role Cards/archivos/datos 2.0;
- Process Studio y SOP siguen funcionando;
- `scripts/verify.py` o el verificador de la versión objetivo no reporta fallas críticas.
