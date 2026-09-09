/* ============================================================================
   LIVINGORG OS — CONFIGURACIÓN
   ----------------------------------------------------------------------------
   ESTE es el archivo que vas a editar el 90% del tiempo.
   Aquí se define QUÉ objetos maneja la plataforma (SOP, Proceso, Agente…),
   QUÉ campos tiene cada uno, y CÓMO se ve el menú.

   El "motor" (app.js) lee esta configuración y genera solo:
     • las tablas / listas
     • los formularios de "Crear" y "Editar"
     • el panel de detalle (el "contrato operativo")
     • los campos de texto amplios y la carga de documentos

   Para agregar un campo nuevo a un formulario: agrega una línea en "fields".
   Para agregar un módulo nuevo: copia un bloque de ENTITIES y agrégalo a NAV.
   No necesitas tocar app.js.
   ============================================================================ */

const LO = window.LO || (window.LO = {});

/* --- Identidad del producto (cámbiala libremente) ------------------------- */
LO.BRAND = {
  name: "LIVINGORG",
  suffix: "OS",
  tagline: "El sistema operativo vivo de tu empresa",
  tenant: "Grupo Altoplano",          // empresa activa (demo)
  workspaces: ["Altoplano · Mérida", "Altoplano · Orange County", "Moorty Cloud"],
};

/* --- Tipos de ejecución (Humano / IA / Sistema) --------------------------
   Es el "idioma" central del producto: cada paso declara quién ejecuta.
   `key` se guarda en la base; `label` es lo que ve el usuario.            */
LO.ACTOR_TYPES = {
  H:      { label: "Humano",         short: "H",    color: "#C8862F", desc: "La persona ejecuta de principio a fin." },
  "H+AI": { label: "Humano asistido", short: "H+IA", color: "#B87BD6", desc: "La IA prepara o sugiere; la persona decide y completa." },
  "AI->H":{ label: "IA supervisada",  short: "IA→H", color: "#8067EE", desc: "La IA ejecuta y entrega; un humano aprueba antes del efecto externo." },
  AI:     { label: "IA autónoma",     short: "IA",   color: "#6D5AE6", desc: "La IA ejecuta dentro de políticas y límites definidos." },
  SYS:    { label: "Sistema",         short: "SYS",  color: "#2E8FB0", desc: "Regla determinista, API o automatización sin razonamiento." },
};

/* --- Niveles de autonomía (escalera del blueprint) ----------------------- */
LO.AUTONOMY = {
  L0: { label: "L0 · Manual",             desc: "La IA no participa." },
  L1: { label: "L1 · Copiloto",           desc: "La IA sugiere; el humano ejecuta." },
  L2: { label: "L2 · Borrador + aprobación", desc: "La IA prepara la acción; el humano autoriza." },
  L3: { label: "L3 · Autonomía por excepción", desc: "La IA actúa en bajo riesgo; escala excepciones." },
  L4: { label: "L4 · Autonomía acotada",  desc: "La IA completa el flujo dentro de políticas y presupuesto." },
};

/* --- Estados operativos del nodo ----------------------------------------- */
LO.STATUSES = {
  draft:    { label: "Borrador",           color: "#7A8798", dot: "ring" },
  pilot:    { label: "Piloto",             color: "#8067EE", dot: "solid" },
  active:   { label: "Activo",             color: "#1F9D6B", dot: "solid" },
  degraded: { label: "Degradado",          color: "#E08A2B", dot: "solid" },
  blocked:  { label: "Bloqueado",          color: "#D84C4C", dot: "solid" },
  waiting:  { label: "Esperando",          color: "#4E7BD6", dot: "pulse" },
  retired:  { label: "Retirado",           color: "#AEB7C2", dot: "hollow" },
};

/* --- Riesgo --------------------------------------------------------------- */
LO.RISK = {
  low:    { label: "Bajo",   color: "#1F9D6B" },
  medium: { label: "Medio",  color: "#E08A2B" },
  high:   { label: "Alto",   color: "#D84C4C" },
};

