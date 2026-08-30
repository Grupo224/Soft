# Auditoría técnica y visual — LivingOrg OS v1.1.0

**Fecha:** 2026-08-30
**Alcance:** portal ERPNext (`portal/`) + prototipo standalone (`livingorg-os/`)
**Fuente de verdad:** `SOP_Blueprint_SaaS_Organigrama_Vivo_IA_Humano.docx`,
`SOP_Tecnico_ERPNext_Frontend_Organigrama_Vivo_Sin_Core_Sin_SSH.docx`,
`Solicitud_Cambios_LivingOrgOS.docx`
**Versión de partida:** `v1.0.0` (commit `eaa1880`)
**Versión entregada:** `v1.1.0` (commit `1119fb7`)

Este documento cubre las 10 entregas solicitadas en la auditoría. El detalle
línea-por-línea de cada corrección vive en [`CHANGELOG.md`](../CHANGELOG.md);
aquí se documenta el proceso, la matriz de comparación y la evidencia.

---

## 1. Diagnóstico de los problemas encontrados

De los 12 hallazgos listados en `Solicitud_Cambios_LivingOrgOS.docx`, 10
requerían intervención de código y 1 quedó documentado como pendiente sin
impacto de código (ver §9). Un hallazgo adicional (**MOV-02**) era en
realidad una tarea de auditoría en sí misma — al ejecutarla se encontraron
2 regresiones reales introducidas por el reskin visual previo, no reportadas
en el documento original pero descubiertas y corregidas en este ciclo.

| # | Código | Severidad | Síntoma raíz |
|---|--------|-----------|--------------|
| 1 | BUG-01 | P0 | `fieldname: "process"` colisiona con el método interno `Meta.process()` de Frappe → falla la creación por API REST de 4 DocTypes. |
| 2 | BUG-02 | P0 | El Organigrama Vivo no validaba ciclos al construir el árbol jerárquico → relación circular cuelga el navegador (recursión infinita). |
| 3 | BUG-03 | P1 | Process Studio solo permitía conectar pasos con un modo de clics poco descubrible; no existía drag-to-connect. |
| 4 | DIS-01 | P2 | Truncado de texto en tarjetas del Organigrama por conteo fijo de caracteres, no por ancho real → se sobreponía a los controles. |
| 5 | DIS-02 | P3 | Clave `"AI→H"` duplicada en un objeto literal de `os-core.js` (la segunda pisaba a la primera silenciosamente). |
| 6 | MOV-01 | P1 | `livingorg-os/` nunca tuvo patrón off-canvas para móvil, solo colapso de escritorio. |
| 7 | MOV-02 | P2 | Auditoría responsiva del portal ERPNext post-reskin — encontró 2 desbordes horizontales reales (ver §2). |
| 8 | UX-01 | P2 | El portal ERPNext no tenía colapso de sidebar en escritorio (sí existía en `livingorg-os/`), ni persistencia entre sesiones. |
| 9 | DOC-01 | P2 | Instrucción de instalación ambigua sobre el nombre real del campo de contenido HTML en Frappe v15. |
| 10 | DOC-02 | P2 | Orden de creación de DocTypes no topológico — un child table enlazaba a DocTypes que el propio documento pedía crear después. |

Ningún hallazgo requirió tocar el core de ERPNext, eliminar una función
existente, o introducir una dependencia nueva — las 10 correcciones son
aditivas o de reordenamiento sobre el código ya presente.

---

## 2. Matriz de comparación (documentos ↔ portal)

