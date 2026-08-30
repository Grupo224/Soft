# LivingOrg OS — Portal HTML/CSS/JS para ERPNext/Frappe

Portal completo (Organigrama Vivo, Process Studio, SOP Builder, Mi Trabajo,
Aprobaciones, Execution Center, Agentes/Prompts, Analítica, Integraciones, Role
Cards y KPIs) diseñado para montarse **desde el módulo de Sitio Web de ERPNext**
(HTML/CSS/JS puro, sin frameworks, sin build step) y operar sobre Custom DocTypes
creados desde la interfaz — sin modificar el core de Frappe/ERPNext y sin
necesitar acceso SSH.

Este repositorio traduce a código los dos documentos de referencia del negocio:
el **blueprint funcional** (`SOP_Blueprint_SaaS_Organigrama_Vivo_IA_Humano`) y el
**SOP técnico de implementación** (`SOP_Tecnico_ERPNext_Frontend_...Sin_SSH`).

## Contenido del repositorio

```
portal/
  assets/css/os-portal.css     Sistema de diseño completo (dark, responsive)
  assets/js/os-api.js          Adaptador REST único hacia Frappe (CSRF, errores, timeouts)
  assets/js/os-core.js         Sesión, router (hash SPA), store, UI kit, CRUD genérico
  assets/js/os-canvas.js       Motor pan/zoom/drag SVG reutilizado por Org + Process Studio
  assets/js/pages/*.js         10 rutas: home, org, processes(+studio), work, approvals,
                                runs, agents/prompts/sop/integrations/roles/kpis,
                                knowledge/skills, analytics
  pages/os-web-page.html       El único bloque HTML que se pega en el Web Page de Frappe

erpnext_setup/
  doctypes/*.json              Especificación campo-por-campo de los 20 Custom DocTypes
  roles_permission_matrix.md   Matriz de permisos por rol OS
  README_INSTALACION.md        Guía paso a paso (sin SSH) para montar todo esto

docs/
  ARQUITECTURA.md              Decisiones de arquitectura y mapa de rutas
```

## Empieza aquí

1. Lee `erpnext_setup/README_INSTALACION.md` — es la guía de instalación completa,
   en orden: roles → DocTypes → permisos → subir archivos → crear el Web Page.
2. Revisa `docs/ARQUITECTURA.md` para entender las decisiones de diseño y cómo
   cada pantalla del portal se conecta a los DocTypes.
3. Los archivos de `portal/assets/` son el producto final: código JavaScript
   plano (ES5, sin dependencias externas) y CSS auto-contenido, listos para
   subirse tal cual al Administrador de Archivos de Frappe.

## Principios no negociables (heredados del SOP técnico)

- **Nunca** se modifica `frappe`/`erpnext` ni se depende de Server Scripts para
  el MVP. Todo corre sobre Custom DocTypes + REST API estándar + permisos reales.
- **Ningún secreto** (API keys de IA, tokens de WhatsApp/Meta, client secrets)
  vive en este portal. Los DocTypes de gobierno (`OS Prompt`, `OS Agent`,
  `OS Integration`) solo guardan referencias/estado, nunca credenciales.
- El canvas (Organigrama y Process Studio) **representa** datos persistidos en
  ERPNext; nunca es la única copia de la verdad.
- Todo lo importante queda auditable: `Track Changes` en los DocTypes, evidencia
  obligatoria antes de cerrar un paso, y aprobaciones explícitas para gates de riesgo.