/* ============================================================================
   TIPOS DE CAMPO disponibles para "fields" (referencia rápida):
     text        → una línea
     textarea    → varias líneas (amplio, crece solo)
     longtext    → texto MUY amplio (extra alto) para instrucciones / SOP
     number      → numérico
     date        → fecha
     select      → lista desplegable (usa `options` u `optionsFrom`)
     tags        → varias etiquetas (herramientas, KPIs, etc.)
     actor       → selector Humano/IA/Sistema (usa LO.ACTOR_TYPES)
     status      → selector de estado (usa LO.STATUSES)
     autonomy    → selector de nivel de autonomía
     risk        → selector de riesgo
     files       → CARGA DE DOCUMENTOS (.docx, .pdf, imágenes…) ★
     link        → referencia a otro objeto (usa `linkTo: "proceso"`)
     steps       → editor de pasos (nombre, quién ejecuta, rol, herramienta,
                   tiempo estimado y punto de control) — usado por Procesos
     metas       → editor de metas por cadencia (diaria/semanal/quincenal/
                   mensual) con métrica, objetivo, unidad, tolerancia y
                   responsable — usado por Procesos (ver sección 5 del
                   documento de rediseño)
   Propiedades opcionales de un campo:
     help        → texto de ayuda debajo del campo
     placeholder → texto guía dentro del campo
     required    → true si es obligatorio
     col         → 1 (media fila) o 2 (fila completa). Por defecto 2.
     section     → agrupa campos bajo un subtítulo
     options     → ["a","b"] para select/tags
     optionsFrom → "persona" para llenar el select con registros de esa entidad
   ============================================================================ */