| Requisito (documento fuente) | Elemento en el portal | Estado antes | Corrección aplicada | Archivo(s) | Prioridad |
|---|---|---|---|---|---|
| SOP Técnico §4 — DocTypes deben crearse y enlazarse por API sin fricción | `OS SOP`, `OS Run`, `OS Knowledge Source`, `OS Approval` | ❌ Falla creación por API (colisión de nombre) | Renombrado `process`→`process_ref` | `erpnext_setup/doctypes/{os_approval,os_knowledge_source,os_run,os_sop}.json` + 8 archivos JS | P0 |
| Blueprint §3 — Organigrama Vivo, jerarquía siempre navegable | Vista `/org`, `buildHierarchy()` | ❌ Cuelga con ciclos | Corte de ciclo por ancestor-walk + guardas de recursión | `portal/assets/js/pages/os-page-org.js` | P0 |
| SOP Técnico §5 — Process Studio, edición visual del flujo | Lienzo de `/processes/:id` | ⚠️ Solo modo clic, poco intuitivo | Drag-to-connect desde puerto del nodo | `portal/assets/js/os-canvas.js`, `portal/assets/css/os-portal.css`, `portal/assets/js/pages/os-page-processes.js` | P1 |
| Blueprint §2 — Organigrama Vivo, legibilidad de tarjetas | Tarjetas SVG del Organigrama | ⚠️ Texto se sobreponía a controles | `ellipsize()` con `getComputedTextLength()` | `portal/assets/js/pages/os-page-org.js` | P2 |
| — (bug de código, no de requisito) | `ui.badgeExec` | ⚠️ Clave duplicada silenciosa | Eliminada la duplicada | `portal/assets/js/os-core.js` | P3 |
| Blueprint §1 — "todo debe funcionar en computadora, tableta y celular" | Sidebar de `livingorg-os/` | ❌ Sin ocultar en móvil | Patrón off-canvas (hamburguesa + scrim + transform), portado del portal ERPNext | `livingorg-os/styles.css`, `livingorg-os/js/app.js` | P1 |
| Blueprint §1 — igual, aplicado al portal ya reskineado | Home (`/`) y modal "Nuevo proceso" del portal ERPNext en 390px | ❌ Desborde horizontal real | Grid `os-grid-mid` responsivo + pie de modal con `flex-wrap` | `portal/assets/css/os-portal.css`, `portal/assets/js/pages/os-page-home.js` | P2 |
| SOP Técnico §3 — paridad de UX entre portal y standalone | Sidebar del portal ERPNext | ❌ Sin colapso de escritorio ni persistencia | `getSidebarCollapsed/setSidebarCollapsed/toggleSidebar` + CSS `.os-shell.collapsed` | `portal/assets/js/os-core.js`, `portal/assets/css/os-portal.css` | P2 |
| SOP Técnico §2 — instalación "sin terminal, sin SSH" | `README_INSTALACION.md` §5 | ❌ Nombre de campo incorrecto/ambiguo | Aclarado `main_section_html` vs `main_section` | `erpnext_setup/README_INSTALACION.md` | P2 |
| SOP Técnico §2 — orden de creación de DocTypes | `README_INSTALACION.md` §2 | ❌ Orden no topológico | Reordenado contra los 20 `.json`; documentada la única referencia circular real (`OS Process`↔`OS SOP`) | `erpnext_setup/README_INSTALACION.md` | P2 |
| Blueprint §4 — tema claro/oscuro | Portal ERPNext (solo claro) vs `livingorg-os/` (claro/oscuro) | ⚠️ Inconsistente | **Pendiente documentado** (ver §9) | `docs/ARQUITECTURA.md` | P3 |

---

## 3. Código completo corregido

Entregado como commit `1119fb7` en la rama `claude/erpnext-portal-doctypes-ek0pwa`
del repositorio `Grupo224/Soft` (ya en `origin`, ver §6). Cada archivo se
entregó completo (no fragmentos) siguiendo la regla explícita de la
auditoría; el diff exacto es auditable con:

```bash
git diff eaa1880..1119fb7 -- <archivo>
```

## 4. Lista exacta de archivos modificados

