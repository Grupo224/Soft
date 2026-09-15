# Changelog — LivingOrg OS (Grupo Altoplano)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado semántico (`MAJOR.MINOR.PATCH`).

## [Unreleased]

### Correcciones de portal y guardado (2026-09-15)
- **Escrituras del portal (`/os`)**: la Web Page se servía con `frappe.csrf_token = "None"` y sin meta `csrf-token`, así que todo POST/PUT/DELETE de una sesión autenticada fallaba en silencio. `os-api.js` ahora precarga el token real de sesión desde el endpoint `livingorg_api_csrf`, lo cachea, descarta valores inválidos (`None`, `null`, plantilla) y `os-core.js` distingue "sin sesión" de "sin conexión" en el arranque.
- **Guardado de procesos (`/os#/processes`)**: un valor inexistente en un campo Link devolvía el error crudo del motor (`No se pudo encontrar Compañía: 1, Owner User: 1`, HTTP 417) y el asistente se cerraba perdiendo lo capturado. Ahora el asistente permanece abierto si el servidor rechaza el registro, el mensaje se traduce a algo accionable (*«1» no existe en Compañía*) y los campos Link ofrecen sugerencias al enfocar en lugar de esperar texto tecleado.

### Documentación
- Nueva guía maestra **`docs/INSTALACION_ERPNext_VIRGEN.md`** — *el deber ser* para instalar en un ERPNext virgen: qué se instala y qué no se toca, preparación del sitio, usuario técnico y credenciales, 9 fases con candado verificable, smoke test técnico y de negocio, checklist de cero errores (con los fallos reales ya ocurridos y su corrección), ruta incremental en 5 entregas y plantilla de reporte.
- Declarada en `deployment/manifest.json` (`source_of_truth.deployment_guide`) y añadida al orden de lectura obligatorio de `deployment/README.md` y `deployment/openclaw/AGENT.md`; `scripts/validate_repo.py` la exige en CI.

### Operación ERPNext
- Nuevo Custom App `livingorg_bridge` sin modificaciones al core de ERPNext/Frappe.
- Nuevo child DocType `OS Process Action` para declarar acciones estructuradas por paso: abrir, crear, crear desde origen, actualizar, submit y vincular documentos.
- Nuevo DocType `OS Document Link` para registrar los documentos ERPNext reales producidos o usados por cada Step Run.
- `OS Process`, `OS Run` y `OS Step Run` reciben campos operativos aditivos mediante `scripts/schema_overlays.py`.
- Process Studio incorpora **Acciones ERPNext** de forma discreta y ejecución Test/Live.
- Mi Trabajo permite ejecutar acciones del paso y abrir el documento real resultante.
- Centro de Ejecución permite consultar los documentos ERPNext relacionados con un Run.
- Mappers nativos allowlist para Quotation → Sales Order, Sales Order → Delivery Note/Sales Invoice, Delivery Note → Sales Invoice y flujos Purchase Order/Purchase Receipt/Purchase Invoice.
- Runs crean Step Runs con snapshots de pasos y acciones para trazabilidad histórica.
- START/END simples se autoavanzan; las siguientes tareas se desbloquean según edges y predecesores.

### Gobierno server-side
- Transiciones de Step Run validadas por `livingorg_bridge`.
- Evidence-first y Approval-first se imponen en servidor, no sólo en JavaScript.
- Las aprobaciones pendientes se crean desde el runtime y sólo el usuario/rol solicitado puede decidirlas.
- Operadores quedan restringidos por `actor_user`/`actor_role` en Step Runs, Aprobaciones y Document Links.
- Las acciones de documentos respetan permisos nativos de ERPNext y rechazan campos reservados.
- No existe ejecución de métodos Python arbitrarios configurables desde el portal.

### Seguridad
- Eliminadas credenciales y rutas locales hardcodeadas de los scripts de deployment actuales; configuración por variables de entorno.
- `reinstall.py` y `cleanup_data.py` requieren doble confirmación para acciones destructivas.
- Permisos efectivos de DocTypes normalizados desde `scripts/permissions.py`; Viewer/Auditor quedan read-only en el deployment soportado.
- Añadida sanitización allowlist para rich HTML, URLs y preview de SOP.
- `os-api.js` detecta excepciones Frappe dentro de HTTP 200 y mantiene correlation log acotado sin payloads sensibles.
- Deployment API-first documentado como no destructivo por defecto; no elimina DocTypes/campos/datos ni expone secretos en frontend.

