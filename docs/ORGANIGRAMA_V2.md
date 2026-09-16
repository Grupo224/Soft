# Organigrama Vivo 2.0 — arquitectura y guía de mantenimiento

**Estado:** CURRENT STABLE del módulo Organigrama Vivo en la rama `release/organigrama-v2.0`.

**Versión anterior preservada:** `archive/organigrama-v1-stable` → commit `a2b7b88ae3dbbf38b1c93a466c9419e7977af19f`.

## 1. Objetivo

Organigrama Vivo 2.0 transforma `/os#/org` de una interfaz técnica de “nodos y relaciones” en un mapa operativo de la empresa:

```text
Empresa
  └── Departamento
        ├── Subdepartamento
        └── Puesto
              ├── Puesto subordinado
              ├── Persona
              └── Agente IA
```

La Persona ocupa un Puesto. La Persona no es el Puesto. La información institucional (misión, responsabilidades, KPIs, procesos, SOPs y documentos) permanece ligada al Puesto aunque cambie la persona.

## 2. Estrategia de compatibilidad

No se reescribió ni eliminó `portal/assets/js/pages/os-page-org.js`.

La versión 2.0 vive en:

- `portal/assets/js/pages/os-page-org-v2.js`
- `portal/assets/css/os-org-v2.css`

`portal/pages/os-web-page.html` carga `os-page-org-v2.js` **antes** de `os-page-org.js`. El router de LivingOrg devuelve la primera ruta coincidente, por lo que `/org` usa v2 mientras el código 1.x queda preservado en la misma historia Git y en la rama de archivo.

No inviertas este orden salvo que quieras regresar deliberadamente a la implementación 1.x.

## 3. Modelo de datos

### OS Org Node

Se conserva como representación visual. Tipos principales:

- `Company` → Empresa
- `Department` → Departamento
- `Designation` → Puesto
- `Employee` → Persona
- `Agent` → Agente IA
- `Custom` → compatibilidad/avanzado

`title` es el **nombre visual canónico del Organigrama**.

Los campos `company`, `department`, `designation`, `employee` y `agent` son referencias a la fuente ERPNext. Ya no tienen prioridad sobre `title` al pintar una card.

### OS Org Relation

Se conserva. `REPORTS_TO` define la jerarquía primaria y se almacena `child -> parent`.

Las relaciones secundarias (`COLLABORATES_WITH`, `SUPPORTS`, etc.) continúan disponibles en **Avanzado**.

### OS Role Card

Es el cerebro operativo del Puesto. 2.0 agrega de forma aditiva:

- `org_node`
- `purpose`
- `objectives`
- `functions`
- `competencies`
- `tools`
- `process_refs` (resumen compatible)
- `sop_refs` (resumen compatible)

Campos previos (`mission`, `expected_results`, `responsibilities`, `kpis`, etc.) se conservan.

La búsqueda de Role Card en frontend prioriza `org_node`; si una ficha histórica todavía no tiene ese campo poblado, usa `designation` como fallback. El siguiente guardado puede completar `org_node` sin borrar la ficha anterior.

### OS KPI Definition

2.0 agrega:

- `org_node`
- `role_card`
- `designation`
- opciones `Position` y `RoleCard` en `entity_type`

El textarea `OS Role Card.kpis` se conserva como resumen legacy. Los KPIs nuevos pueden ser estructurados.

### OS Process

No se duplica Process Studio. El Puesto usa `OS Process.responsible_node` / `org_area` para mostrar procesos relacionados y navegar a `/processes/:name`.

### OS SOP

2.0 agrega `responsible_node` para vincular el procedimiento al Puesto. El editor SOP permanece independiente.

### Documentos

Los archivos del Puesto se adjuntan a `OS Role Card` usando el `File` nativo de Frappe y `upload_file`. No se guardan en el nodo Employee, por lo que sobreviven al cambio de persona.

## 4. Reglas semánticas

Experiencia principal:

```text
Company      -> Department
Department   -> Department | Designation
Designation  -> Designation | Employee | Agent
Employee     -> (ningún hijo jerárquico)
Agent        -> (ningún hijo jerárquico)
```

