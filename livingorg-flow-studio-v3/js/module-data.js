window.LivingOrgModules = {
  dashboard: {
    kicker: "COMMAND CENTER · GA-COM-01", title: "Centro de Mando", code: "CMD-ALTO-001",
    description: "Vista ejecutiva para entender qué ocurre en la operación y qué requiere atención.",
    stats: [["Procesos activos", "3", "2 con seguimiento hoy", "good"], ["Ejecuciones abiertas", "2", "1 esperando aprobación", "warn"], ["Leads sin seguimiento", "4", "Revisar antes de 24 h", "danger"], ["Salud operativa", "92%", "Sin errores críticos", "good"]],
    blocks: [
      { code: "GA-COM-02", title: "Flujo Comercial", text: "Lead → Calificación → Cotización → Seguimiento", action: "Abrir proceso", target: "flows", tone: "brand" },
      { code: "GA-COM-03", title: "Acciones rápidas", text: "Crear lead, tarea, aprobación o ejecución", action: "Crear registro", target: "work", tone: "blue" },
      { code: "GA-COM-05", title: "Sin seguimiento", text: "4 leads requieren una siguiente acción", action: "Ver pendientes", target: "work", tone: "danger" },
      { code: "GA-COM-10", title: "Alertas gerenciales", text: "1 descuento requiere aprobación humana", action: "Revisar alertas", target: "approvals", tone: "warn" }
    ]
  },
  org: {
    kicker: "ORG CANVAS · ESTRUCTURA VIVA", title: "Organigrama Vivo", code: "ORG-CANVAS-001",
    description: "Áreas, roles, personas y agentes que participan en la ejecución del proceso.",
    stats: [["Áreas", "4", "Comercial, Operaciones, Tecnología y Dirección", "blue"], ["Personas", "4", "2 participan en PROC-COM-001", "good"], ["Agentes IA", "2", "Nivel de autonomía L2", "ai"], ["Relaciones", "6", "REPORTS_TO · OWNS · EXECUTES", "brand"]],
    columns: ["Código", "Elemento", "Tipo", "Responsable", "Estado"],
    rows: [["ORG-AREA-001", "Dirección General", "Área", "Dirección", "Activo"], ["ORG-AREA-002", "Comercial", "Área", "Ana Torres", "Activo"], ["ORG-ROLE-001", "Ejecutivo Comercial", "Rol", "Gerencia Comercial", "Activo"], ["ORG-PER-001", "Liliana Reyes", "Persona", "Comercial", "Activo"], ["ORG-AI-001", "Agente de Calificación", "Agente IA", "Ana Torres", "Piloto"], ["ORG-REL-001", "Comercial → Agente de Calificación", "EXECUTES", "Gerencia Comercial", "Vigente"]],
    action: "Abrir Organigrama Vivo"
  },
  sops: {
    kicker: "PROCESS KNOWLEDGE · SOP LIBRARY", title: "SOPs Operativos", code: "SOP-LIB-001",
    description: "Procedimientos verificables conectados con procesos, responsables, evidencia y criterios de salida.",
    stats: [["SOPs activos", "2", "1 vinculado al proceso comercial", "good"], ["En piloto", "1", "Emisión de cotización", "warn"], ["Con evidencia", "100%", "Criterios definidos", "good"], ["Revisión pendiente", "1", "Próxima revisión en 7 días", "danger"]],
    columns: ["Código", "SOP", "Proceso vinculado", "Versión", "Responsable", "Estado"],
    rows: [["SOP-COM-001", "Calificación de oportunidad comercial", "PROC-COM-001", "v1.4", "Gerencia Comercial", "Activo"], ["SOP-COM-002", "Emisión de cotización", "PROC-COM-001", "v0.9", "Operaciones", "Piloto"], ["SOP-OPS-001", "Corte operativo y conciliación", "PROC-OPS-001", "v1.0", "Encargado de Operaciones", "Activo"]],
    action: "Abrir SOP-COM-001", target: "flows"
  },
  templates: {
    kicker: "REUSABLE BLUEPRINTS · TEMPLATES", title: "Plantillas de procesos", code: "TPL-LIB-001",
    description: "Estructuras listas para capturar procesos por área y vertical sin comenzar desde una página vacía.",
    stats: [["Plantillas", "6", "Comercial, operaciones y servicio", "blue"], ["Usadas este mes", "12", "4 procesos creados", "good"], ["Con SIPOC", "5", "Entradas y salidas definidas", "brand"], ["Pendientes", "1", "Revisión de plantilla", "warn"]],
    blocks: [{ code: "TPL-COM-001", title: "Lead a cotización", text: "Inicio, scoring, gate de riesgo, propuesta y seguimiento.", action: "Usar plantilla", target: "flows", tone: "brand" }, { code: "TPL-OPS-001", title: "Corte y conciliación", text: "Ventas, inventario, efectivo, diferencias y aprobación.", action: "Usar plantilla", target: "execution", tone: "blue" }, { code: "TPL-SVC-001", title: "Atención y escalamiento", text: "Entrada, clasificación, respuesta, SLA y escalamiento.", action: "Usar plantilla", target: "sops", tone: "ai" }]
  },
  execution: {
    kicker: "EXECUTION CENTER · RUNS", title: "Centro de Ejecución", code: "RUN-CENTER-001",
    description: "Ejecuciones activas del proceso con estados, reintentos, escalaciones y evidencia.",
    stats: [["Runs activos", "2", "Lead #4821 y Corte 29-ago", "good"], ["Esperando humano", "1", "Aprobación de términos", "warn"], ["Con excepción", "0", "Sin fallos críticos", "good"], ["SLA en riesgo", "1", "Lead #4821", "danger"]],
    columns: ["Código", "Ejecución", "Proceso", "Estado", "Owner", "Siguiente acción"],
    rows: [["RUN-COM-0001", "Lead #4821", "PROC-COM-001", "Esperando aprobación", "Agente de Calificación", "Revisar términos"], ["RUN-OPS-0002", "Corte 29-ago", "PROC-OPS-001", "Activo", "Sistema", "Conciliar inventario"]],
    action: "Abrir RUN-COM-0001", target: "flows"
  },
  work: {
    kicker: "MY WORK · ACTION QUEUE", title: "Mi Trabajo", code: "TASK-QUEUE-001",
    description: "Tareas derivadas de los procesos, con responsable, fecha, riesgo y evidencia.",
    stats: [["Pendientes", "2", "Una requiere atención hoy", "warn"], ["Vencidas", "0", "Sin tareas vencidas", "good"], ["Alto riesgo", "1", "Aprobación de términos", "danger"], ["Completadas hoy", "6", "Actividad comercial", "blue"]],
    columns: ["Código", "Tarea", "Proceso", "Responsable", "Vence", "Riesgo"],
    rows: [["TASK-COM-001", "Aprobar términos de propuesta · Lead #4821", "PROC-COM-001", "Ana Torres", "Hoy", "Alto"], ["TASK-COM-002", "Registrar siguiente acción", "PROC-COM-001", "Liliana Reyes", "Hoy", "Medio"], ["TASK-OPS-001", "Revisar diferencias de corte", "PROC-OPS-001", "Laura Díaz", "En 3 días", "Medio"]],
    action: "Abrir TASK-COM-001", target: "approvals"
  },
  approvals: {
    kicker: "APPROVAL INBOX · HUMAN GATES", title: "Aprobaciones", code: "APP-INBOX-001",
    description: "Decisiones humanas que protegen el proceso antes de permitir una acción sensible.",
    stats: [["Pendientes", "2", "Requieren decisión", "warn"], ["Alto riesgo", "1", "Descuento fuera de política", "danger"], ["Aprobadas hoy", "3", "Trazabilidad completa", "good"], ["SLA promedio", "2.4 h", "Dentro del objetivo", "blue"]],
    columns: ["Código", "Solicitud", "Proceso", "Solicita", "Aprobador", "Estado"],
    rows: [["APP-COM-001", "Aprobar términos de propuesta", "PROC-COM-001", "Agente de Calificación", "Ana Torres", "Pendiente"], ["APP-COM-002", "Descuento 12%", "PROC-COM-001", "Liliana Reyes", "Gerencia Comercial", "Pendiente"], ["APP-OPS-001", "Diferencia de corte", "PROC-OPS-001", "Laura Díaz", "PMO", "Aprobada"]],
    action: "Revisar APP-COM-001", target: "flows"
  },
  agents: {
    kicker: "AGENT ROSTER · AI OPERATIONS", title: "Agentes IA", code: "AGENT-ROSTER-001",
    description: "Agentes con propósito, autonomía, skills, herramientas, escalamiento y límites explícitos.",
    stats: [["Agentes", "2", "Comercial y propuestas", "ai"], ["En piloto", "2", "Autonomía L2", "warn"], ["Con escalamiento", "2", "Siempre conservan humano", "good"], ["Skills vinculadas", "3", "Scoring, dedupe y propuestas", "blue"]],
    columns: ["Código", "Agente", "Propósito", "Autonomía", "Herramientas", "Estado"],
    rows: [["AGT-COM-001", "Agente de Calificación", "Clasifica leads y explica razones", "L2", "CRM lectura", "Piloto"], ["AGT-COM-002", "Agente Redactor de Propuestas", "Genera borradores de alcance", "L2", "CRM + Pricing", "Piloto"]],
    action: "Abrir AGT-COM-001", target: "flows"
  },
  prompts: {
    kicker: "PROMPT LIBRARY · CONTROLLED INSTRUCTIONS", title: "Biblioteca de Prompts", code: "PROMPT-LIB-001",
    description: "Instrucciones versionadas y aprobadas para que cada agente trabaje dentro de sus límites.",
    stats: [["Prompts", "1", "Prompt comercial principal", "ai"], ["Versiones activas", "1", "v1.3 aprobada", "good"], ["Con salida estructurada", "1", "JSON validable", "blue"], ["Sin cambios libres", "100%", "Gobierno activo", "brand"]],
    columns: ["Código", "Prompt", "Agente", "Versión", "Salida", "Estado"],
    rows: [["PRM-COM-001", "Calificación comercial", "AGT-COM-001", "v1.3", "JSON score + razones", "Aprobado"]],
    action: "Abrir PRM-COM-001", target: "agents"
  },
  skills: {
    kicker: "SKILL LIBRARY · CAPABILITIES", title: "Skills de IA", code: "SKILL-LIB-001",
    description: "Capacidades pequeñas, comprobables y reutilizables para agentes y procesos.",
    stats: [["Skills", "4", "3 vinculadas a comercial", "ai"], ["Aprobadas", "3", "Una en prueba", "good"], ["Riesgo bajo", "3", "Lectura y clasificación", "blue"], ["Con evidencia", "4", "Salida verificable", "brand"]],
    columns: ["Código", "Skill", "Categoría", "Entradas", "Salidas", "Estado"],
    rows: [["SKL-COM-001", "Scoring de leads", "Clasificación", "Lead + política", "Score + razones", "Approved"], ["SKL-DAT-001", "Deduplicación", "Datos", "Contactos + leads", "Coincidencias", "Approved"], ["SKL-COM-002", "Redacción de propuesta", "Redacción", "Lead + alcance", "Borrador", "Tested"]],
    action: "Abrir SKL-COM-001", target: "agents"
  },
  knowledge: {
    kicker: "KNOWLEDGE BRAIN · SOURCES", title: "Conocimiento", code: "KNOWLEDGE-001",
    description: "Fuentes que alimentan decisiones sin mezclar información fuera del alcance del cliente.",
    stats: [["Fuentes activas", "2", "Política comercial y pricing", "good"], ["Documentos", "12", "Versionados", "blue"], ["Sin propietario", "0", "Gobierno completo", "good"], ["Última indexación", "Hoy", "Estado normal", "brand"]],
    columns: ["Código", "Fuente", "Tipo", "Propietario", "Uso", "Estado"],
    rows: [["KNW-COM-001", "Política comercial", "Documento", "Gerencia Comercial", "Scoring y gates", "Activa"], ["KNW-COM-002", "Catálogo y reglas de precio", "ERPNext", "Operaciones", "Cotización", "Activa"], ["KNW-OPS-001", "SOP de corte operativo", "SOP", "PMO", "Conciliación", "Activa"]],
    action: "Abrir KNW-COM-001", target: "sops"
  },
  connections: {
    kicker: "CONNECTIONS · INTEGRATIONS", title: "Conexiones", code: "INTEGRATIONS-001",
    description: "Sistemas que participan en el proceso y permisos con los que cada agente puede interactuar.",
    stats: [["Conexiones", "4", "ERPNext, Chatwoot, n8n y Calendar", "blue"], ["Activas", "4", "Sin alertas", "good"], ["Solo lectura", "2", "Agentes restringidos", "ai"], ["Con webhook", "2", "Entrada de leads", "brand"]],
    columns: ["Código", "Conector", "Sistema", "Permiso", "Usado por", "Estado"],
    rows: [["CON-ERP-001", "ERPNext CRM", "ERPNext", "Lectura + alta", "PROC-COM-001", "Activo"], ["CON-CWO-001", "Inbox comercial", "Chatwoot", "Lectura + mensajes", "AGT-COM-001", "Activo"], ["CON-N8N-001", "Lead webhook", "n8n", "Entrada", "PROC-COM-001", "Activo"], ["CON-GCA-001", "Agenda comercial", "Google Calendar", "Crear eventos", "Ventas", "Activo"]],
    action: "Abrir CON-ERP-001", target: "flows"
  },
  analytics: {
    kicker: "ANALYTICS · PROCESS INTELLIGENCE", title: "Analítica Operativa", code: "ANL-PROC-001",
    description: "Indicadores que muestran dónde se detiene el proceso y qué debe mejorar.",
    stats: [["Conversión", "25%", "Cotización → venta", "good"], ["Ciclo promedio", "24 h", "Lead → cotización", "blue"], ["Leads sin seguimiento", "4", "Fuera del objetivo", "danger"], ["Escalaciones IA", "12%", "Dentro del límite", "ai"]],
    columns: ["Código", "Indicador", "Proceso", "Meta", "Actual", "Estado"],
    rows: [["KPI-COM-001", "Lead → cotización", "PROC-COM-001", "60%", "58%", "Atención"], ["KPI-COM-002", "Tiempo de ciclo", "PROC-COM-001", "24 h", "21 h", "En meta"], ["KPI-COM-003", "Cierre cotización → venta", "PROC-COM-001", "25%", "25%", "En meta"]],
    action: "Abrir informe comercial", target: "flows"
  },
  governance: {
    kicker: "GOVERNANCE · CONTROL & AUDIT", title: "Gobierno", code: "GOV-ALTO-001",
    description: "Permisos, versiones, auditoría y límites para que la automatización sea controlable.",
    stats: [["Roles", "3", "Viewer, Editor y Manager", "blue"], ["Procesos publicados", "2", "Con aprobación", "good"], ["Cambios sin revisar", "1", "Requiere atención", "warn"], ["Auditoría", "100%", "Eventos trazables", "brand"]],
    columns: ["Código", "Control", "Objeto", "Responsable", "Última revisión", "Estado"],
    rows: [["GOV-ROLE-001", "LivingOrg Viewer", "Consulta", "Administrador", "Hoy", "Activo"], ["GOV-ROLE-002", "LivingOrg Editor", "Diseño y captura", "PMO", "Hoy", "Activo"], ["GOV-ROLE-003", "LivingOrg Manager", "Aprobación y publicación", "Dirección", "Ayer", "Activo"], ["GOV-AUD-001", "Historial PROC-COM-001", "Versión v1.4", "Gerencia Comercial", "Hoy", "Trazable"]],
    action: "Revisar controles", target: "flows"
  }
};