```
CHANGELOG.md                                        (nuevo)
docs/AUDITORIA_2026-08_v1.1.0.md                    (nuevo, este documento)
erpnext_setup/README_INSTALACION.md
erpnext_setup/doctypes/os_approval.json
erpnext_setup/doctypes/os_knowledge_source.json
erpnext_setup/doctypes/os_run.json
erpnext_setup/doctypes/os_sop.json
livingorg-os/js/app.js
livingorg-os/styles.css
portal/assets/css/os-portal.css
portal/assets/js/os-canvas.js
portal/assets/js/os-core.js
portal/assets/js/pages/os-page-analytics.js
portal/assets/js/pages/os-page-home.js
portal/assets/js/pages/os-page-knowledge.js
portal/assets/js/pages/os-page-org.js
portal/assets/js/pages/os-page-processes.js
portal/assets/js/pages/os-page-runs.js
portal/assets/js/pages/os-page-sop.js
portal/assets/js/pages/os-page-work.js
```

19 archivos (17 modificados + 2 nuevos). Ningún archivo fuera de `portal/`,
`livingorg-os/`, `erpnext_setup/doctypes/*.json` o documentación fue tocado.

## 5. CHANGELOG

Ver [`CHANGELOG.md`](../CHANGELOG.md) — sección `[1.1.0]`, formato
Keep a Changelog. Incluye el detalle técnico de cada uno de los 10 ítems
corregidos y el pendiente documentado.

## 6. Número de versión

**v1.1.0**, con `v1.0.0` como punto de partida (estado del repositorio
justo antes de esta auditoría). Ambos tags existen **localmente** en el
commit de esta sesión, pero **no pudieron publicarse en `origin`** — ver la
nota en §9. Las ramas y commits sí están publicados:

| Tag | Commit | Publicado en origin |
|---|---|---|
| `v1.0.0` | `eaa1880` | Commit sí (era HEAD de la rama); el tag anotado no |
| `v1.1.0` | `1119fb7` | Commit sí (HEAD actual de la rama); el tag anotado no |

## 7. Instrucciones para instalar o publicar

No cambia el procedimiento de instalación ya documentado en
`erpnext_setup/README_INSTALACION.md` (ahora con las correcciones DOC-01 y
DOC-02) — la auditoría es 100% compatible con una instalación ya existente:

1. Actualiza el repositorio local a `claude/erpnext-portal-doctypes-ek0pwa`
   (o a `main` una vez fusionado) y vuelve a subir los archivos de
   `portal/assets/` al **File Manager** de ERPNext (paso 4 de la guía) —
   son los mismos nombres de archivo, solo contenido actualizado.
2. Si ya tienes las 20 DocTypes creadas con el `fieldname` viejo
   (`process`) en `OS SOP`, `OS Run`, `OS Knowledge Source` o
   `OS Approval`: renombra ese campo a `process_ref` desde
   **Desk → DocType → (el DocType) → campo `process`** antes de publicar
   este código, o los registros existentes quedarán con un campo huérfano.
   No hace falta migrar datos: Frappe conserva el valor al renombrar el
   fieldname si usas *Rename Field* desde el propio formulario del DocType.
3. Nada más requiere reinstalación — no hay dependencias nuevas, no hay
   cambios de esquema fuera del rename anterior, y ninguna URL/ruta del
   portal cambió.

## 8. Pruebas realizadas y resultados

Todas las pruebas son end-to-end con Playwright/Chromium contra un mock de
`window.fetch` (portal ERPNext) o el `index.html` real (`livingorg-os/`),
sin dependencias de red salvo Google Fonts (bloqueado por la sandbox sin
salida a internet — no relacionado con el código).

