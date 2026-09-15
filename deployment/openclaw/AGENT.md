# OpenClaw Deployment Agent Contract

Este archivo define cómo debe actuar OpenClaw al instalar, actualizar o verificar LivingOrg OS.

## Versión obligatoria del Organigrama

```text
CURRENT STABLE CODE: Organigrama Vivo 2.0.0
SOURCE BRANCH:       release/organigrama-v2.0
PORTAL ROUTE:        /os#/org
PREVIOUS STABLE:     archive/organigrama-v1-stable
PREVIOUS COMMIT:     a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
```

OpenClaw NO debe seleccionar `os-page-org.js` como implementación vigente sólo porque tenga un nombre más corto. El frontend 2.0 es `portal/assets/js/pages/os-page-org-v2.js`. El legacy se mantiene para rollback/trazabilidad.

## Objetivo

Permitir que el usuario indique solamente repositorio, rama, ERPNext y modo de despliegue sin que el agente improvise arquitectura ni operaciones destructivas.

## Orden de lectura obligatorio

1. `/AGENTS.md`
2. `/deployment/manifest.json`
3. `/docs/ORGANIGRAMA_V2.md`
4. `/docs/ORGANIGRAMA_MIGRATION_2.0.md`
5. `/docs/ORGANIGRAMA_TESTING_2.0.md`
6. `/SECURITY.md`
7. `/deployment/README.md`
8. guía específica del modo solicitado
9. `/ROLLBACK.md`

Si cualquiera de estos archivos contradice una inferencia del agente, prevalece el contrato explícito de `deployment/manifest.json` y la documentación 2.0.

## Modos

### `bench`

Usar cuando el usuario autoriza SSH/Bench. Instalar/verificar `livingorg_bridge` y después sincronizar schema/portal. Este modo habilita `validate_org_relation` server-side.

### `api`

Usar cuando el usuario prohíbe SSH/Bench o solicita API-only. No intentar instalar un Custom App Python. No intentar editar `site_config.json`. Sincronizar mediante Frappe REST API.

En API-only puro, las reglas de jerarquía 2.0 son prevención de UX; no afirmar que existe enforcement server-side sin runtime compatible.

### `auto`

Sólo usar si el usuario no especificó modo. Detectar primero `livingorg_bridge.status.capabilities`. Si está disponible y el usuario permite esa arquitectura, usar Bridge. Si no está disponible, seleccionar API y reportar la capacidad operativa real.

## Reglas no negociables

- Nunca borrar archivos o datos para "limpiar" una instalación.
- Nunca ejecutar `reinstall.py` o `cleanup_data.py` durante INSTALL/UPDATE.
- Nunca almacenar API Secret en Git ni en assets públicos.
- Nunca enviar el API Secret al navegador.
- Nunca confiar en controles frontend como autorización.
- No crear una segunda copia de los DocTypes para API.
- No crear un segundo frontend para API.
- `erpnext_setup/doctypes/` y `portal/` son fuente de verdad compartida.
- Toda operación debe poder reintentarse sin duplicar objetos.
- No migrar automáticamente `OS Org Relation` históricos.
- No eliminar campos de Role Card/KPI/SOP para “igualar” una instalación anterior.
- No modificar `Employee` maestro al asignar una persona en el Organigrama salvo instrucción explícita separada.
- No invertir el orden de carga `os-page-org-v2.js` → `os-page-org.js`.

## Flujo API 2.0 — UPDATE

Ejecutar exactamente en este orden:

1. Confirmar repo `Grupo224/Soft` y branch `release/organigrama-v2.0`.
2. Registrar el commit exacto que será desplegado.
3. Validar secretos en entorno; NO imprimirlos.
4. `GET /api/method/frappe.auth.get_logged_user`.
5. Ejecutar `python scripts/preflight.py`.
6. Ejecutar `python scripts/validate_repo.py`.
7. Ejecutar `python scripts/validate_org_v2.py`.
8. Ejecutar `python scripts/deploy_api.py --mode update --dry-run`.
9. Si el dry-run falla, STOP. No intentar reparar con DELETE/reinstall.
10. Ejecutar `python scripts/deploy_api.py --mode update`.
11. Ejecutar `python scripts/verify.py`.
12. Comprobar que `/os` carga y que el HTML referencia `os-org-v2.css` y `os-page-org-v2.js` antes de `os-page-org.js`.
13. Ejecutar el checklist viable de `docs/ORGANIGRAMA_TESTING_2.0.md` en staging.
14. Emitir reporte con objetos creados/actualizados, runtime y pruebas realmente ejecutadas.

