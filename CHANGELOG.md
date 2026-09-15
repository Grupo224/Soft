# Changelog — LivingOrg OS (Grupo Altoplano)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado semántico (`MAJOR.MINOR.PATCH`).

## [Unreleased]

### Seguridad
- Eliminadas credenciales y rutas locales hardcodeadas de los scripts de deployment actuales; configuración por variables de entorno.
- `reinstall.py` y `cleanup_data.py` requieren doble confirmación para acciones destructivas.
- Permisos efectivos de DocTypes normalizados desde `scripts/permissions.py`; Viewer/Auditor quedan read-only en el deployment soportado.
- Añadida sanitización allowlist para rich HTML, URLs y preview de SOP.
- `os-api.js` detecta excepciones Frappe dentro de HTTP 200 y mantiene correlation log acotado sin payloads sensibles.

### Estabilidad / deployment
- Nuevo entrypoint canónico `scripts/deploy.py`, idempotente y con `--dry-run`.
- `install.py`, `update.py`, `update_v2.py` y `deploy_standalone.py` conservados como wrappers DEPRECATED compatibles.
- Cliente REST reutilizable en `scripts/frappe_client.py` con timeout y reintentos acotados.
- `seed_demo.py` deja de hardcodear secretos y evita duplicados clave.
- Añadida validación estática y workflow de GitHub Actions.

### Frontend / responsive
- Capa `os-hardening.css` para 430/360/320 px, modales, inspector, toolbars, tablas y contención de overflow.
- `prefers-reduced-motion` soportado en la capa de hardening.
- Capa `os-hardening.js` mantiene compatibilidad sin reescribir módulos existentes.

### Auditoría
- `OS Step Run` incorpora campos snapshot aditivos para versión, instrucciones, SOP, prompt y policy.
- Documentación completa de instalación, deployment, rollback, seguridad, compatibilidad y agentes IA.

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
