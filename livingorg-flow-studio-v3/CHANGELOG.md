# Changelog — LivingOrg Flow Studio

Historial de versiones del editor de procesos autocontenido (HTML/CSS/JS vanilla, sin backend).

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [v3] — 2026-09-09 · Biblioteca multi-proceso + exportación

Evoluciona la versión anterior hacia un editor utilizable por sí mismo.

### Añadido
- **Biblioteca multi-proceso**: "Procesos" como lista (crear, abrir, duplicar, eliminar) persistida en `localStorage`.
- **Exportar / Importar JSON**: portabilidad y respaldo de la definición del proceso.
- **Exportar SVG / PNG**: salida visual del diagrama.
- **Comando global (`⌘K` / `Ctrl+K`)**: búsqueda de módulos, acciones y nodos.
- **Modal de atajos de teclado** (`?`).
- **Fluidez UX/UI**: micro-interacciones, transiciones y persistencia del colapso de la sidebar.

## [v2] — Control Room Edition (base)

Prototipo autocontenido con:
- 15 módulos navegables (Centro de Mando, Organigrama, Procesos, SOPs, Plantillas, Ejecución, Mi Trabajo, Aprobaciones, Agentes IA, Prompts, Skills, Conocimiento, Conexiones, Analítica, Gobierno).
- Canvas BPMN con 10 tipos de nodo, conexiones, inspector, zoom/pan, undo/redo y auto-ordenado.
- Tema Control Room claro/oscuro.

## [v1] — LivingOrg OS (antecesor)

App completa: portal ERPNext + 20 Custom DocTypes + Organigrama Vivo + Process Studio + SOP Builder + Centro de Ejecución + gobierno (Agentes/Prompts/Integraciones/Roles/KPIs/Políticas). Ver el `CHANGELOG.md` raíz del repositorio.