### Estabilidad / deployment
- Nuevo entrypoint canónico `scripts/deploy.py`, idempotente y con `--dry-run`.
- `--require-bridge` verifica que `livingorg_bridge` esté activo antes de considerar completo el deployment operativo.
- `install.py`, `update.py`, `update_v2.py` y `deploy_standalone.py` conservados como wrappers DEPRECATED compatibles.
- Cliente REST reutilizable en `scripts/frappe_client.py` con timeout y reintentos acotados.
- `seed_demo.py` deja de hardcodear secretos y evita duplicados clave.
- Añadida validación estática y workflow de GitHub Actions, incluyendo compilación del Custom App.
- Añadido contrato de deployment dual en `deployment/manifest.json`: `bench` y `api` comparten schema/frontend.
- Añadido modo API-first/OpenClaw sin SSH/Bench para sincronizar Module Def, roles, Custom DocTypes, permisos canónicos, assets y `/os` vía REST.
- Añadidos `scripts/preflight.py`, `scripts/deploy_api.py` y `scripts/verify.py` para preflight de sólo lectura, despliegue API explícito y clasificación de runtime `FULL`/`DEGRADED`.
- Añadida matriz de capacidades para diferenciar schema/portal vía API de hooks Python y runtime operativo real.
- `scripts/validate_repo.py` valida ahora el contrato dual, safe mode y archivos requeridos de ambos modos.
- Nuevo `deployment/server_scripts/` con los Server Scripts (API) que el portal necesita: `scripts/deploy.py` los publica de forma aditiva (crea si falta, nunca sobrescribe) y `scripts/verify.py` reporta el endpoint CSRF de sesión como `[portal] OK/WARN`.

### Frontend / responsive
- Capa `os-hardening.css` para 430/360/320 px, modales, inspector, toolbars, tablas y contención de overflow.
- `prefers-reduced-motion` soportado en la capa de hardening.
- Capa `os-hardening.js` mantiene compatibilidad sin reescribir módulos existentes.
- Nueva capa aditiva `os-operational.js` / `os-operational.css` para operación ERPNext sin reescribir Process Studio.

### Auditoría
- `OS Step Run` incorpora campos snapshot aditivos para versión, instrucciones, SOP, prompt, policy y acciones de sistema.
- Documentación completa de instalación, deployment, rollback, seguridad, compatibilidad, acciones operativas y agentes IA.
- OpenClaw recibe un contrato explícito de instalación/update/verify para no improvisar rutas, credenciales ni operaciones destructivas.

## [2.0.0] — 2026-09-15 — Organigrama Vivo 2.0

Versión recomendada del módulo `/os#/org`. Se construye sobre el modelo y canvas existentes, preserva la implementación 1.x y añade una UX contextual basada en **Empresa → Departamento → Puesto → Persona**.

### Added
- Nueva implementación aditiva `portal/assets/js/pages/os-page-org-v2.js`, cargada antes del módulo 1.x sin borrar `os-page-org.js`.
- Capa visual `portal/assets/css/os-org-v2.css` con toolbar contextual, estados vacíos, tabs del inspector y responsive específico.
- Acciones contextuales: Empresa → Departamento; Departamento → Puesto/Subdepartamento; Puesto → Persona/Puesto subordinado/Agente.
- Menú **Avanzado** para conservar creación técnica de elementos y relaciones sin exponerla como flujo principal.
- Sidebar por contexto con Resumen, Rol, Personas, KPIs, Procesos, SOPs y Documentos para puestos.
- Role Card ampliada de forma aditiva con `org_node`, propósito, objetivos, funciones, competencias, herramientas y referencias de compatibilidad.
- KPI estructurado por puesto mediante `org_node`, `role_card`, `designation` y nuevos tipos `Position`/`RoleCard`.
- Vínculo `OS SOP.responsible_node` para relacionar procedimientos con puestos sin mezclar SOP Builder con el organigrama.
- Documentos del puesto adjuntos a `OS Role Card` mediante `File` nativo de Frappe.
- Reglas semánticas de jerarquía para evitar relaciones organizacionalmente inválidas.
- Validación server-side de `OS Org Relation` en `livingorg_bridge`: tipo padre/hijo, un padre jerárquico y prevención de ciclos.
- `scripts/validate_org_v2.py` para validar contrato, schema aditivo, orden de carga, bug de display name y hooks.
- CI de `release/**` ejecuta el contrato Organigrama 2.0 además de validación general, compilación Python y sintaxis JavaScript.
- Documentación específica de arquitectura, migración/rollback y testing en `docs/ORGANIGRAMA_*.md`.

### Changed
- La experiencia principal deja de pedir al usuario que piense en `Node`, `Relation`, `Designation` o `REPORTS_TO`.
- `title` pasa a ser el nombre visual canónico del organigrama; la entidad ERPNext vinculada se muestra por separado.
- Las cards de Departamento y Puesto muestran información operativa de baja densidad: puestos/personas o ocupación/KPIs/procesos.
- La asignación de Employee a un Puesto no modifica silenciosamente `Employee.designation`, `Employee.department` ni `Employee.reports_to`.
- Process Studio y SOP permanecen como módulos independientes; el Organigrama sólo enlaza y navega hacia ellos.
- `deployment/manifest.json` declara versión 2.0, branch actual, versión previa preservada y capacidades reales de Bench/API.

