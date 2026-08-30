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

## 2. Crear los 17 Custom DocTypes

Carpeta `erpnext_setup/doctypes/*.json` contiene la especificación **campo por campo**
de cada DocType (nombre, tipo, opciones de Select, obligatoriedad, Link de destino).
Úsala como checklist mientras creas cada uno desde **Desk → DocType → New**.

**Orden de creación (importante — las child tables deben existir antes que su padre):**

1. `OS Process Step` — marcar **Is Child Table**.
2. `OS Process Edge` — marcar **Is Child Table**.
3. `OS Org Node`
4. `OS Org Relation`
5. `OS Role Card`
6. `OS Prompt`
7. `OS Agent`
8. `OS SOP`
9. `OS Process` — sus campos `steps` y `edges` son tipo **Table** apuntando a los DocTypes de los pasos 1 y 2.
10. `OS Run`
11. `OS Step Run`
12. `OS Evidence`
13. `OS Approval`
14. `OS KPI Definition`
15. `OS Integration`
16. `OS Knowledge Source`
17. `OS Skill`

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
