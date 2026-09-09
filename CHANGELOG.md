# Changelog — LivingOrg OS (Grupo Altoplano)

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado semántico (`MAJOR.MINOR.PATCH`).

## [Unreleased]

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
- **BUG-01 [P0]** — `process` como fieldname colisionaba con el método interno
  `Meta.process()` de Frappe, bloqueando la creación por API de `OS SOP`,
  `OS Run`, `OS Knowledge Source` y `OS Approval`. Renombrado a `process_ref`
  en los 4 DocTypes y en todo el JS que lo referenciaba.
- **BUG-02 [P0]** — Organigrama Vivo entraba en recursión infinita
  (`Maximum call stack size exceeded`) con relaciones circulares
  (A reporta a B, B reporta a A). `buildHierarchy()` ahora detecta y corta el
  ciclo; `treeLayout()`/`subtreeIds()` llevan guarda de visitados.
- **BUG-03 [P1]** — Process Studio no permitía conectar pasos de forma
  intuitiva. Se agrega conectar arrastrando desde el puerto de un paso hasta
  otro (drag-to-connect), además del modo "Conectar" existente con
  indicación visual más clara.
- **DIS-01 [P2]** — En las tarjetas del Organigrama, el punto de estado y el
  chevron de expandir se sobreponían al texto cuando el título o subtítulo
  eran largos. Ahora el texto trunca con elipsis y se reserva espacio fijo
  para ambos controles.
- **DIS-02 [P3]** — `os-core.js` declaraba la clave `"AI→H"` dos veces en el
  mapa de `badgeExec`. Eliminada la duplicada.
- **MOV-01 [P1]** — `livingorg-os/` no ocultaba la barra lateral en móvil
  (solo colapsaba a 76px en escritorio). Se agrega el mismo patrón off-canvas
  del portal ERPNext: `@media(max-width:720px)` con `transform`, botón
  hamburguesa y scrim.
- **MOV-02 [P2]** — Auditoría de responsivo del portal ERPNext tras el reskin
  visual en 390/720/1080px (topbar, hero, tablas, toolbar del lienzo,
  asistente de Procesos). Se encontraron y corrigieron dos desbordes reales
  introducidos por el reskin: (1) la fila "Mapa de ejecución" / "Health
  Score" del Centro de Mando fijaba `grid-template-columns:1.6fr 1fr` por
  estilo en línea, que no colapsaba a una columna en móvil como el resto de
  las grillas — se movió a la clase `.os-grid-mid`, sí cubierta por el
  `@media(max-width:720px)` existente; (2) el pie del asistente de "Nuevo
  proceso" (Cancelar / Guardar borrador / Siguiente) recortaba el botón
  "Cancelar" en pantallas ≤560px por falta de `flex-wrap` — ahora envuelve en
  dos filas.
- **UX-01 [P2]** — El colapso de barra lateral en escritorio del portal
  ERPNext no recordaba su estado entre recargas. Ahora persiste en
  `localStorage` (aplicado antes del primer pintado, sin parpadeo) con
  `aria-expanded`/`aria-label`, mismo patrón que ya existía en
  `livingorg-os/`.
- **DOC-01 [P2]** — `README_INSTALACION.md` indicaba pegar el contenido del
  Web Page en "el campo HTML"; en Frappe v15 el campo real es
  `main_section_html` (distinto de `main_section`, que es para
  Markdown/Rich Text). Corregido y aclarado.
- **DOC-02 [P2]** — El orden de creación de DocTypes listaba `OS SOP Step` en
  la posición 4, antes de `OS Prompt`/`OS Agent`, a los que enlaza — falla la
  validación de Link tanto por Desk como por API. Reordenado
  topológicamente contra los 20 `.json` reales; se documenta además la única
  referencia circular genuina del modelo (`OS Process` ↔ `OS SOP`) y cómo
  resolverla en dos pasadas.

### Pendiente documentado
- **UX-02 [P3]** — Selector de tema claro/oscuro unificado entre el portal
  ERPNext (solo claro) y el standalone (claro/oscuro). Ver
  `docs/ARQUITECTURA.md` § Pendientes.

## [1.0.0] — Punto de partida de esta auditoría

Estado del repositorio antes de aplicar las correcciones anteriores — incluye
todo el trabajo previo: portal HTML/CSS/JS sobre ERPNext/Frappe con 20 Custom
DocTypes, Organigrama Vivo, Process Studio (lienzo BPMN + asistente de
Procesos con SIPOC/RACI/metas), SOP Builder, Centro de Ejecución, gobierno
(Agentes/Prompts/Integraciones/Roles/KPIs/Políticas), reskin visual con la
identidad Grupo Altoplano, y el prototipo standalone `livingorg-os/` con el
mismo módulo de Procesos rediseñado. Ver `docs/ARQUITECTURA.md` para el
detalle completo.