### Fixed
- Corregido el bug donde editar `Nombre visible` guardaba `title` pero la card seguía mostrando `employee/designation/department/company` por prioridad de `label()`.
- Separadas las responsabilidades en `getDisplayTitle()`, `getSourceLabel()` y `getSearchLabel()` para evitar regresiones entre render, fuente ERPNext y búsqueda.
- La jerarquía ya no permite desde la UX crear combinaciones como Persona → Departamento o Departamento → Persona.

### Preserved
- `OS Org Node`.
- `OS Org Relation` y relaciones históricas existentes.
- `OS Role Card` y sus campos anteriores.
- `os-canvas.js` y su zoom, pan, fit y drag.
- prevención de ciclos cliente existente, reforzada en Bridge.
- expandir/contraer, búsqueda, filtros e inspector lateral.
- Process Studio separado.
- datos existentes: no se ejecuta migración destructiva ni transformación automática de relaciones.
- Implementación anterior `portal/assets/js/pages/os-page-org.js` y branch `archive/organigrama-v1-stable` en commit `a2b7b88ae3dbbf38b1c93a466c9419e7977af19f`.

### Deployment / Migration
- Rama nueva: `release/organigrama-v2.0`.
- Rama de recuperación 1.x: `archive/organigrama-v1-stable`.
- Actualización de schema exclusivamente aditiva para Role Card, KPI y SOP.
- Relaciones históricas incompatibles se advierten; **no se migran ni eliminan automáticamente**.
- Ver `docs/ORGANIGRAMA_MIGRATION_2.0.md` y `docs/ORGANIGRAMA_TESTING_2.0.md` antes de promover a producción.

## [Flow Studio v3] — 2026-09-09

Nueva generación del editor de procesos **Flow Studio** (autocontenido, sin backend),
evolución del editor de LivingOrg OS hacia una herramienta utilizable por sí misma.
Carpeta: `livingorg-flow-studio-v3/`.

### Añadido
- **Biblioteca multi-proceso**: "Procesos" como lista (crear, abrir, duplicar, eliminar) persistida en `localStorage`.
- **Exportar / Importar JSON**: portabilidad y respaldo del proceso.
- **Exportar SVG / PNG**: salida visual del diagrama.
- **Comando global (`⌘K` / `Ctrl+K`)**: búsqueda funcional de módulos, acciones y nodos.
- **Modal de atajos** (`?`) y persistencia del colapso de la sidebar.
- **Fluidez UX/UI**: micro-interacciones y transiciones.

## [1.1.0] — Auditoría de bugs y correcciones (Solicitud_Cambios_LivingOrgOS)

Corrige los 12 hallazgos de la auditoría técnica realizada sobre la instancia
demo (`demo.altoplano.mx`), tanto los que ya se habían parcheado ahí
directamente (ahora portados al repositorio, que es la fuente de verdad) como
los que quedaban pendientes de intervención en el código fuente.

### Corregido
- **BUG-01 [P0]** — `process` como fieldname colisionaba con el método interno `Meta.process()` de Frappe. Renombrado a `process_ref` en los DocTypes y JS afectados.
- **BUG-02 [P0]** — Organigrama Vivo protegida contra recursión infinita con relaciones circulares.
- **BUG-03 [P1]** — Process Studio agrega conexión drag-to-connect entre puertos.
- **DIS-01 [P2]** — Ajustes de tarjetas de Organigrama para títulos/subtítulos largos.
- **DIS-02 [P3]** — Eliminada clave duplicada `AI→H` en `badgeExec`.
- **MOV-01 [P1]** — Sidebar standalone off-canvas en móvil.
- **MOV-02 [P2]** — Correcciones responsive previas en Centro de Mando y asistente de Procesos.
- **UX-01 [P2]** — Persistencia del colapso de sidebar en escritorio.
- **DOC-01 [P2]** — Documentado `main_section_html` de Frappe v15.
- **DOC-02 [P2]** — Orden topológico de creación de DocTypes y ciclo `OS Process` ↔ `OS SOP` documentado.

### Pendiente documentado
- **UX-02 [P3]** — Selector de tema claro/oscuro unificado entre portal ERPNext y standalone.

## [1.0.0] — Punto de partida de esta auditoría

Portal HTML/CSS/JS sobre ERPNext/Frappe con Custom DocTypes, Organigrama Vivo,
Process Studio, SOP Builder, Centro de Ejecución, gobierno, reskin visual y
prototipos standalone. Ver `ARCHITECTURE.md` y `docs/ARQUITECTURA.md`.
