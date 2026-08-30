/*! Páginas de gobierno construidas con la fábrica genérica OS.ui.simpleModule:
 * Agentes, Prompts, SOP, Integraciones, Role Cards, KPI Definitions. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  ui.simpleModule({
    path: "/agents", title: "Agentes IA", doctype: "OS Agent", icon: "🤖",
    subtitle: "Objeto gobernado: propósito, owner, herramientas, autonomía y límites — nunca credenciales.",
    titleField: "agent_title", statusField: "status", statusOptions: ["Draft", "Active", "Disabled"],
    columns: [
      { field: "agent_title", label: "Agente" }, { field: "agent_code", label: "Código" },
      { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } },
      { field: "autonomy_max", label: "Autonomía" }, { field: "owner_user", label: "Responsable" }
    ],
    fields: [
      { name: "agent_title", label: "Nombre del agente" }, { name: "agent_code", label: "Código" },
      { name: "purpose", label: "Propósito", type: "textarea" },
      { name: "department", label: "Departamento", type: "link", linkDoctype: "Department" },
      { name: "owner_user", label: "Responsable humano", type: "link", linkDoctype: "User" },
      { name: "autonomy_max", label: "Autonomía máxima", type: "select", options: ["L0", "L1", "L2", "L3", "L4"] },
      { name: "prompt", label: "Prompt vinculado", type: "link", linkDoctype: "OS Prompt" },
      { name: "skills", label: "Skills habilitadas", type: "textarea" },
      { name: "tools_allowed", label: "Herramientas y scopes autorizados", type: "textarea" },
      { name: "budget_limit", label: "Presupuesto (tokens/costo/tiempo por run)" },
      { name: "escalation_policy", label: "Política de escalación", type: "textarea" },
      { name: "model_policy", label: "Referencia de modelo/proveedor (sin credenciales)" },
      { name: "knowledge_sources", label: "Fuentes de conocimiento que consulta", type: "textarea" },
      { name: "output_schema", label: "Contrato de salida (schema)", type: "code" },
      { name: "docs", label: "Evaluaciones / documentos", type: "file" }
    ],
    related: function (host, doc) {
      Promise.all([
        api.list("OS Run", { fields: ["name", "status"], filters: [["current_step_key", "!=", ""]], limit: 0 }).catch(function () { return []; }),
        api.list("OS Step Run", { fields: ["name", "status", "error_code"], filters: [["actor_agent", "=", doc.name]], limit: 100 }).catch(function () { return []; })
      ]).then(function (r) {
        var runs = r[1];
        var errs = runs.filter(function (x) { return x.status === "Failed"; }).length;
        host.innerHTML = '<div class="os-section-title">Historial de ejecución</div>' +
          '<div class="os-grid cols-3">' +
          '<div class="os-kpi"><div class="n">' + runs.length + '</div><div class="l">Step runs totales</div></div>' +
          '<div class="os-kpi"><div class="n" style="' + (errs ? "color:var(--os-red)" : "") + '">' + errs + '</div><div class="l">Excepciones</div></div>' +
          '<div class="os-kpi"><div class="n">' + (runs.length ? Math.round((runs.length - errs) / runs.length * 100) : 0) + '%</div><div class="l">Tasa de éxito</div></div>' +
          '</div>';
      });
    }
  });

  ui.simpleModule({
    path: "/prompts", title: "Biblioteca de Prompts", doctype: "OS Prompt", icon: "✳",
    subtitle: "Plantillas versionadas. Nunca se sobrescriben silenciosamente: crea una nueva versión o duplica.",
    titleField: "prompt_title", statusField: "status", statusOptions: ["Draft", "Tested", "Approved", "Deprecated"],
    columns: [
      { field: "prompt_title", label: "Prompt" }, { field: "prompt_code", label: "Código" }, { field: "version_label", label: "Versión" },
      { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } }
    ],
    fields: [
      { name: "prompt_title", label: "Nombre" }, { name: "prompt_code", label: "ID inmutable" }, { name: "version_label", label: "Versión (SemVer)" },
      { name: "system_instruction", label: "System instruction — rol, reglas y límites", type: "textarea" },
      { name: "task_template", label: "Task template — usa {{variables}}", type: "code" },
      { name: "context_template", label: "Context template — qué fuentes se inyectan", type: "textarea" },
      { name: "tool_policy", label: "Herramientas permitidas/prohibidas", type: "textarea" },
      { name: "output_schema", label: "Output schema (JSON)", type: "code" },
      { name: "fallback", label: "Fallback si faltan datos o falla una herramienta", type: "textarea" },
      { name: "approval_policy", label: "Cuándo requiere humano", type: "textarea" },
      { name: "owner_user", label: "Responsable", type: "link", linkDoctype: "User" },
      { name: "docs", label: "Casos de prueba / adjuntos", type: "file" }
    ],
    related: function (host, doc) {
      host.innerHTML =
        '<div class="os-section-title">Vista previa local (no llama a ningún proveedor de IA)</div>' +
        '<div class="os-field"><label>Datos de ejemplo (JSON)</label><textarea class="os-textarea" id="pl-vars">{}</textarea></div>' +
        '<button class="os-btn" id="pl-run">Renderizar plantilla</button>' +
        '<pre id="pl-out" style="white-space:pre-wrap;font-size:12px;margin-top:10px"></pre>';
      host.querySelector("#pl-run").onclick = function () {
        var out = doc.task_template || "";
        try {
          var vars = JSON.parse(host.querySelector("#pl-vars").value || "{}");
          out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, k) { return (k in vars) ? String(vars[k]) : m; });
        } catch (e) { out = "JSON inválido en datos de ejemplo."; }
        host.querySelector("#pl-out").textContent = out;
      };
    }
  });

  // SOP tiene su propia página (os-page-sop.js): estructura híbrida con pasos
  // repetibles, archivos reales y progreso por secciones — no encaja en la
  // fábrica genérica de lista+formulario plano.

  ui.simpleModule({
    path: "/integrations", title: "Integraciones", doctype: "OS Integration", icon: "🔌",
    subtitle: "Estado real, scopes y health — nunca secretos en campos visibles.",
    titleField: "integration_name", statusField: "status", statusOptions: ["Connected", "Degraded", "Disconnected"],
    columns: [
      { field: "integration_name", label: "Integración" }, { field: "provider", label: "Proveedor" }, { field: "category", label: "Categoría" },
      { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } }
    ],
    fields: [
      { name: "integration_name", label: "Nombre" }, { name: "provider", label: "Proveedor" },
      { name: "category", label: "Categoría", type: "select", options: ["CRM", "Comms", "Docs", "Calendar", "Finance", "Automation", "CustomAPI"] },
      { name: "scopes_declared", label: "Scopes declarados", type: "textarea" },
      { name: "external_connection_id", label: "ID de conexión externa (referencia, no secreto)" },
      { name: "owner_user", label: "Responsable técnico", type: "link", linkDoctype: "User" },
      { name: "health_notes", label: "Notas de salud / última incidencia", type: "textarea" },
      { name: "depends", label: "Procesos dependientes", type: "textarea", hint: "Si esta integración falla, qué procesos se ven afectados." }
    ]
  });

  ui.simpleModule({
    path: "/roles", title: "Fichas de Rol", doctype: "OS Role Card", icon: "🎖",
    subtitle: "Misión, resultados, responsabilidades y KPIs de cada puesto.",
    titleField: "role_title",
    columns: [{ field: "role_title", label: "Rol" }, { field: "designation", label: "Puesto" }, { field: "owner_user", label: "Responsable" }],
    fields: [
      { name: "role_title", label: "Nombre del rol" },
      { name: "designation", label: "Puesto (Designation ERPNext)", type: "link", linkDoctype: "Designation" },
      { name: "mission", label: "Misión", type: "textarea" }, { name: "expected_results", label: "Resultados esperados", type: "textarea" },
      { name: "responsibilities", label: "Responsabilidades", type: "textarea" }, { name: "kpis", label: "KPIs del rol", type: "textarea" },
      { name: "owner_user", label: "Responsable", type: "link", linkDoctype: "User" }
    ]
  });

  ui.simpleModule({
    path: "/kpis", title: "Definición de KPIs", doctype: "OS KPI Definition", icon: "🎯",
    subtitle: "Métrica, fórmula y fuente — vinculada a proceso, área o agente.",
    titleField: "kpi_title",
    columns: [{ field: "kpi_title", label: "KPI" }, { field: "kpi_code", label: "Código" }, { field: "entity_type", label: "Aplica a" }, { field: "owner_user", label: "Responsable" }],
    fields: [
      { name: "kpi_title", label: "Nombre" }, { name: "kpi_code", label: "Código" },
      { name: "entity_type", label: "Nivel", type: "select", options: ["Company", "Process", "Step", "Agent", "Connector"] },
      { name: "formula", label: "Fórmula", type: "textarea" }, { name: "source", label: "Fuente de datos" }, { name: "frequency", label: "Frecuencia de medición" },
      { name: "threshold_warning", label: "Umbral de alerta" }, { name: "threshold_critical", label: "Umbral crítico" },
      { name: "owner_user", label: "Responsable", type: "link", linkDoctype: "User" }
    ]
  });

  ui.simpleModule({
    path: "/policies", title: "Políticas", doctype: "OS Policy", icon: "📜",
    subtitle: "Reglas de permisos, riesgo, herramientas y autonomía que los procesos y agentes deben cumplir.",
    titleField: "policy_title", statusField: "status", statusOptions: ["Draft", "Active", "Retired"],
    columns: [
      { field: "policy_title", label: "Política" }, { field: "scope", label: "Alcance" },
      { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } }, { field: "owner_user", label: "Responsable" }
    ],
    fields: [
      { name: "policy_title", label: "Nombre de la política" },
      { name: "scope", label: "Alcance", hint: "Un área, un tipo de acción, o \"Global\"." },
      { name: "rules", label: "Reglas", type: "textarea" },
      { name: "owner_user", label: "Responsable", type: "link", linkDoctype: "User" },
      { name: "docs", label: "Documentos", type: "file" }
    ]
  });
})(window);
