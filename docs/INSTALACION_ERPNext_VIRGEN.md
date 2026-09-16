# Instalación de LivingOrg OS en un ERPNext virgen — el deber ser

Guía maestra para **TI** y para **OpenClaw**: cómo instalar LivingOrg OS en sitios
ERPNext nuevos, por etapas, sin errores y sin tocar el core.

- Producto: LivingOrg OS 2.0.1 · Fuente de verdad: repo `Grupo224/Soft`
- Rama de despliegue: **`release/organigrama-v2.0`** (contrato en `deployment/manifest.json`)
- Modos soportados: **API-first** (sin SSH/Bench) y **Bench/Bridge** (runtime nativo)
- Regla de oro: *cada fase termina en un candado verificable*. Si un candado no pasa, no se avanza.

---

## 0. Qué se instala y qué NO se toca

| Se instala / sincroniza | Cantidad | Modo API | Modo Bench |
| :--- | ---: | :---: | :---: |
| `Module Def` **OS Business Layer** | 1 | Sí | Sí |
| Roles `OS *` (Admin, Architect, Publisher, AI Supervisor, Manager, Operator, Auditor, Viewer) | 8 | Sí | Sí |
| Custom DocTypes `OS *` (+ child tables y overlays aditivos) | 22 | Sí | Sí |
| Assets públicos del portal (CSS/JS) | 24 (5 CSS + 19 JS) | Sí | Sí |
| Web Page `/os` (`content_type = HTML`) | 1 | Sí | Sí |
| Server Script API `livingorg_api_csrf` | 1 | Sí, si el sitio tiene Server Scripts habilitados | Sí |
| Runtime operativo `livingorg_bridge` (hooks, runs, aprobaciones) | 1 app | **No** | Sí |

**Nunca se toca en una instalación:** el core de Frappe/ERPNext, `site_config.json`,
DocTypes nativos, `Employee`/`Company`/`User` maestros, y **ningún dato de negocio**.

`safe mode` es la política por defecto: sin `DELETE` de DocTypes/campos/datos, sin
`reinstall.py`, sin `cleanup_data.py`, sin migraciones automáticas de datos históricos.

---

## 1. Preparar el ERPNext virgen (antes de escribir nada)

### 1.1 Requisitos del sitio

| Requisito | Cómo se comprueba |
| :--- | :--- |
| ERPNext/Frappe **v15+** | Desk abre y responde; `/api/method/ping` = 200 |
| HTTPS con certificado válido | `curl -I https://SITIO/api/method/ping` |
| Sitio operativo (usuarios, compañía) | login en Desk con el usuario técnico |
| Backup reciente | `bench --site SITIO backup --with-files` (modo Bench) |
| Server Scripts habilitados *(recomendado)* | `bench --site SITIO set-config server_script_enabled true` |

> Si el hosting no permite habilitar Server Scripts, el despliegue API **sigue siendo
> válido para schema y portal**, pero el portal no podrá escribir con sesión autenticada
> (ver §4.2). Queda declarado como `DEGRADED`, no se oculta.

### 1.2 Usuario técnico dedicado (no la cuenta personal de nadie)

1. Desk → **User → New**: `livingorg.deploy@<dominio>` con `System Manager`
   (Frappe exige System Manager para crear DocType, Role, Web Page y File).
2. En el mismo usuario → **Settings → API Access → Generate Keys**.
3. Guardar la dupla en el **secret store del agente** (OpenClaw: herramienta `secrets`),
   nunca en Git, ni en la Web Page, ni en JS público, ni en este documento.

Roles operativos mínimos que el **usuario humano** debe tener para usar el portal:
`OS Admin` (o `OS Manager`/`OS Viewer` según su trabajo). El usuario técnico no es
la cuenta con la que la gente opera el día a día.