LO.ENTITIES = {

  /* ---------------------------------------------------------------- ORG NODE */
  orgnode: {
    label: "Nodo de organización", plural: "Organigrama", icon: "org", color: "#6D5AE6",
    hidden: true, // se administra desde el canvas, no como lista genérica
    fields: [
      { key: "name",  label: "Nombre",        type: "text", required: true, col: 1 },
      { key: "type",  label: "Tipo",          type: "select", col: 1, options: ["Área","Rol","Persona","Agente IA"] },
      { key: "owner", label: "Responsable",   type: "text", col: 1, placeholder: "Quién responde por este nodo" },
      { key: "status",label: "Estado",        type: "status", col: 1 },
      { key: "mission",label: "Misión / propósito", type: "textarea", help: "¿Por qué existe este nodo? ¿Qué resultado produce?" },
      { key: "responsibilities", label: "Responsabilidades", type: "longtext" },
      { key: "kpis",  label: "KPIs",          type: "tags" },
      { key: "tools", label: "Herramientas",  type: "tags" },
      { key: "docs",  label: "Documentos",    type: "files", help: "Adjunta manuales, cartas de rol, políticas (.docx, .pdf…)." },
      { key: "employees", label: "Empleados vinculados", type: "tags", help: "IDs de empleados de este nodo." },
      { key: "agent_ref", label: "Agente IA vinculado", type: "link", linkTo: "agente", col: 1 },
      { key: "skill_refs", label: "Skills IA del nodo", type: "tags", col: 1 },
    ],
  },

  /* ------------------------------------------------------------------ PROCESO
     Esquema alineado al documento "Rediseño del Módulo de Procesos LIVINGORG
     OS" (SIPOC + BPMN + RACI + OKR/Hoshin + TWI). Los campos que ya existían
     se conservan tal cual (mismo `key`, misma información capturada); lo
     nuevo se agrega sin tocar lo anterior. La captura real de este objeto no
     usa este arreglo tal cual (ver openProcessWizard en app.js, que arma un
     asistente de 6 pasos con Modo Rápido / Modo Completo) — este esquema es
     la fuente única de verdad de qué campos existen, se validan y se listan
     en el detalle.                                                        */
  proceso: {
    label: "Proceso", plural: "Procesos", icon: "process", color: "#0FA3A3",
    listColumns: ["name","owner","status","risk","autonomy"],
    fields: [
      // — Sección 1 · Identidad y propósito (APQC / ISO 9001) —
      { key: "name",     label: "Nombre del proceso", type: "text", required: true, section: "Identidad y propósito",
        placeholder: "Ej. Lead → Cotización", help: "Nombre claro orientado a la acción." },
      { key: "code",     label: "Código / ID", type: "text", col: 1, help: "Identificador único para trazabilidad (opcional)." },
      { key: "area",     label: "Área / departamento", type: "link", linkTo: "orgnode", col: 1, help: "Ubica el proceso en el organigrama." },
      { key: "purpose",  label: "Propósito", type: "textarea",
        required: true, help: "Por qué existe y qué valor entrega. La brújula del proceso." },
      { key: "outcome",  label: "Resultado esperado", type: "textarea", help: "La salida de valor concreta cuando el proceso sale bien." },
      { key: "owner",    label: "Dueño / responsable (Aprobador)", type: "text", col: 1, required: true,
        help: "Único responsable rendidor de cuentas del proceso." },
      { key: "owner_employee", label: "Empleado dueño", type: "link", linkTo: "empleado", col: 1 },
      { key: "participants", label: "Equipo / empleados", type: "tags", help: "IDs de empleados participantes." },
      { key: "priority", label: "Criticidad", type: "select", col: 1, options: ["Baja","Media","Alta","Crítica"] },
      { key: "status",   label: "Estado", type: "status", col: 1, required: true },

      // — Sección 2 · Alcance y disparador (SIPOC) —
      { key: "trigger",  label: "Disparador (qué lo inicia)", type: "text", section: "Alcance y disparador (SIPOC)",
        required: true, help: "Qué activa el proceso: una solicitud, una fecha, un webhook." },
      { key: "frequency",label: "Frecuencia de ejecución", type: "select", col: 1,
        options: ["Bajo demanda","Diaria","Semanal","Quincenal","Mensual"] },
      { key: "clients",  label: "Cliente del proceso", type: "text", col: 1, help: "Quién recibe la salida y define si estuvo bien." },
      { key: "suppliers",label: "Proveedores", type: "tags", help: "Quién provee los insumos (interno o externo)." },
      { key: "inputs",   label: "Entradas / insumos", type: "tags", required: true, help: "Qué se necesita para poder ejecutar." },
      { key: "outputs",  label: "Salidas / entregables", type: "tags", required: true, help: "Qué produce el proceso." },
      { key: "scope",    label: "Incluye / no incluye", type: "textarea", help: "Alcance explícito: evita zonas grises." },

      // — Sección 3 · Pasos y ejecución (Trabajo estándar / TWI + BPMN) —
      { key: "steps",    label: "Pasos del proceso", type: "steps", section: "Pasos y ejecución", required: true,
        help: "Secuencia ordenada. Cada paso declara quién ejecuta: Humano, IA o Sistema." },
      { key: "autonomy", label: "Autonomía máxima de la IA", type: "autonomy", col: 1 },
      { key: "rules",    label: "Reglas de decisión", type: "textarea", col: 1, help: "Bifurcaciones: si pasa X, entonces Y." },
      { key: "exceptions", label: "Excepciones y manejo", type: "textarea", col: 1, help: "Qué hacer cuando algo se sale de lo normal." },

      // — Sección 4 · Roles y gobierno (RACI + control) —
      { key: "raci_r",   label: "Responsable (R)", type: "text", col: 1, section: "Roles y gobierno (RACI)", help: "Quién ejecuta el trabajo." },
      { key: "raci_a",   label: "Aprobador (A)", type: "text", col: 1, help: "Quién autoriza; suele ser el dueño." },
      { key: "raci_c",   label: "Consultado (C)", type: "tags", col: 1, help: "A quién se consulta antes de decidir." },
      { key: "raci_i",   label: "Informado (I)", type: "tags", col: 1, help: "A quién se notifica del resultado." },
      { key: "responsible", label: "Responsable vinculado (organigrama)", type: "link", linkTo: "orgnode",
        help: "Persona o rol del organigrama que responde por este proceso." },
      { key: "risk",     label: "Riesgo", type: "risk", col: 1, required: true },
      { key: "gates",    label: "Puntos de aprobación (gates)", type: "textarea", col: 1, help: "Dónde el proceso se detiene a esperar autorización." },
      { key: "controls", label: "Controles", type: "textarea", help: "Salvaguardas que reducen el riesgo." },
      { key: "sop",      label: "SOP vinculado", type: "link", linkTo: "sop", help: "Procedimiento detallado de respaldo." },

      // — Sección 5 · Metas y medición (OKR / KPI / SLA) —
      { key: "kpis",     label: "KPIs del proceso", type: "tags", section: "Metas y medición", required: true },
      { key: "sla",      label: "SLA / tiempo objetivo", type: "text", col: 1, placeholder: "Ej. 4 h hábiles" },
      { key: "metas",    label: "Metas por cadencia", type: "metas", required: true,
        help: "Diaria, semanal, quincenal y mensual — la meta mensual puede descomponerse en cascada." },
      { key: "dod",      label: "Definición de Hecho (DoD)", type: "textarea", required: true, help: "Criterio inequívoco de terminación correcta." },
      { key: "evidence", label: "Evidencia requerida", type: "files", help: "Qué debe guardarse para probar que el proceso se ejecutó bien." },
      { key: "tools",    label: "Herramientas / conectores", type: "tags" },

      // — Sección 6 · Mejora continua (Kaizen / PDCA) —
      { key: "version",  label: "Versión", type: "text", col: 1, section: "Mejora continua", placeholder: "v1.0" },
      { key: "review",   label: "Próxima revisión", type: "date", col: 1 },
      { key: "changelog",label: "Historial de cambios", type: "textarea", help: "Qué cambió y por qué." },
      { key: "kaizen",   label: "Oportunidades de mejora", type: "textarea", help: "Desperdicios (Muda) e ideas detectadas." },
      { key: "docs",     label: "Documentos de respaldo", type: "files", help: "Plantillas, formatos, capturas, manuales." },
    ],
  },

  /* ---------------------------------------------------------------------- SOP
     ★ El objeto estrella. Campos amplios + carga de documentos.            */
  sop: {
    label: "SOP", plural: "SOPs", icon: "sop", color: "#4E7BD6",
    listColumns: ["name","owner","status","version"],
    createTitle: "Registrar SOP",
    createHint: "Un SOP es un objeto vivo, no un PDF perdido. Documenta el procedimiento y adjunta los archivos que lo respaldan.",
    fields: [
      { key: "name",    label: "Nombre del SOP", type: "text", required: true, placeholder: "Ej. Calificación de oportunidad comercial" },
      { key: "process", label: "Proceso relacionado", type: "link", linkTo: "proceso", col: 1 },
      { key: "owner",   label: "Owner", type: "text", col: 1 },

      { key: "objective", label: "1 · Objetivo", type: "textarea", section: "Contenido del SOP",
        required: true, help: "Resultado que debe producirse." },
      { key: "scope",     label: "2 · Alcance", type: "textarea", help: "Cuándo aplica y cuándo NO." },
      { key: "trigger",   label: "3 · Trigger", type: "textarea", help: "Evento que lo inicia." },
      { key: "inputs",    label: "4 · Entradas", type: "textarea", help: "Información y documentos necesarios." },
      { key: "roles",     label: "5 · Roles", type: "textarea", help: "Owner, ejecutores, aprobadores y escalación." },
      { key: "tools",     label: "6 · Herramientas", type: "tags", help: "Sistemas y permisos requeridos." },
      { key: "procedure", label: "7 · Procedimiento (paso a paso)", type: "longtext",
        required: true, help: "Pasos secuenciales, numerados y verificables. Este campo es amplio a propósito." },
      { key: "dod",       label: "8 · Criterio de terminado (Definition of Done)", type: "textarea" },
      { key: "evidence",  label: "9 · Evidencia", type: "textarea", help: "Qué debe guardarse para probar que terminó bien." },
      { key: "exceptions",label: "10 · Excepciones", type: "textarea" },
      { key: "controls",  label: "11 · Controles y políticas", type: "textarea" },
      { key: "metrics",   label: "12 · Métricas", type: "textarea", help: "SLA, calidad, costo y resultado." },

      { key: "docs",      label: "Documentos de respaldo", type: "files", section: "Base de conocimiento",
        help: "Arrastra o selecciona .docx, .pdf, imágenes o cualquier archivo que alimente la base de datos de este SOP." },

      { key: "version",   label: "Versión", type: "text", col: 1, section: "Versionado", placeholder: "v1.0" },
      { key: "author",    label: "Autor", type: "text", col: 1 },
      { key: "status",    label: "Estado", type: "status", col: 1 },
    ],
  },

  /* ------------------------------------------------------------------- AGENTE */
  agente: {
    label: "Agente IA", plural: "Agentes", icon: "agent", color: "#6D5AE6",
    listColumns: ["name","owner","autonomy","status"],
    fields: [
      { key: "name",    label: "Nombre", type: "text", required: true, col: 1 },
      { key: "dept",    label: "Departamento", type: "text", col: 1 },
      { key: "owner",   label: "Owner humano", type: "text", col: 1 },
      { key: "owner_employee", label: "Empleado owner", type: "link", linkTo: "empleado", col: 1 },
      { key: "primary_prompt", label: "Prompt gobernado", type: "link", linkTo: "prompt", col: 1 },
      { key: "skill_refs", label: "Skills IA vinculadas", type: "tags", col: 1 },
      { key: "process_refs", label: "Procesos donde participa", type: "tags" },
      { key: "status",  label: "Estado", type: "status", col: 1 },
      { key: "purpose", label: "Propósito / identidad", type: "textarea", help: "Responsabilidad estable y límites del agente." },
      { key: "rolePrompt", label: "Role prompt", type: "longtext", help: "Instrucción base del agente." },
      { key: "skills",  label: "Skills habilitadas", type: "tags", col: 1 },
      { key: "tools",   label: "Herramientas autorizadas", type: "tags", col: 1 },
      { key: "knowledge", label: "Fuentes de conocimiento que consulta", type: "tags" },
      { key: "autonomy",label: "Autonomía máxima", type: "autonomy", col: 1 },
      { key: "budget",  label: "Presupuesto por run", type: "text", col: 1, placeholder: "Ej. 8k tokens / $0.20" },
      { key: "escalation", label: "Escalación", type: "textarea", help: "A quién y bajo qué condiciones pide ayuda." },
      { key: "outputSchema", label: "Contrato de salida (schema)", type: "longtext", help: "JSON esperado de salida." },
      { key: "docs",    label: "Documentos / evaluaciones", type: "files" },
    ],
  },

  /* ------------------------------------------------------------------- PROMPT */
  prompt: {
    label: "Prompt", plural: "Prompts", icon: "prompt", color: "#B87BD6",
    listColumns: ["name","version","status"],
    fields: [
      { key: "name",    label: "Nombre legible", type: "text", required: true, col: 1 },
      { key: "version", label: "Versión", type: "text", col: 1, placeholder: "v1.0" },
      { key: "status",  label: "Estado", type: "select", col: 1, options: ["Draft","Tested","Approved","Deprecated"] },
      { key: "owner",   label: "Owner", type: "text", col: 1 },
      { key: "system",  label: "Instrucción de sistema", type: "longtext", help: "Rol, reglas y límites." },
      { key: "task",    label: "Plantilla de tarea", type: "longtext", help: "Instrucción específica con variables {{variable}}." },
      { key: "context", label: "Plantilla de contexto", type: "textarea", help: "Qué fuentes se inyectan y en qué orden." },
      { key: "output",  label: "Schema de salida", type: "longtext" },
      { key: "toolPolicy", label: "Política de herramientas", type: "textarea", col: 1 },
      { key: "fallback",label: "Fallback", type: "textarea", col: 1, help: "Qué hacer si faltan datos o falla una herramienta." },
      { key: "docs",    label: "Casos de prueba / adjuntos", type: "files" },
    ],
  },

  /* --------------------------------------------------------------- CONOCIMIENTO */
  fuente: {
    label: "Fuente de conocimiento", plural: "Conocimiento", icon: "knowledge", color: "#1F9D6B",
    listColumns: ["name","area","sensitivity","status"],
    fields: [
      { key: "name",    label: "Título de la fuente", type: "text", required: true },
      { key: "area",    label: "Área", type: "text", col: 1 },
      { key: "owner",   label: "Owner", type: "text", col: 1 },
      { key: "sensitivity", label: "Confidencialidad", type: "select", col: 1, options: ["Pública","Interna","Confidencial","Restringida"] },
      { key: "validUntil", label: "Vigencia hasta", type: "date", col: 1 },
      { key: "status",  label: "Estado", type: "status", col: 1 },
      { key: "tags",    label: "Etiquetas", type: "tags", col: 1 },
      { key: "summary", label: "Resumen", type: "textarea" },
      { key: "content", label: "Contenido / notas", type: "longtext" },
      { key: "docs",    label: "Archivos fuente", type: "files", required: false,
        help: "Sube el documento original. La cita siempre enlaza de vuelta a la fuente." },
    ],
  },

  /* ---------------------------------------------------------------------- RUN */
  run: {
    label: "Ejecución (Run)", plural: "Ejecución", icon: "run", color: "#E08A2B",
    listColumns: ["name","process","status","startedAt"],
    fields: [
      { key: "name",    label: "Referencia", type: "text", required: true },
      { key: "process", label: "Proceso", type: "link", linkTo: "proceso", col: 1 },
      { key: "status",  label: "Estado", type: "status", col: 1 },
      { key: "startedAt", label: "Inició", type: "date", col: 1 },
      { key: "owner",   label: "A cargo", type: "text", col: 1 },
      { key: "notes",   label: "Bitácora", type: "longtext" },
      { key: "docs",    label: "Evidencia", type: "files",
        help: "Salida, archivo, captura o referencia que prueba la ejecución." },
    ],
  },

  /* --------------------------------------------------------------------- TASK */
  tarea: {
    label: "Tarea", plural: "Mi Trabajo", icon: "task", color: "#C8862F",
    listColumns: ["name","actor","status","due"],
    fields: [
      { key: "name",   label: "Tarea", type: "text", required: true },
      { key: "actor",  label: "Ejecuta", type: "actor", col: 1 },
      { key: "status", label: "Estado", type: "status", col: 1 },
      { key: "due",    label: "Vence", type: "date", col: 1 },
      { key: "owner",  label: "Asignada a", type: "text", col: 1 },
      { key: "process",label: "Proceso", type: "link", linkTo: "proceso" },
      { key: "instructions", label: "Instrucciones", type: "longtext" },
      { key: "docs",   label: "Adjuntos", type: "files" },
    ],
  },

  /* ---------------------------------------------------------------- APPROVAL */
  aprobacion: {
    label: "Aprobación", plural: "Aprobaciones", icon: "approval", color: "#4E7BD6",
    listColumns: ["name","requestedBy","status","due"],
    fields: [
      { key: "name",        label: "Qué se aprueba", type: "text", required: true },
      { key: "requestedBy", label: "Solicitado por", type: "text", col: 1 },
      { key: "approver",    label: "Aprobador", type: "text", col: 1 },
      { key: "process",     label: "Proceso", type: "link", linkTo: "proceso", col: 1 },
      { key: "due",         label: "Límite", type: "date", col: 1 },
      { key: "status",      label: "Estado", type: "select", options: ["Pendiente","Aprobado","Rechazado"], col: 1 },
      { key: "risk",        label: "Riesgo", type: "risk", col: 1 },
      { key: "context",     label: "Contexto para decidir", type: "longtext" },
      { key: "docs",        label: "Evidencia adjunta", type: "files" },
    ],
  },

  /* ------------------------------------------------------------- INTEGRACIÓN */
  conector: {
    label: "Conector", plural: "Conexiones", icon: "plug", color: "#2E8FB0",
    listColumns: ["name","category","status","lastSync"],
    fields: [
      { key: "name",     label: "Nombre", type: "text", required: true, col: 1 },
      { key: "category", label: "Categoría", type: "select", col: 1,
        options: ["CRM / ERP","Comunicación","Documentos","Calendario","Finanzas","Automatización","API personalizada"] },
      { key: "status",   label: "Salud", type: "status", col: 1 },
      { key: "lastSync", label: "Última sincronización", type: "date", col: 1 },
      { key: "auth",     label: "Autenticación", type: "text", col: 1, placeholder: "OAuth / API key (referencia segura)" },
      { key: "scopes",   label: "Scopes / permisos", type: "tags" },
      { key: "depends",  label: "Procesos dependientes", type: "tags" },
      { key: "notes",    label: "Notas técnicas", type: "textarea" },
    ],
  },

  /* -------------------------------------------------------------------- KPI */
  kpi: {
    label: "KPI", plural: "Métricas", icon: "chart", color: "#0FA3A3",
    hidden: true,
    fields: [
      { key: "name",    label: "Nombre", type: "text", required: true },
      { key: "value",   label: "Valor", type: "text", col: 1 },
      { key: "target",  label: "Meta", type: "text", col: 1 },
      { key: "formula", label: "Fórmula / fuente", type: "textarea" },
    ],
  },

  /* ------------------------------------------------------------------ POLICY */
  politica: {
    label: "Política", plural: "Gobierno", icon: "shield", color: "#7A8798",
    listColumns: ["name","scope","status"],
    fields: [
      { key: "name",   label: "Política", type: "text", required: true },
      { key: "scope",  label: "Alcance", type: "text", col: 1 },
      { key: "status", label: "Estado", type: "status", col: 1 },
      { key: "rules",  label: "Reglas", type: "longtext", help: "Reglas de permisos, riesgo, uso de herramientas o autonomía." },
      { key: "docs",   label: "Documentos", type: "files" },
    ],
  },

  /* ------------------------------------------------------------------ EMPLEADO */
  empleado: {
    label: "Empleado", plural: "Empleados", icon: "org", color: "#C8862F",
    listColumns: ["name","position","department","status"],
    fields: [
      { key: "name", label: "Nombre completo", type: "text", required: true, col: 1 },
      { key: "source", label: "Fuente", type: "select", col: 1, options: ["ERPNext Employee","Local demo"], help: "En producción, ERPNext Employee es la fuente de verdad." },
      { key: "employee_id", label: "Employee ID / clave", type: "text", col: 1, placeholder: "EMP-001" },
      { key: "user_id", label: "Usuario ERPNext", type: "text", col: 1 },
      { key: "company", label: "Company", type: "text", col: 1 },
      { key: "position", label: "Puesto / Designation", type: "text", col: 1 },
      { key: "department", label: "Área / departamento", type: "link", linkTo: "orgnode", col: 1 },
      { key: "manager", label: "Reporta a", type: "link", linkTo: "empleado", col: 1 },
      { key: "email", label: "Correo", type: "text", col: 1 },
      { key: "phone", label: "Teléfono", type: "text", col: 1 },
      { key: "status", label: "Estado", type: "status", col: 1 },
      { key: "human_skills", label: "Habilidades / competencias", type: "tags" },
      { key: "processes", label: "Procesos vinculados", type: "tags", help: "Referencias PROC-…" },
      { key: "notes", label: "Notas", type: "textarea" },
      { key: "docs", label: "Documentos", type: "files" },
    ],
  },

  /* -------------------------------------------------------------------- SKILL */
  skill: {
    label: "Skill IA", plural: "Skills", icon: "agent", color: "#6D5AE6",
    listColumns: ["name","category","version","status"],
    fields: [
      { key: "name", label: "Nombre de la skill", type: "text", required: true, col: 1 },
      { key: "skill_key", label: "Clave estable", type: "text", col: 1, placeholder: "skill.lead_scoring" },
      { key: "owner_employee", label: "Owner humano", type: "link", linkTo: "empleado", col: 1 },
      { key: "category", label: "Categoría", type: "select", col: 1, options: ["Análisis","Redacción","Clasificación","Datos","Automatización","Investigación","Atención","Ventas","Operaciones","Otra"] },
      { key: "version", label: "Versión", type: "text", col: 1, placeholder: "v1.0" },
      { key: "status", label: "Estado", type: "select", col: 1, options: ["Draft","Tested","Approved","Deprecated"] },
      { key: "risk", label: "Riesgo", type: "risk", col: 1 },
      { key: "description", label: "Qué hace", type: "textarea", required: true },
      { key: "instructions", label: "Instrucciones / comportamiento", type: "longtext" },
      { key: "inputs", label: "Entradas esperadas", type: "tags", col: 1 },
      { key: "outputs", label: "Salidas esperadas", type: "tags", col: 1 },
      { key: "tools", label: "Herramientas permitidas", type: "tags", col: 1 },
      { key: "permissions", label: "Scopes / permisos", type: "tags", col: 1 },
      { key: "knowledge", label: "Conocimiento requerido", type: "tags", col: 1 },
      { key: "evidence_policy", label: "Evidencia esperada", type: "textarea" },
      { key: "fallback", label: "Fallback / escalación", type: "textarea" },
      { key: "output_schema", label: "Contrato de salida (schema)", type: "longtext" },
      { key: "agents", label: "Agentes habilitados", type: "tags", help: "Referencias AGT-…" },
      { key: "docs", label: "Documentos / pruebas", type: "files" },
    ],
  },

  /* ----------------------------------------------------------------- RELATION */
  relation: {
    label: "Relación", plural: "Relaciones", icon: "org", color: "#B87BD6",
    listColumns: ["from","to","type"],
    fields: [
      { key: "from", label: "Origen", type: "link", linkTo: "orgnode", required: true, col: 1 },
      { key: "to", label: "Destino", type: "link", linkTo: "orgnode", required: true, col: 1 },
      { key: "type", label: "Tipo semántico", type: "select", required: true, col: 1, options: ["REPORTS_TO","OWNS","EXECUTES","APPROVES","USES","READS","WRITES","TRIGGERS","HANDOFF_TO","DEPENDS_ON","MEASURES"] },
      { key: "label", label: "Etiqueta visual", type: "text", col: 1 },
      { key: "notes", label: "Contexto / regla", type: "textarea" },
    ],
  },

  /* ---------------------------------------------------------------- EVIDENCIA */
  evidencia: {
    label: "Evidencia", plural: "Evidencias", icon: "upload", color: "#0FA3A3",
    listColumns: ["name","evidence_type","verification_status"],
    fields: [
      { key: "name", label: "Evidencia / referencia", type: "text", required: true },
      { key: "process", label: "Proceso", type: "link", linkTo: "proceso", col: 1 },
      { key: "run", label: "Run", type: "link", linkTo: "run", col: 1 },
      { key: "step_key", label: "Step key", type: "text", col: 1 },
      { key: "evidence_type", label: "Tipo", type: "select", col: 1, options: ["Archivo","Documento ERPNext","Salida JSON","Log","Captura","Referencia externa","Aprobación"] },
      { key: "reference_doctype", label: "Reference DocType", type: "text", col: 1 },
      { key: "reference_name", label: "Reference Name", type: "text", col: 1 },
      { key: "summary", label: "Resumen verificable", type: "textarea" },
      { key: "verification_status", label: "Verificación", type: "select", col: 1, options: ["Pendiente","Verificada","Rechazada"] },
      { key: "verified_by_employee", label: "Verificada por", type: "link", linkTo: "empleado", col: 1 },
      { key: "created_on", label: "Fecha", type: "date", col: 1 },
      { key: "docs", label: "Archivos", type: "files" },
    ],
  },
};

