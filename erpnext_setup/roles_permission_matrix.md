# Matriz de roles y permisos — LivingOrg OS

Basada en el SOP técnico §6 y el blueprint §16.1. Configúrala en
**Role Permission Manager** para cada DocType `OS *`. R=Read, W=Write, C=Create, D=Delete.

| DocType             | OS Admin | OS Architect | OS Publisher | OS AI Supervisor | OS Manager | OS Operator | OS Auditor | OS Viewer |
|---------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| OS Org Node         | RWCD | RWC | R | R | RW | R | R | R |
| OS Org Relation     | RWCD | RWC | R | R | RW | R | R | R |
| OS Role Card        | RWCD | RWC | R | R | RW | R | R | R |
| OS Process          | RWCD | RWC (Draft/Pilot) | RW (publicar/retirar) | R | R (su área) | R | R | R |
| OS Process Step*    | RWCD | RWC | RW | R | R | R | R | R |
| OS Process Edge*    | RWCD | RWC | RW | R | R | R | R | R |
| OS SOP              | RWCD | RWC | RW | R | R | R | R | R |
| OS Prompt           | RWCD | R | R | RWCD | R | – | R | R |
| OS Agent            | RWCD | R | R | RWCD | R | – | R | R |
| OS Run              | RWCD | R | R | R | RW (su área) | R (asignados) | R | R |
| OS Step Run         | RWCD | R | R | R | RW (su área) | RW (asignados) | R | R |
| OS Evidence         | RWCD | R | R | R | RW | RWC (propias) | R | R |
| OS Approval         | RWCD | R | R | R | RW (su área) | RW (si es aprobador) | R | R |
| OS KPI Definition   | RWCD | RWC | R | R | R | – | R | R |
| OS Integration      | RWCD | – | – | R | – | – | R | R |
| OS Knowledge Source | RWCD | RWC | R | RWC | R | R | R | R |
| OS Skill            | RWCD | RWC | R | RWC | R | – | R | R |

\* Child tables: heredan el permiso efectivo del documento padre (`OS Process`);
configúralas igual por consistencia si tu versión de Frappe las expone en el
Permission Manager de forma independiente.

## Reglas de gobierno que la UI del portal ya refleja

- **Diseñar ≠ Publicar**: `OS Architect` puede crear/editar procesos en `Draft`/`Pilot`,
  pero llevar un proceso a `Active` (o `Retired`) queda reservado a `OS Publisher`
  (o `OS Admin`). Ajusta el permiso de escritura de `OS Process` si tu operación
  real exige bloquear el cambio de estado a nivel de campo (Property Setter sobre
  `status` con permission level, disponible desde Customize Form sin tocar el core).
- **Multi-empresa**: si el sitio maneja más de una `Company`, agrega además
  **User Permission** por `Company` a cada usuario (Desk → User Permission) para
  que las listas del portal (procesos, runs, organigrama) respeten el alcance real.
- **Nunca Guest**: ninguno de estos DocTypes debe otorgarse al rol `Guest`. El
  portal exige sesión autenticada (`OS.boot` bloquea el acceso si `frappe.auth.get_logged_user`
  devuelve `Guest`).
- **Auditoría**: `Track Changes` activo en todos los DocTypes "Normal" satisface
  el requisito de historial de cambios sin necesitar un motor de auditoría propio.