## Flujo API 2.0 — INSTALL

Igual que UPDATE, sustituyendo:

```bash
python scripts/deploy_api.py --mode install --dry-run
python scripts/deploy_api.py --mode install
```

## Orden de schema de Organigrama 2.0

El agente no debe inventar DocTypes paralelos. Debe usar los specs existentes y el `DT_PLAN` de `scripts/deploy.py`.

Cambios 2.0 relevantes y aditivos:

```text
OS Role Card
  + org_node
  + purpose
  + objectives
  + functions
  + competencies
  + tools
  + process_refs
  + sop_refs

OS KPI Definition
  + org_node
  + role_card
  + designation
  + entity_type Position / RoleCard

OS SOP
  + responsible_node
```

No se requiere transformación masiva de datos para estos campos.

## Assets 2.0 obligatorios

OpenClaw debe verificar al menos:

```text
/files/os-org-v2.css
/files/os-page-org-v2.js
/files/os-page-org.js
```

Y en la Web Page `/os` el orden debe ser:

```text
os-page-org-v2.js
os-page-org.js
```

No borrar el asset legacy como parte de la actualización.

## Comportamiento esperado 2.0

La UX principal debe reflejar:

```text
Company -> Department
Department -> Department | Designation
Designation -> Designation | Employee | Agent
Employee -> no hierarchy children
Agent -> no hierarchy children
```

`title` es display name. `company/department/designation/employee/agent` son referencias vinculadas, no overrides del display.

## Política de escritura

INSTALL y UPDATE permiten `POST`/`PUT` de objetos administrados por LivingOrg. `DELETE` no forma parte de una migración de datos 2.0. El mecanismo canónico histórico puede reemplazar registros `File` de assets al publicar el mismo filename; eso no autoriza borrar datos de negocio, DocTypes, relaciones o campos.

Si una versión futura requiere una operación destructiva de datos debe existir migración explícita versionada, backup comprobado y autorización específica del usuario.

## Runtime operativo en modo API

No reescribir la seguridad del Bridge como JavaScript. Las funciones `start_run`, `start_step`, `complete_step`, `execute_action`, approvals, evidence enforcement y enforcement server-side completo de reglas críticas requieren runtime server-side.

Opciones válidas:

- `livingorg_bridge` ya instalado;
- runtime externo OpenClaw con allowlist y auditoría;
- Server Script Runtime cuando Server Scripts ya estén habilitados y exista una implementación revisada.

Si ninguno existe, marcar instalación `DEGRADED`, conservar acceso administrativo al modelado y no representar la validación frontend como autorización.

## Rollback exacto

Si se solicita rollback de Organigrama Vivo 2.0:

```text
branch: archive/organigrama-v1-stable
commit: a2b7b88ae3dbbf38b1c93a466c9419e7977af19f
```

No borrar campos 2.0 ni sus datos durante rollback normal. Ver `/ROLLBACK.md`.

## Estados de reporte

Para deployment/runtime:

- `FULL`: schema/portal + Bridge/runtime server-side requerido verificados.
- `DEGRADED`: schema/portal correctos pero runtime server-side incompleto.
- `FAILED`: instalación/verificación falló.

Para readiness de Organigrama 2.0:

- `READY FOR STAGING`: CI/validadores estáticos en verde, falta E2E real.
- `READY FOR PRODUCTION`: sólo después de ejecutar y documentar E2E de `docs/ORGANIGRAMA_TESTING_2.0.md` en ERPNext real.

No convertir `READY FOR STAGING` en `READY FOR PRODUCTION` por inferencia.

## Resultado final obligatorio

Reportar siempre:

- repositorio/rama/commit usados;
- versión Organigrama;
- modo efectivo;
- ERPNext base URL sin secretos;
- objetos creados/actualizados/verificados;
- estado runtime `FULL`, `DEGRADED` o `FAILED`;
- readiness `READY FOR STAGING`, `READY FOR PRODUCTION` o `BLOCKED`;
- pruebas con estado real `PASS`, `FAIL` o `NO PROBADO`;
- fallas/capacidades pendientes;
- cero secretos en salida/logs.