/* ============================================================================
   NAVEGACIÓN — el menú lateral, agrupado.
   `view: "dashboard"` y `view: "org"` son pantallas a medida.
   `entity: "sop"` genera una pantalla de lista automáticamente.
   ============================================================================ */
LO.NAV = [
  { group: "Panorama", items: [
    { id: "home", label: "Centro de Mando", icon: "home", view: "dashboard" },
  ]},
  { group: "Diseñar", items: [
    { id: "org",       label: "Organigrama Vivo", icon: "org",     view: "org" },
    { id: "procesos",  label: "Procesos",         icon: "process", entity: "proceso" },
    { id: "sops",      label: "SOPs",             icon: "sop",     entity: "sop" },
    { id: "empleados", label: "Empleados",        icon: "org",     entity: "empleado" },
    { id: "relaciones",label: "Relaciones",       icon: "org",     entity: "relation" },
  ]},
  { group: "Ejecutar", items: [
    { id: "runs",       label: "Centro de Ejecución", icon: "run",      entity: "run" },
    { id: "tareas",     label: "Mi Trabajo",          icon: "task",     entity: "tarea" },
    { id: "aprobaciones",label:"Aprobaciones",         icon: "approval", entity: "aprobacion" },
    { id: "evidencias", label: "Evidencias",          icon: "upload",   entity: "evidencia" },
  ]},
  { group: "Inteligencia", items: [
    { id: "agentes",    label: "Agentes",       icon: "agent",     entity: "agente" },
    { id: "prompts",    label: "Prompts",       icon: "prompt",    entity: "prompt" },
    { id: "skills",     label: "Skills",        icon: "agent",     entity: "skill" },
    { id: "conocimiento",label:"Conocimiento",  icon: "knowledge", entity: "fuente" },
  ]},
  { group: "Conectar y medir", items: [
    { id: "conexiones", label: "Conexiones", icon: "plug",  entity: "conector" },
    { id: "analitica",  label: "Analítica",  icon: "chart", view: "analytics" },
    { id: "gobierno",   label: "Gobierno",   icon: "shield", entity: "politica" },
  ]},
];
