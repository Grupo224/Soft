# LivingOrg Flow Studio · Control Room Edition

Prototipo visual autocontenido del editor de procesos de LivingOrg/Altoplano.

## Incluye

- Tema Altoplano Control Room.
- Sidebar global rediseñada.
- Canvas con grid, zoom, desplazamiento y reencuadre.
- Nodos semánticos de inicio, tarea, sistema, IA, decisión y fin.
- Conexiones con etiquetas de condición.
- Paleta de nodos.
- Inspector lateral contextual.
- Autoordenado vertical, horizontal y por responsables.
- Undo/redo.
- Guardado local con estado visible.
- Modo móvil con sidebar, paleta e inspector adaptables.
- Atajos de teclado y estados accesibles.
- Módulos navegables con datos de revisión y códigos operativos:
  - Centro de Mando (`CMD-ALTO-001`).
  - Organigrama Vivo (`ORG-CANVAS-001`).
  - Procesos (`PROC-COM-001`).
  - SOPs (`SOP-LIB-001`, `SOP-COM-001`).
  - Plantillas (`TPL-LIB-001`).
  - Centro de Ejecución (`RUN-CENTER-001`).
  - Mi Trabajo (`TASK-QUEUE-001`).
  - Aprobaciones (`APP-INBOX-001`).
  - Agentes IA (`AGENT-ROSTER-001`).
  - Prompts (`PROMPT-LIB-001`).
  - Skills (`SKILL-LIB-001`).
  - Conocimiento (`KNOWLEDGE-001`).
  - Conexiones (`INTEGRATIONS-001`).
  - Analítica (`ANL-PROC-001`).
  - Gobierno (`GOV-ALTO-001`).
- Relación cruzada entre proceso, SOP, agente, conexiones, KPIs y auditoría.

La carpeta `legacy-source/` conserva una copia del código entregado en el ZIP original para facilitar la comparación y posterior integración.

## Visualizar

Abre `index.html` en un navegador moderno. No requiere instalación ni servidor y no depende de librerías externas.

Para una revisión rápida en un solo archivo, abre `livingorg-flow-studio-all-modules.html`. Esta versión autónoma incluye CSS, JavaScript, navegación por hash y datos de todos los módulos sin depender de archivos adicionales.

## Atajos

- `N`: abrir paleta de nodos.
- `C`: activar conexión.
- `F`: reencuadrar el diagrama.
- `V`: modo selección.
- `Ctrl/Cmd + Z`: deshacer.
- `Ctrl/Cmd + Shift + Z`: rehacer.
- `Delete`: eliminar el nodo seleccionado.
- `Escape`: cerrar paneles o cancelar conexión.

## Integración posterior

La demo separa el estado semántico del render visual para facilitar una futura integración con `LODiagramEngine`, maxGraph y persistencia versionada en Frappe/ERPNext. El JSON del proceso se conserva en `localStorage` únicamente para la visualización.

## Datos de módulos

La configuración demostrativa de módulos vive en `js/module-data.js`. El render y la navegación están en `js/app.js`; el sistema visual y los breakpoints responsive están en `styles.css`. Esto permite reemplazar los arreglos de ejemplo por endpoints reales sin rediseñar la interfaz.

---

## v3 · Mejoras aplicadas (2026-09-09)

- **Biblioteca multi-proceso**: "Procesos" ahora es una lista con crear, abrir, duplicar y eliminar (persistida en `localStorage`).
- **Exportar / Importar JSON**: descarga y carga la definición completa de un proceso.
- **Exportar SVG / PNG**: exporta el diagrama como imagen.
- **Comando global (`⌘K` / `Ctrl+K`)**: búsqueda funcional de módulos, acciones y nodos.
- **Modal de atajos de teclado** (`?`).
- **Fluidez**: micro-interacciones, transiciones y persistencia de la sidebar.

---

## v5 · Versión FUNCIONAL (formularios de captura)

El archivo **`livingorg-flow-studio-all-modules.html`** es la versión funcional (un solo archivo,
autocontenido): integra los **formularios de captura** al tema Control Room.

- Captura real de: procesos (con pasos anidados, metas por cadencia, RACI, gates, risk), SOPs,
  empleados, agentes IA, prompts, skills, fuentes de conocimiento, ejecuciones, tareas,
  aprobaciones, evidencias, relaciones, conexiones, KPIs y políticas.
- Guardado local en `localStorage` (clave `livingorg.capture.v1`) para probar el flujo completo.
- Navegación por hash, tema claro/oscuro, y los 15 módulos con formularios de alta.
- Deploy: se sirve como `main_section_html` del Web Page `livingorg-flow-studio-v3` (ruta `/livingorg-v3`).

El resto de archivos (`index.html`, `js/`, `styles.css`) son la demo visual anterior.
