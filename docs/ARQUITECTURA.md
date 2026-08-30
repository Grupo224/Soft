# Arquitectura — LivingOrg OS sobre ERPNext/Frappe

```
USUARIO (navegador)
  │  HTTPS + sesión same-origin de Frappe
  ▼
PORTAL HTML/CSS/JS  (Website → 1 Web Page en /os, SPA por hash-routing)
  ├─ os-api.js      → único adaptador REST (CSRF, timeouts, errores 401/403/409)
  ├─ os-core.js     → sesión, router, store, UI (toasts/modal/inspector), CRUD genérico
  ├─ os-canvas.js   → motor pan/zoom/drag SVG (Organigrama + Process Studio)
  └─ os-page-*.js   → 6 módulos de página (home, org, processes, work, runs, agents, analytics)
  │
  ▼  /api/resource/<DocType>  ·  /api/method/<whitelisted>
FRAPPE / ERPNEXT (sin tocar core, sin Server Script obligatorio)
  ├─ User / Role / Permission          ← identidad y permisos reales
  ├─ Company / Department / Designation / Employee   ← estructura ya existente
  ├─ Lead / Opportunity / Quotation / Project / Task  ← transacciones reales
  └─ 18 Custom DocTypes OS_* (erpnext_setup/doctypes)
       OS Org Node / OS Org Relation / OS Role Card
       OS Process (+ Steps/Edges child tables) / OS SOP
       OS Prompt / OS Agent / OS Skill
       OS Run / OS Step Run / OS Evidence / OS Approval
       OS KPI Definition / OS Integration / OS Knowledge Source
  │
  └───────────────► SERVICIO EXTERNO SEGURO (opcional, fuera de este repo)
                     n8n / OpenClaw / API propia — únicos que pueden usar
                     credenciales de IA/WhatsApp/etc.; escriben resultados
                     de vuelta en OS Run / OS Step Run vía la misma REST API.
```

## Decisiones que fija esta implementación

1. **ERPNext es la fuente de verdad** para lo que ya existe (Company, Employee,
   User, Lead, Quotation…). Los DocTypes `OS_*` solo modelan lo que ERPNext no
   tiene: organigrama vivo, procesos ejecutables, SOP, runs, evidencia y agentes.
2. **El canvas nunca es la base de datos.** `OS Process` guarda `steps[]`/`edges[]`
   como child tables reales (filtrable, auditable, reportable); `canvas_json`
   solo persiste viewport/zoom/paneles — presentación, no semántica.
3. **Un solo mount point.** El portal es una SPA con `location.hash` como router
   (`os-core.js`), servida desde **un único** Web Page de Frappe (`/os`). Esto
   reduce la instalación a: subir ~12 archivos al File Manager + crear 1 Web Page,
   en vez de mantener una página de Frappe por ruta.
4. **Ningún secreto en el navegador.** `os-api.js` solo usa la cookie de sesión +
   CSRF token que Frappe ya expone a la página; nunca una API key. `OS Prompt`,
   `OS Agent` e `OS Integration` solo guardan referencias/estado, nunca credenciales
   (regla no-negociable del SOP técnico, Anexo/§10.1).
5. **Autosave con dos velocidades.** Arrastrar un nodo hace *debounce* de ~700 ms
   y guarda solo posición; los cambios semánticos (título, actor, SOP, schema)
   requieren el botón **Guardar** del inspector — evita sobrescrituras accidentales
   y dispara el estado visible "Guardando… / Guardado / Error".
6. **Gobierno de versiones aplicado en la UI, no solo documentado.** Editar la
   estructura de un proceso `Active` obliga primero a confirmar el regreso a
   `Draft` (regla de no-regresión del SOP); publicar a `Active` sella
   `published_on`.
7. **Realtime honesto.** Sin Server Scripts garantizados, las vistas operativas
   (Command Center, Mi Trabajo, Aprobaciones, Execution Center) hacen *polling*
   cada 15–25 s (`OS.poll`) en vez de prometer websockets nativos.
8. **Evidence-first.** `openComplete()` en Mi Trabajo bloquea marcar un paso como
   `Completed` si `evidence_required` está activo y no se adjuntó archivo ni
   referencia — el "done" de un agente nunca es suficiente por sí solo.

## Mapa de rutas de la SPA

| Ruta (`#/...`) | Pantalla | DocTypes que consume |
|---|---|---|
| `/` | Command Center | OS Run, OS Approval, OS Process, OS Integration |
| `/org` | Organigrama Vivo | OS Org Node, OS Org Relation |
| `/processes`, `/processes/:name` | Biblioteca + Process Studio | OS Process (+ Steps/Edges), OS SOP |
| `/work` | Mi Trabajo | OS Step Run, OS Evidence |
| `/approvals` | Aprobaciones | OS Approval, OS Step Run |
| `/runs`, `/runs/:name` | Execution Center | OS Run, OS Step Run, OS Evidence |
| `/agents`, `/agents/:name` | Agent Roster | OS Agent, OS Step Run |
| `/prompts`, `/prompts/:name` | Prompt Library | OS Prompt |
| `/sop`, `/sop/:name` | SOP Builder | OS SOP |
| `/analytics` | Analítica | OS Run, OS Step Run, OS Process, OS Integration |
| `/integrations`, `/roles`, `/kpis` | Gobierno | OS Integration, OS Role Card, OS KPI Definition |
| `/knowledge`, `/skills` | Knowledge Brain (acotado a MVP) | OS Knowledge Source, OS Skill |

## Pendientes documentados de esta entrega

Siguiendo la regla de "nunca descartar en silencio", estos ítems de la
Instrucción Maestra quedan fuera de esta entrega y su razón:

- **Campos de tarjeta configurables por DocType.** Hoy el tamaño/campos de
  cada tarjeta (Organigrama, Process Studio) están fijados en el código de
  cada página. Un configurador visual genérico requiere una pantalla de
  ajustes propia y un esquema de metadatos nuevo; no es indispensable para
  operar los DocTypes actuales y se prioriza para una iteración siguiente.
- **Selección múltiple + alinear/distribuir en el canvas.** El motor soporta
  selección y arrastre de un nodo a la vez (suficiente para reordenar
  jerarquías y pasos). Selección múltiple con alineación/distribución es una
  mejora de productividad, no bloquea ningún flujo de administración.
- **Panel de diff visual de versiones** para Procesos/SOP. Frappe ya guarda
  el historial completo (Track Changes, activado en estos DocTypes) y es
  consultable desde el Escritorio ERPNext; falta construir un panel que lo
  muestre embebido dentro del portal en vez de saltar al Desk.

Ninguno de estos bloquea la operación diaria del portal ni compromete los
principios no negociables (persistencia real vía API, sin datos simulados).

## Extensión futura sin romper nada de esto

Cuando exista despliegue administrado (bench/SSH), el paso natural es una Custom
Frappe App: mover a `hooks.py`/Server Scripts la máquina de estados de `OS Run`
(hoy conducida manualmente desde el portal), añadir un Workflow real para
`OS Process.status`, y sustituir el polling por eventos realtime. El modelo de
datos y el contrato REST del portal no cambian.