### 1.3 Variables de entorno (solo en el entorno del agente/servidor)

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="<api key>"
export FRAPPE_API_SECRET="<api secret>"
# opcionales
export LIVINGORG_REPO_ROOT="/ruta/al/repo/Soft"
export FRAPPE_TIMEOUT_SECONDS="90"
```

### 1.4 Candado de salida — sitio listo

```bash
python scripts/preflight.py
```

**Debe imprimir** `[identity] OK <usuario técnico>` y un `[read] OK` por cada
recurso (DocType, Role, Module Def, Web Page, File). Cualquier 403/401 aquí se
resuelve **antes** de continuar: casi siempre es credencial mal copiada, usuario
sin `System Manager`, o cabecera de autenticación mal construida (§4.5).

---

## 2. Orden de despliegue (fases con candado)

Cada fase es idempotente: repetirla no duplica objetos ni borra nada.

| # | Fase | Comando | Candado (debe verse) |
| ---: | :--- | :--- | :--- |
| 0 | Anclar la versión | `git fetch origin && git checkout release/organigrama-v2.0 && git rev-parse HEAD` | SHA registrado en el reporte |
| 1 | Validación estática | `python scripts/validate_repo.py` · `python scripts/validate_org_v2.py` · `node --check` de los JS tocados | `OK: validación estática…` |
| 2 | Preflight | `python scripts/preflight.py` | identidad + todos los `[read] OK` |
| 3 | **Respaldo** | snapshot API (`rollback/snapshot_*.py`) y, en Bench, `bench backup` | carpeta `rollback/…-predeploy-<fecha>` con JSON |
| 4 | Ensayo | `python scripts/deploy_api.py --mode install --dry-run` | lista de objetos, sin escrituras |
| 5 | INSTALL | `python scripts/deploy_api.py --mode install` | `OK: despliegue completado` (exit 0) |
| 6 | VERIFY | `python scripts/verify.py` | `[doctype] OK …`, `[asset] OK …`, `[portal] OK livingorg_api_csrf`, `estado=FULL\|DEGRADED` |
| 7 | Smoke técnico | ver §3 | `/` 200 · `/app` 301 · `/os` 200 · assets 200 · endpoints 200 |
| 8 | Smoke de negocio | ver §3.1 en navegador | checklist en verde |
| 9 | Reporte | plantilla §6 | SHA + objetos creados + runtime + pruebas ejecutadas |

**Actualizaciones posteriores** (día a día): mismas fases con
`--mode update`. Nunca se reinstala: primero `--dry-run`, y si falla **STOP**
(nada de “reparar” con DELETE/reinstall).

---

## 3. Smoke test técnico (sin navegador)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://SITIO/                        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://SITIO/app                     # 301
curl -s -o /dev/null -w "%{http_code}\n" https://SITIO/api/method/ping         # 200
curl -s -o /dev/null -w "%{http_code}\n" https://SITIO/os                      # 200
curl -s https://SITIO/os | grep -o 'os-page-org-v2.js[^"]*' | head -1          # orden v2 primero
curl -s -o /dev/null -w "%{http_code}\n" https://SITIO/files/os-core.js        # 200
curl -s -X GET https://SITIO/api/method/livingorg_api_csrf                     # {"message": ...}
```

Compara el `?v=` del HTML con el que quedó en el repo: si difieren, el navegador
servirá assets viejos (§4.4).

### 3.1 Smoke test de negocio (navegador, con un usuario humano)

1. `Ctrl+Shift+R` en `/os` → carga sin “Necesitas iniciar sesión”.
2. `/os#/org`: se ve Empresa → Departamento → Puesto → Persona; abrir **Ficha completa**.
3. `/os#/processes` → **Nuevo proceso → Modo Rápido**: elegir Empresa y Dueño **de la lista**
   y guardar → aparece en la biblioteca.
4. Editar ese proceso y agregar un paso en el lienzo (Process Studio) → recargar y persistir.
5. Consola del navegador: sin errores rojos nuevos (el ruido de FingerprintJS/highlight.js
   del snippet de tracking del sitio no cuenta, §4.9).

---

## 4. Checklist de cero errores — fallos ya vistos y su corrección

Esta tabla es la parte que evita repetir problemas: cada renglón salió de un incidente real.

