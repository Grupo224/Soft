/*! Páginas: Knowledge Brain — Fuentes de Conocimiento (/knowledge) y Skill Library (/skills).
 * Alcance deliberadamente acotado al MVP (blueprint §12/§21: "Sources, permissions;
 * full memory governance can be post-MVP") — sin claims/facts/memoria automática. */
(function (global) {
  "use strict";
  var OS = global.OS, api = OS.api, ui = OS.ui, U = OS.util;

  ui.simpleModule({
    path: "/knowledge", title: "Fuentes de Conocimiento", doctype: "OS Knowledge Source", icon: "📚",
    subtitle: "Documentos, políticas y fuentes que alimentan procesos y agentes — con owner, vigencia y cita a la fuente original.",
    titleField: "source_title", statusField: "status", statusOptions: ["Active", "Under Review", "Outdated"],
    emptyHint: "Registra la primera política, manual o fuente que un agente o proceso deba poder citar.",
    columns: [
      { field: "source_title", label: "Fuente" }, { field: "source_type", label: "Tipo" },
      { field: "sensitivity", label: "Sensibilidad", render: function (r) { return '<span class="os-tag">' + U.escapeHtml(r.sensitivity || "—") + '</span>'; } },
      { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } },
      { field: "owner_user", label: "Owner" }
    ],
    fields: [
      { name: "source_title", label: "Título" },
      { name: "source_type", label: "Tipo de fuente", type: "select", options: ["Document", "Email", "CRM", "Meeting", "ERP", "Policy", "Website", "Other"] },
      { name: "department", label: "Departamento", type: "link", linkDoctype: "Department" },
      { name: "process", label: "Proceso relacionado", type: "link", linkDoctype: "OS Process" },
      { name: "tags", label: "Etiquetas (área, cliente, confidencialidad…)" },
      { name: "sensitivity", label: "Sensibilidad", type: "select", options: ["Public", "Internal", "Confidential", "Restricted"] },
      { name: "valid_from", label: "Vigente desde" }, { name: "valid_until", label: "Vigente hasta" },
      { name: "url_or_reference", label: "URL o referencia — cita de vuelta a la fuente original" },
      { name: "summary", label: "Resumen", type: "textarea" },
      { name: "owner_user", label: "Owner", type: "link", linkDoctype: "User" }
    ],
    related: function (host, doc) {
      host.innerHTML = '<div class="os-section-title">Feedback</div>' +
        '<p class="muted" style="font-size:12.5px">Si esta fuente está desactualizada o es incorrecta, cambia su estado a “Under Review” u “Outdated” arriba — así los agentes que la consulten sabrán que necesita revisión antes de tratarla como verdad vigente.</p>';
    }
  });

  ui.simpleModule({
    path: "/skills", title: "Skill Library", doctype: "OS Skill", icon: "🧩",
    subtitle: "Capacidades reutilizables que agentes y procesos pueden invocar por nombre.",
    titleField: "skill_title", statusField: "status", statusOptions: ["Draft", "Active", "Deprecated"],
    emptyHint: "Ejemplo: “Calificar oportunidad”, “Redactar seguimiento”, “Consultar disponibilidad”.",
    columns: [
      { field: "skill_title", label: "Skill" }, { field: "skill_code", label: "Código" },
      { field: "reusable_by", label: "Usable por" }, { field: "status", label: "Estado", render: function (r) { return ui.badgeStatus(r.status); } }
    ],
    fields: [
      { name: "skill_title", label: "Nombre" }, { name: "skill_code", label: "Código" },
      { name: "description", label: "Qué hace", type: "textarea" },
      { name: "inputs", label: "Entradas esperadas", type: "textarea" }, { name: "outputs", label: "Salida que produce", type: "textarea" },
      { name: "reusable_by", label: "Reutilizable por", type: "select", options: ["Agent", "Process", "Both"] },
      { name: "owner_user", label: "Owner", type: "link", linkDoctype: "User" }
    ]
  });
})(window);