La UI evita mostrar acciones inválidas. El drag también valida la matriz antes de crear la relación.

Con `livingorg_bridge` instalado, `governance.validate_org_relation` impone en servidor:

1. no auto-relación;
2. matriz válida de tipos;
3. un único padre `REPORTS_TO`;
4. prevención de ciclos.

### API-only

El modo API puede desplegar schema + portal sin Bench. Sin un runtime server-side equivalente, las reglas semánticas de Organigrama son preventivas en frontend pero no constituyen por sí solas una barrera contra un cliente REST malicioso. No documentar API-only como “server-enforced” mientras ese runtime no exista.

## 5. Bug de nombres reparado

1.x usaba una función que priorizaba:

```text
employee / agent / designation / department / company / title
```

El inspector, en cambio, guardaba el nombre visual en `title`. Por eso el PUT podía ser correcto y aun así la card seguía mostrando el vínculo ERPNext.

2.0 separa responsabilidades:

- `getDisplayTitle(node)` → `title` primero;
- `getSourceLabel(node)` → entidad ERPNext vinculada;
- `getSearchLabel(node)` → concatena ambas para búsqueda.

Nunca vuelvas a unir estas tres responsabilidades en un único `label()` genérico.

## 6. UX 2.0

Toolbar principal:

- `+ Departamento`
- Ajustar
- Zoom
- Vista
- Avanzado
- advertencias
- búsqueda y filtro

`+ Nodo` y `+ Relación` no fueron eliminados conceptualmente; viven en **Avanzado**.

### Sidebar

Un clic en la card conserva el patrón de Inspector actual.

Puesto:

- Resumen
- Rol
- Personas
- KPIs
- Procesos
- SOPs
- Documentos

Departamento:

- Resumen
- Estructura

Persona:

- Resumen
- Persona

## 7. Archivos que un programador debe conocer

### Modificar con cuidado

- `portal/assets/js/pages/os-page-org-v2.js` — UX / reglas cliente de v2.
- `portal/assets/css/os-org-v2.css` — capa visual v2.
- `erpnext_setup/doctypes/os_role_card.json` — ficha de puesto.
- `erpnext_setup/doctypes/os_kpi_definition.json` — KPI estructurado.
- `erpnext_setup/doctypes/os_sop.json` — vínculo SOP ↔ puesto.
- `frappe_app/livingorg_bridge/livingorg_bridge/governance.py` — reglas server-side.
- `frappe_app/livingorg_bridge/livingorg_bridge/hooks.py` — activación de reglas.

### Reutilizar; no reescribir por comodidad

- `portal/assets/js/os-canvas.js`
- `portal/assets/js/os-api.js`
- `portal/assets/js/os-core.js`
- `portal/assets/js/pages/os-page-processes.js`
- `portal/assets/js/pages/os-page-sop.js`

### Legacy preservado

- `portal/assets/js/pages/os-page-org.js`

No agregar `_old`, `_backup`, `_final2`. Git mantiene el histórico.

## 8. Decisiones deliberadas

### No se crea un nuevo “Position” DocType

ERPNext `Designation` sigue representando el Puesto. `OS Role Card` añade el contrato operativo; `OS Org Node` añade la posición visual/contextual.

### No se actualiza automáticamente Employee al asignarlo visualmente

Asignar una Persona crea/vincula un nodo `Employee` al Puesto del Organigrama. No cambia silenciosamente `Employee.designation` o `Employee.department`. Cambiar maestros ERPNext debe ser una acción explícita con sus propios permisos y reglas.

### No se migran relaciones existentes automáticamente

Las relaciones históricas fuera de la matriz 2.0 se muestran como advertencia. No se borran ni transforman durante el update.

## 9. Convenciones para cambios futuros

- Preferir cambios aditivos de schema.
- Mantener `title` como display name del Organigrama.
- No duplicar Process Studio ni SOP Builder dentro de `/org`.
- Validación crítica: frontend para prevención + servidor cuando el runtime lo permita.
- Nuevas capacidades deben incluir actualización de `scripts/validate_org_v2.py`.
- Antes de declarar una nueva versión estable, ejecutar `docs/ORGANIGRAMA_TESTING_2.0.md`.
