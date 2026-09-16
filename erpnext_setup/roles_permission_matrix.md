# Matriz de roles y permisos — LivingOrg OS

Fuente humana de referencia. La fuente ejecutable es `scripts/permissions.py`. R=Read, W=Write, C=Create, D=Delete.

| DocType | OS Admin | OS Architect | OS Publisher | OS AI Supervisor | OS Manager | OS Operator | OS Auditor | OS Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| OS Org Node | RWCD | RWC | R | R | RW | R | R | R |
| OS Org Relation | RWCD | RWC | R | R | RW | R | R | R |
| OS Role Card | RWCD | RWC | R | R | RW | R | R | R |
| OS Process | RWCD | RWC | RW | R | R | R | R | R |
| OS Process Step* | RWCD | RWC | RW | R | R | R | R | R |
| OS Process Action* | RWCD | RWC | RW | R | R | R | R | R |
| OS Process Edge* | RWCD | RWC | RW | R | R | R | R | R |
| OS Process Goal* | RWCD | RWC | RW | R | R | R | R | R |
| OS SOP | RWCD | RWC | RW | R | R | R | R | R |
| OS SOP Step* | RWCD | RWC | RW | R | R | R | R | R |
| OS Prompt | RWCD | R | R | RWCD | R | – | R | R |
| OS Agent | RWCD | R | R | RWCD | R | – | R | R |
| OS Run | RWCD | R | R | R | RW | R | R | R |
| OS Step Run | RWCD | R | R | R | RW | RW (asignados) | R | R |
| OS Document Link | RWCD | R | R | R | R | R (sus pasos) | R | R |
| OS Evidence | RWCD | R | R | R | RW | RWC (propias) | R | R |
| OS Approval | RWCD | R | R | R | RW | RW (si es aprobador) | R | R |
| OS KPI Definition | RWCD | RWC | R | R | R | – | R | R |
| OS Integration | RWCD | – | – | R | – | – | R | R |
| OS Knowledge Source | RWCD | RWC | R | RWC | R | R | R | R |
| OS Skill | RWCD | RWC | R | RWC | R | – | R | R |
| OS Policy | RWCD | – | – | R | RW | R | R | R |

\* Child tables heredan el acceso efectivo del documento padre. Las filas se mantienen por consistencia y para versiones de Frappe que las muestran en Permission Manager.

## Reglas server-side

`livingorg_bridge` añade restricciones que la matriz por sí sola no puede expresar:

- `OS Step Run`: un Operator sólo puede consultar/modificar pasos asignados a su usuario o a uno de sus roles.
- `OS Approval`: un Operator sólo puede decidir solicitudes dirigidas a su usuario/rol.
- `OS Document Link`: un Operator sólo ve vínculos pertenecientes a sus Step Runs.
- `OS Run`: los roles de negocio no reciben Create directo; los runs se crean mediante el endpoint controlado del Bridge.
- documentos ERPNext (`Sales Invoice`, `Sales Order`, etc.): conservan siempre sus permisos nativos; LivingOrg no los eleva.

## Multiempresa

Usa User Permission por `Company` y las reglas normales de ERPNext para segmentar datos empresariales. LivingOrg no debe convertirse en un mecanismo alterno de aislamiento de Company.

## Nunca Guest

Ningún DocType OS ni endpoint operativo admite Guest. `/os` requiere sesión autenticada.
