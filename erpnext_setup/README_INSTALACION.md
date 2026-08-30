# Instalación de LivingOrg OS en ERPNext/Frappe — sin SSH, sin tocar el core

Esta guía monta el portal (`/portal`) y el modelo de datos (`/erpnext_setup/doctypes`)
usando **únicamente la interfaz web de ERPNext**: Desk (DocTypes, Roles, Permisos)
y el módulo Website (File Manager, Web Page). No requiere terminal, bench ni
instalar una Custom App. Sigue el orden exacto de esta guía.

> Referencia funcional completa: los dos documentos SOP entregados por el negocio
> (`SOP_Blueprint_SaaS_Organigrama_Vivo_IA_Humano` y
> `SOP_Tecnico_ERPNext_Frontend_Organigrama_Vivo_Sin_Core_Sin_SSH`). Este portal
> implementa exactamente el modelo, taxonomía y reglas de gobierno de esos SOP.

## 0. Requisitos previos

- Acceso como **Administrator** o usuario con rol **System Manager**.
- Idealmente, un sitio de staging/clon para probar antes de producción (SOP técnico, §12.1).
- Anota la versión exacta de ERPNext/Frappe instalada (Ayuda → Acerca de).

## 1. Crear los roles OS

Ve a **Desk → Usuarios y permisos → Rol → Nuevo** y crea estos 8 roles (nombres exactos):

`OS Admin` · `OS Architect` · `OS Publisher` · `OS AI Supervisor` ·
`OS Manager` · `OS Operator` · `OS Auditor` · `OS Viewer`

Ver `roles_permission_matrix.md` para qué puede hacer cada rol. Asigna estos roles
a los usuarios reales desde **Usuario → Roles** antes de continuar.

## 2. Crear los 20 Custom DocTypes

Carpeta `erpnext_setup/doctypes/*.json` contiene la especificación **campo por campo**
de cada DocType (nombre, tipo, opciones de Select, obligatoriedad, Link de destino).
Úsala como checklist mientras creas cada uno desde **Desk → DocType → New**.

**Orden de creación (importante — las child tables deben existir antes que su padre):**

1. `OS Process Step` — marcar **Is Child Table**.
2. `OS Process Edge` — marcar **Is Child Table**.
3. `OS Process Goal` — marcar **Is Child Table**.
4. `OS SOP Step` — marcar **Is Child Table**.
5. `OS Org Node`
6. `OS Org Relation`
7. `OS Role Card`
8. `OS Prompt`
9. `OS Agent`
10. `OS SOP` — su campo `steps` es tipo **Table** apuntando al DocType del paso 4.
11. `OS Process` — sus campos `steps`, `edges` y `goals` son tipo **Table** apuntando a los DocTypes de los pasos 1, 2 y 3.
12. `OS Run`
13. `OS Step Run`
14. `OS Evidence`
15. `OS Approval`
16. `OS KPI Definition`
17. `OS Integration`
18. `OS Knowledge Source`
19. `OS Skill`
20. `OS Policy`

> **Nota de migración**: `OS SOP` cambió de un campo de texto libre (`procedure`) a una
> tabla estructurada de pasos (`steps` → `OS SOP Step`). El campo anterior se conserva
> como `procedure_legacy` (solo lectura funcional) para no perder contenido ya
> capturado; el procedimiento vivo de ahora en adelante es la tabla de pasos.

> **Nota de migración (Procesos)**: `OS Process` y `OS Process Step` se ampliaron con
> el esquema SIPOC/RACI/metas del rediseño del módulo de Procesos (ver
> `docs/ARQUITECTURA.md`). Todos los campos nuevos son opcionales y aditivos — si ya
> tenías procesos capturados con el esquema anterior, siguen funcionando igual; el
> asistente por pasos del portal solo pide lo nuevo cuando editas o creas un proceso
> desde ahora en adelante. Si ya creaste `OS Process` y `OS Process Step` antes de esta
> versión, solo necesitas **agregar los campos nuevos** listados en sus respectivos
> `.json` (no hace falta recrear el DocType), y crear el nuevo child table
> `OS Process Goal` para el campo `goals`.

> **Nota de migración (auditoría de completitud)**: `OS Agent` (+`knowledge_sources`,
> `output_schema`, `docs`), `OS Prompt` (+`docs`), `OS Knowledge Source` (+`content`),
> `OS Integration` (+`depends`) y `OS Approval` (+`process`, `due_by`, `risk_level`)
> se ampliaron con campos que ya existían en el modelo de referencia pero no se habían
> portado al esquema real — todos opcionales y aditivos. `OS Policy` es un DocType
> nuevo (el módulo "Gobierno" no tenía dónde documentar políticas hasta ahora).

Para cada uno:

- **Module**: crea un módulo lógico `OS Business Layer` (o usa uno propio) para agruparlos.
- **Naming**: deja autoname por defecto (`hash`) salvo que prefieras una serie legible
  (Setup → Naming Series) — el portal no depende del formato del `name`, usa los
  campos `*_code` como identificador funcional estable.
- **Track Changes**: actívalo en todos los DocTypes "Normal" (no en las child tables).
- Copia los campos tal como aparecen en el JSON: `fieldname`, `label`, `fieldtype`,
  `options` (para Select/Link/Table), `reqd`, `unique`, `in_list_view`.