| Síntoma | Causa real | Cómo se previene | Cómo se verifica |
| :--- | :--- | :--- | :--- |
| **4.1** Al guardar proceso: `No se pudo encontrar Compañía: 1, Owner User: 1` (HTTP 417) | Los campos `Empresa`/`Dueño` son **Link**; llegó un valor que no existe en la base | El portal exige elegir de la lista (sugerencias al enfocar), traduce el error a *«1» no existe en Compañía* y **mantiene el formulario abierto** si el servidor rechaza | POST de control con valores reales (`Company`/`User`) → 200 |
| **4.2** “No guarda” con sesión iniciada, sin mensaje | La Web Page `/os` sirve `frappe.csrf_token = "None"`: las sesiones **autenticadas** sí exigen CSRF y el POST moría en silencio | Endpoint `livingorg_api_csrf` (en `deployment/server_scripts/`) que el portal precarga antes de escribir | `verify.py` → `[portal] OK livingorg_api_csrf` |
| **4.3** El endpoint CSRF no se puede crear | Server Scripts deshabilitados en el hosting | Habilitarlos con Bench (§1.1) o aceptar modo lectura-only del portal | `verify.py` → `[portal] WARN livingorg_api_csrf` |
| **4.4** Cambios que “no se ven” tras desplegar | Caché del navegador o assets servidos con el `?v=` anterior | Subir el `?v=` en `portal/pages/os-web-page.html` en cada entrega | `curl /os \| grep '?v='` == versión del repo |
| **4.5** **403 PermissionError en TODOS los endpoints** (parece credencial rota) | Cabecera de autenticación mal formada o token caducado. En agentes: construir la cabecera dentro de un *heredoc* hace que el redactor de credenciales la corrompa | Escribir el script en archivo, verificar con `grep` y recién ejecutar. Ante la duda: `preflight.py` con la misma credencial distingue “sitio/permiso” de “mi cabecera” | `preflight.py` OK con credencial ⇒ el fallo era la cabecera del diagnóstico |
| **4.6** `Aplicación livingorg_bridge no está instalada` (`DEGRADED`) | El runtime operativo vive en un Custom App que solo se instala con Bench | No fingir capacidades: sin Bridge no hay runs/aprobaciones/validación server-side | `verify.py` → `estado=DEGRADED`; `--require-bridge` falla a propósito |
| **4.7** `OS Process` queda a medias (sin child `sop`) | Orden de dependencias del `DT_PLAN` | No crear DocTypes a mano: el plan crea y **re-sincroniza** el DocType | `[doctype] OK OS Process` en `verify.py` |
| **4.8** La Web Page `/os` sale vacía | `content_type = HTML` usa el campo **`main_section_html`** (no `main_section`) | Dejar que `deploy` publique la página desde `portal/pages/os-web-page.html` | `/os` responde 200 y muestra el portal |
| **4.9** Ruido rojo en consola (`openfpcdn.io/fingerprintjs`, `initHighlighting deprecated`) | Snippet de tracking de visitas del sitio y librería de resaltado; **no** son del portal | No perseguirlo durante una instalación; el bloqueador de anuncios del navegador lo provoca | Sobrevive a `Ctrl+Shift+R`; las funciones del portal operan igual |
| **4.10** El portal pide iniciar sesión | El portal opera sobre la **sesión same-origin** de ERPNext; nunca guarda tokens en el navegador | Iniciar sesión en el sitio (mismo dominio) antes de usar `/os` | `/login?redirect-to=/os` deja entrar y `/os` carga |
| **4.11** Un elemento del organigrama no se puede quitar | Al reescribir una página (1.x → 2.0) se perdieron acciones que sí existían (borrar nodo/relación) | Al reemplazar una pantalla, **comparar las acciones con la versión anterior** y conservarlas; el Inspector debe ofrecer Eliminar/Desvincular | En `/os#/org`: inspector de nodo → **Eliminar**; acciones ▾ → **Desvincular del padre**; clic en la línea → **Desvincular** |
| **4.12** “No tienes permiso” al eliminar | El borrado del organigrama requiere `OS Admin` o `System Manager` (`scripts/permissions.py`) | Asignar el rol necesario al usuario humano según su trabajo, no dar más de lo que necesita | El portal avisa del rol requerido en vez de fallar en silencio |

---

## 5. Ruta incremental (“poco a poco”) — 5 entregas

Cada entrega es un despliegue completo (`--mode update`) y se acepta por sí sola.

