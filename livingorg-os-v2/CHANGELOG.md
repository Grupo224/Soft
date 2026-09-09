# LivingOrg OS v2 — Changelog

## v2.1 · FUSIÓN (2026-09-09)
- **16 entidades** (antes 12): se añadieron Empleado (`empleado`), Skill IA (`skill`), Relación (`relation`) y Evidencia (`evidencia`), tomando los campos funcionales del esquema v5.
- Cross-refs nuevos: orgnode→empleados/agente/skills; proceso→empleado dueño/equipo; agente→empleado owner/prompt/skills/procesos.
- **Tema Control Room** aplicado (sidebar navy `#0C1420`, marca `#F26B1F`, Inter, canvas gris frío).
- Menú reorganizado con los 4 módulos nuevos (Diseñar: Empleados, Relaciones · Ejecutar: Evidencias · Inteligencia: Skills).
- El motor (app.js) queda intacto: wizard con SIPOC/RACI, organigrama vivo editable, creador de diagramas por proceso, SOP builder, captura de todos los campos.

## v2.2 · Botones Guardar/Actualizar + guía de integración (2026-09-09)
- Botones "Guardar" y "Actualizar" en la topbar (guardado explícito + recarga de datos).
- `LivingOrg_Guia_Integracion_ERPNext_v2.1.docx`: mapeo de 16 entidades → Doctypes OS, orden de despliegue de los 20 Doctypes, roles, y Server/Client Scripts de sincronización para TI.
