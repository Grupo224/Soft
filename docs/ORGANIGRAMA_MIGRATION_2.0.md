# Migración — Organigrama Vivo 1.x → 2.0

## Estado

Esta actualización es **aditiva**. No requiere una base limpia y no elimina nodos, relaciones, Role Cards, personas, departamentos, puestos, procesos, SOPs o archivos existentes.

## Referencias de versión

- **Previous stable:** branch `archive/organigrama-v1-stable`
- **Previous stable commit:** `a2b7b88ae3dbbf38b1c93a466c9419e7977af19f`
- **Current stable candidate:** branch `release/organigrama-v2.0`

## Qué cambia en schema

### OS Role Card

Se agregan campos opcionales:

```text
org_node
purpose
objectives
functions
competencies
tools
process_refs
sop_refs
```

No se renombra ni elimina ningún campo existente.

Role Cards históricas que sólo tengan `designation` continúan funcionando. El frontend 2.0 busca primero `org_node` y después hace fallback por `designation`.

### OS KPI Definition

Se agregan:

```text
org_node
role_card
designation
```

y se amplía `entity_type` con:

```text
Position
RoleCard
```

Las opciones existentes permanecen.

### OS SOP

Se agrega:

```text
responsible_node
```

Los SOPs existentes quedan sin valor en ese campo hasta que un usuario los vincule a un puesto.

## Qué NO se migra automáticamente

### Relaciones jerárquicas

No se modifica ningún registro `OS Org Relation` existente.

2.0 analiza las relaciones actuales. Si encuentra una relación `REPORTS_TO` incompatible con la nueva matriz semántica, muestra una advertencia para revisión humana.

Esto evita que una actualización cambie silenciosamente la estructura real de una organización.

### Nombre visual

No se copia el nombre del vínculo ERPNext a `title` de forma masiva.

Regla de lectura 2.0:

```text
si title tiene valor -> usar title
si title está vacío -> fallback al vínculo ERPNext
```

Por tanto no hace falta reescribir registros para reparar el bug visual.

### Employee

Asignar una Persona a un Puesto no modifica automáticamente:

```text
Employee.designation
Employee.department
Employee.reports_to
```

La asignación visual se representa con `OS Org Node` + `OS Org Relation`. Los maestros ERPNext sólo deben cambiarse mediante una acción explícita y autorizada.

## Orden seguro de actualización

1. Backup/snapshot del sitio mediante el mecanismo de hosting disponible.
2. Confirmar rama `release/organigrama-v2.0`.
3. Ejecutar validación del repositorio:

```bash
python scripts/validate_repo.py
python scripts/validate_org_v2.py
```

4. Dry-run:

```bash
python scripts/deploy_api.py --mode update --dry-run
```

   o, para instalación con Bridge:

```bash
python scripts/deploy.py --mode update --dry-run --require-bridge
```

5. Sincronizar los Custom DocTypes aditivos antes de publicar assets.
6. Publicar assets, incluido `os-page-org-v2.js` y `os-org-v2.css`.
7. Actualizar Web Page `/os` respetando el orden:

```text
os-page-org-v2.js
os-page-org.js
```

8. Ejecutar:

```bash
python scripts/verify.py
```

9. Ejecutar checklist funcional de `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.
10. Sólo después promover a producción.

## Modo Bench / Bridge

Después de actualizar el Custom App y hacer el procedimiento de Bench documentado en `DEPLOYMENT.md`, el hook `OS Org Relation.validate` activa validación server-side 2.0.

Las relaciones previas no se borran; nuevas/alteradas relaciones `REPORTS_TO` deben cumplir la matriz semántica, un único padre y no crear ciclos.

## Modo API-only

El schema y el frontend 2.0 se despliegan por REST sin SSH/Bench.

La validación preventiva funciona en el portal, pero los hooks Python de `livingorg_bridge` no existen en un sitio API-only. No afirmar que la regla semántica es imposible de evadir vía REST mientras no haya un runtime server-side equivalente.

## Rollback lógico

El rollback del frontend puede hacerse sin tocar los datos creados por 2.0:

1. desplegar el código de `archive/organigrama-v1-stable`; o
2. restaurar `portal/pages/os-web-page.html` para que sólo cargue la implementación 1.x.

No es necesario eliminar los nuevos campos de DocType para que 1.x funcione. Se recomienda **dejarlos instalados** durante rollback para evitar pérdida de datos capturados en 2.0.

## Rollback de Bridge

Si se necesita regresar también la lógica server-side:

1. volver al commit/branch anterior del Custom App;
2. ejecutar el procedimiento de actualización/migrate del modo Bench;
3. NO eliminar campos nuevos ni registros creados por v2.

## Invariantes

Después de migrar o hacer rollback deben seguir siendo verdad:

- `OS Org Node` y `OS Org Relation` históricos existen.
- Ningún puesto desaparece al desasignar una persona.
- Ninguna Role Card se elimina al cambiar de ocupante.
- Process Studio sigue siendo independiente.
- No se modifica core ERPNext/Frappe.
- El branch de archivo permanece apuntando al commit previo.