- Guarda y confirma que el listado del DocType carga sin errores antes de pasar al siguiente.

## 3. Permisos (Role Permission Manager)

Ve a **Desk → Role Permission Manager**, elige cada DocType OS_* y aplica la matriz
de `roles_permission_matrix.md`. Reglas clave del SOP técnico (§6):

- Separa el permiso de **diseñar** (`OS Architect` sobre Draft) del de **publicar**
  (`OS Publisher`, o el propio Architect si decides fusionar el rol).
- `OS Auditor` y `OS Viewer` son **solo lectura** en todo.
- Si el sitio maneja varias empresas, agrega además **User Permission** por `Company`
  a cada usuario para que las listas del portal solo muestren su alcance.
- Nunca otorgues estos DocTypes al rol **Guest**.

## 4. Subir los archivos del portal (File Manager)

Ve a **Desk → Inicio → Archivos** (File Manager) y sube, **uno por uno, como
archivo PÚBLICO** (desmarca "Es privado" al subir), todo el contenido de
`portal/assets/`:

```
os-portal.css
os-api.js
os-core.js
os-canvas.js
os-page-home.js
os-page-org.js
os-page-processes.js
os-page-work.js
os-page-runs.js
os-page-agents.js
os-page-sop.js
os-page-knowledge.js
os-page-analytics.js
os-app.js
```

Cada archivo subido como público queda accesible en `https://tu-sitio/files/<nombre>`.
Si tu instalación genera un nombre distinto (por colisión de nombres), copia la URL
real que te muestra el File Manager y ajústala en el paso siguiente.

> Alternativa: si prefieres un único punto de mantenimiento para todo el sitio,
> puedes pegar el mismo bloque `<link>`/`<script>` dentro de **Website → Website
> Script** (aplica a todas las páginas del sitio). No es necesario para que el
> portal funcione: la opción por defecto de esta guía (incluir los `<script>` solo
> en el Web Page `/os`) evita cargar el bundle en el resto de tu sitio público.

## 5. Crear el Web Page único del portal

Ve a **Desk → Sitio Web → Página Web (Web Page) → Nueva**:

- **Title**: `LivingOrg OS`
- **Route**: `os`
- **Published**: marcado
- **Content Type**: `HTML`
- **Full Width** / oculta el sidebar de la página si tu versión lo permite.
- En el campo de contenido HTML, pega el contenido completo de
  `portal/pages/os-web-page.html`.
- Guarda y publica.

El portal completo (Organigrama, Procesos, Mi Trabajo, Aprobaciones, Ejecución,
Agentes, Prompts, SOP, Analítica, Integraciones, Role Cards, KPIs) es una SPA con
enrutamiento por hash dentro de esa única página: `/os#/org`, `/os#/processes`,
`/os#/runs`, etc. No necesitas crear más Web Pages.

## 6. Probar

1. Abre `https://tu-sitio/os` con un usuario que tenga al menos rol `OS Viewer`.
2. Debe aparecer el shell de la app (sidebar + topbar) y el Command Center.
3. Si ves "Necesitas iniciar sesión", inicia sesión primero en `/login`.
4. Si una vista muestra "No tienes permiso", revisa el paso 3 para ese DocType.
5. Abre la consola del navegador: cualquier error de red trae un `correlationId`
   útil para cruzar con los logs del servidor.

## 7. Piloto manual (sin IA) — recomendado antes de conectar automatización

Sigue el SOP técnico §12: crea un proceso piloto en `/os#/processes`, diséñalo en
Process Studio con pasos 100% humanos, publícalo a `Pilot`, ejecútalo con
"Ejecutar prueba", complétalo paso a paso desde `/os#/work` adjuntando evidencia,
y verifica el timeline en `/os#/runs/<id>`. Solo después de cerrar este ciclo
manual conviene declarar Agentes/Prompts (`/os#/agents`, `/os#/prompts`) y, en una
fase posterior con orquestador externo, activar pasos AI/SYS reales.

## 8. Seguridad — no negociable

- Ningún secreto (API key de IA, token de WhatsApp/Twilio/Meta, client secret)
  va en el portal, en `OS Prompt`, `OS Agent` ni `OS Integration`. Estos DocTypes
  solo guardan **referencias** (`external_connection_id`, `model_policy`, scopes
  declarados). Los secretos viven en el orquestador externo (n8n/OpenClaw/API
  propia) o, en una fase futura con SSH, en el secret manager del servidor.
- El portal nunca usa una API key embebida en JavaScript: toda llamada usa la
  sesión autenticada same-origin de Frappe (`credentials: "same-origin"` + CSRF).

## 9. Cuándo pasar a una Custom Frappe App

Cuando el producto ya esté validado y exista despliegue administrado (SSH o CI/CD),
la siguiente fase natural (SOP técnico §20) es empaquetar esto como Custom App:
Server Scripts o `hooks.py` para validaciones/eventos, jobs durables para
retries/timeouts, y realtime nativo. El modelo de datos de `erpnext_setup/doctypes`
se traslada sin cambios; el portal HTML/CSS/JS puede reutilizarse casi intacto.