| Batería | Cobertura | Resultado |
|---|---|---|
| `run-smoke.js` … `run-smoke9.js` (9) | Regresión completa del portal ERPNext ya existente antes de esta auditoría (Organigrama, Process Studio, SOP Builder, Ejecución, Agentes/Prompts, Analítica, wizard de Procesos, Políticas) | ✅ 0 fallos, 0 errores de consola |
| `run-audit1.js` (nuevo) | BUG-01 (`process_ref` end-to-end en SOP/Run/Aprobaciones) + BUG-02 (ciclo no cuelga, renderiza en <100ms) | ✅ 5/5 |
| `run-audit2.js` (nuevo) | MOV-01 (off-canvas móvil: oculto → hamburguesa abre → scrim/nav cierran → sin overflow) | ✅ 9/9 |
| `run-audit3.js` (nuevo) | UX-01 (colapso de escritorio: clase, ARIA, ancho, persistencia en recarga, sin interferir con móvil) | ✅ 20/20 |
| `qa-sweep.js` (`livingorg-os/`) | Todas las rutas de navegación, formularios, canvas, sin overflow en 390px | ✅ 19/19 |
| `test-livingorg.js` (`livingorg-os/`) | Colapso de sidebar + persistencia, wizard completo de 6 pasos, gate de publicación, duplicar proceso | ✅ 25/25 |
| Auditoría visual MOV-02 (`shoot-mov02*.js`) | Home, Biblioteca de Procesos, Process Studio, modal "Nuevo proceso" (modo rápido y completo) en 390/720/1080px | ✅ 0px de overflow horizontal tras la corrección (era 38px en Home a 390px antes del fix) |

**Total: 12 baterías del portal ERPNext + 2 suites de `livingorg-os/` = 78
aserciones automatizadas, 0 fallos.**

## 9. Pendientes que requieren acceso o credenciales

- **UX-02 (tema claro/oscuro unificado)** — no requiere acceso externo,
  pero es una decisión de producto (¿el portal ERPNext debe ganar modo
  oscuro, o `livingorg-os/` debe perder el suyo para unificar?) que no
  estaba resuelta en los documentos fuente. Quedó documentada en
  `docs/ARQUITECTURA.md` § Pendientes, sin tocar código, a la espera de esa
  decisión.
- **Git tags no publicados** — `v1.0.0` y `v1.1.0` se crearon localmente en
  esta sesión, pero `git push origin v1.0.0 v1.1.0` fue rechazado con
  `HTTP 403` en 4 intentos (con backoff). La rama y sus commits **sí** se
  publicaron sin problema; el rechazo es específico de referencias de tipo
  tag, consistente con credenciales de sesión con alcance limitado a la
  rama de trabajo. Quien tenga acceso de push completo al repositorio
  puede recrear los tags apuntando exactamente a estos commits:
  ```bash
  git tag -a v1.0.0 eaa1880 -m "Punto de partida antes de la auditoria de bugs"
  git tag -a v1.1.0 1119fb7 -m "Auditoria de bugs y correcciones — Solicitud_Cambios_LivingOrgOS"
  git push origin v1.0.0 v1.1.0
  ```
- **Rama dedicada de correcciones** — el proceso de la auditoría (Fase 1)
  pedía crear una rama específica para las correcciones. Esta sesión está
  fijada por configuración a trabajar exclusivamente sobre
  `claude/erpnext-portal-doctypes-ek0pwa` y tiene prohibido empujar a
  cualquier otra rama sin permiso explícito, así que todo se aplicó ahí
  directamente en vez de en una rama nueva tipo `fix/auditoria-v1.1.0`. Si
  se prefiere aislarlo, se puede crear esa rama desde el commit `1119fb7`
  sin volver a tocar código.
- **Validación en ERPNext real** — todo lo anterior se probó contra un mock
  de API (Playwright + `window.fetch` stub), no contra una instancia
  Frappe/ERPNext viva, porque esta sesión no tiene credenciales ni acceso
  SSH a `demo.altoplano.mx` ni a ningún otro sitio. Antes de publicar en
  producción, conviene repetir al menos el flujo de BUG-01 (crear un
  `OS Run` y un `OS Approval` reales por la API) y DOC-02 (crear las 20
  DocTypes en el orden nuevo) contra una instancia de prueba.

## 10. Evidencia visual

Capturas desktop (1400×900) y móvil (390×844) adjuntas por separado en la
conversación:

- `ux01-expanded.png` / `ux01-collapsed.png` — colapso de sidebar de
  escritorio (UX-01), Centro de Mando.
- `mov02-home-390.png` — Home del portal ERPNext en 390px, tras corregir el
  desborde de "Mapa de ejecución" / "Health Score".
- `mov02-wizard-full-390.png` — asistente "Nuevo proceso" (modo completo)
  en 390px, tras corregir el recorte del pie de botones.