| Entrega | Objetivo | Objetos que toca | Aceptación | Requiere |
| :--- | :--- | :--- | :--- | :--- |
| **E1 Base** | Que el portal exista y guarde | Module Def, 8 roles, 22 DocTypes, 24 assets, Web Page `/os`, Server Script CSRF | §3 completo en verde | API |
| **E2 Organigrama Vivo 2.0** | Empresa → Departamento → Puesto → Persona | `OS Org Node`, `OS Org Relation`, `OS Role Card`, `OS KPI Definition` + `/os#/org` + Ficha completa | §3.1 pasos 2 y 4 | API (validación de jerarquía server-side: Bench) |
| **E3 Procesos y SOP** | Biblioteca de procesos y procedimientos | `OS Process` (+ steps, edges, goals, actions), `OS SOP` (+ sop_step) + Process Studio | §3.1 paso 3 | API |
| **E4 Gobierno y ejecución** | Runs, evidencia, aprobaciones | `OS Run`, `OS Step Run`, `OS Evidence`, `OS Approval`, `OS Document Link` | Start/Complete Step con evidencia obligatoria y aprobación por rol | **Bridge** (o runtime compatible) |
| **E5 IA y conocimiento** | Agentes, prompts y conocimiento | `OS Agent`, `OS Prompt`, `OS Skill`, `OS Policy`, `OS Integration`, `OS Knowledge Source` | Un agente del portal ejecuta una acción permitida y queda auditado | **Bridge** + runtime OpenClaw |

Regla de comunicación: en E1–E3 el sitio queda **API_ONLY** (schema + portal). Las
acciones operativas de E4–E5 **no se anuncian como disponibles** hasta que exista
runtime; el portal debe mostrar la capacidad real, nunca un botón que solo fallará.

---

## 6. Plantilla de reporte (una por despliegue)

```text
Sitio:            https://...
Repo/rama/SHA:    Grupo224/Soft · release/organigrama-v2.0 · <sha exacto>
Modo:             api | bench
Fases 0-4:        OK (preflight, dry-run, snapshot en <ruta>)
Fase 5-6:         exit 0 · verify estado=FULL|DEGRADED
Objetos:          creados N · actualizados N · saltados N (ídem idempotente)
Smoke técnico:    /, /app, /ping, /os, assets, livingorg_api_csrf → códigos
Smoke de negocio: checklist §3.1 (quién lo probó y cuándo)
Capacidades NO disponibles y por qué
Rollback:         punto de retorno (snapshot + rama/commit)
```

---

## 7. Rollback

- Código: volver al commit/rama previos (`archive/organigrama-v1-stable` es la
  referencia de la experiencia anterior) y redesplegar con `--mode update`.
- Objetos: **ocultar antes que borrar** (ej. workspaces con `is_hidden = 1`),
  conservando validadores y campos aditivos.
- Datos: nunca se borran automáticamente. `reinstall.py` y `cleanup_data.py` están
  prohibidos en INSTALL/UPDATE.
- Ver `ROLLBACK.md` para el procedimiento completo.

---

## 8. Contrato para agentes (OpenClaw)

Orden de lectura obligatorio: `AGENTS.md` → `deployment/manifest.json` →
`deployment/openclaw/AGENT.md` → **esta guía** → guía del modo
(`deployment/api/INSTALL.md` o `deployment/bench/INSTALL.md`) → `SECURITY.md` → `ROLLBACK.md`.

Reglas no negociables (resumen; el detalle vive en `deployment/openclaw/AGENT.md`):

1. No improvisar arquitectura: `erpnext_setup/doctypes/` y `portal/` son la fuente única.
2. No borrar para “limpiar”; no crear un segundo juego de DocTypes ni un segundo frontend.
3. Secretos solo por entorno/secret store; **nunca** imprimirlos, ni pasarlos por
   línea de comandos, ni construir cabeceras de autenticación dentro de heredocs (§4.5).
4. Snapshot antes de cualquier escritura; dry-run antes del deploy real.
5. Reportar la capacidad real (`FULL`/`DEGRADED`) y las pruebas **realmente** ejecutadas.
6. Al terminar: `verify.py` + smoke test, y dejar el reporte de §6.
