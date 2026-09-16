# ARCHITECTURE

## Objetivo

LivingOrg OS añade una capa de operación y gobierno sobre ERPNext/Frappe sin modificar core.

```text
ERPNext / Frappe
   │  sesión, permisos, usuarios, Company, transacciones
   ▼
Custom DocTypes OS_*
   │
   ▼
Frappe REST API
   │
   ▼
portal/assets/js/os-api.js
   │
   ├── os-core.js
   ├── os-hardening.js
   ├── os-canvas.js
   └── pages/*
         │
         ▼
       /os
```

Automatización externa:

```text
OS Run / OS Step Run ↔ n8n / OpenClaw / integraciones
```

## Fuente de verdad

- ERPNext/Frappe: identidad, autorización, documentos y persistencia.
- `OS Process`: definición del proceso.
- `OS Run`: instancia de ejecución.
- `OS Step Run`: ejecución de un paso.
- `OS Evidence`: evidencia.
- `OS Approval`: decisión/auditoría de aprobación.
- Prototipos/canvas: representación y edición; nunca sustituyen la fuente de verdad.

## Fronteras de seguridad

La validación frontend existe para UX, no para autorización. Frappe debe seguir rechazando escrituras no autorizadas. `scripts/permissions.py` es la fuente ejecutable de permisos de rol durante deployment. Restricciones por documento/Company/asignación requieren mecanismos de servidor: User Permissions, shares, permission query conditions o Custom App.

## HTML enriquecido

`os-hardening.js` aplica allowlist de elementos/atributos y protocolos. El editor sanitiza al leer, pegar y guardar. Las instrucciones del preview SOP también se vuelven a sanitizar al renderizar.

## API

`os-api.js` es la única puerta REST del portal principal. Responsabilidades:

- cookies same-origin;
- CSRF;
- timeout;
- parseo JSON;
- errores HTTP;
- excepciones Frappe dentro de HTTP 200;
- correlation id;
- log técnico acotado sin payload sensible.

No se permiten secretos en JavaScript.

## Deployment

`scripts/deploy.py` es el entrypoint canónico. `install.py`, `update.py`, `update_v2.py` y `deploy_standalone.py` se conservan por compatibilidad y delegan en él.

## Historial de ejecución

`OS Step Run` dispone de campos snapshot para título, tipo de ejecución, versión de proceso, instrucciones, SOP, prompt y policy. Los orquestadores que creen Step Runs deben poblarlos. Para Step Runs legacy puede existir fallback a la definición vigente, pero no debe usarse como evidencia histórica.

## Evolución recomendada

Cuando se requieran reglas de transición fuertes (evidence-first, aprobación obligatoria, ownership por actor, alcance multiempresa), implementarlas en una Custom Frappe App con hooks/tests. Hacerlo cambia arquitectura y debe gestionarse como migración explícita, no como parche frontend.
