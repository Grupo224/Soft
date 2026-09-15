# INSTALL — LivingOrg OS operativo

## Prerrequisitos

- ERPNext/Frappe v15+ accesible por HTTPS.
- Bench con acceso para instalar un Custom App.
- Usuario técnico con permisos suficientes para crear/actualizar Custom DocTypes, Roles, Files y Web Pages.
- Python 3.10+ para el deployment externo.
- Repositorio `Grupo224/Soft` clonado en el servidor o en una máquina autorizada.
- Backup reciente del sitio antes de instalar.

> LivingOrg no modifica el core de ERPNext/Frappe. La lógica server-side vive en `livingorg_bridge` y los objetos de negocio viven en Custom DocTypes `OS *`.

## 1. Obtener la versión a instalar

Mientras el PR operativo no esté fusionado usa:

```bash
git fetch origin
git checkout repair/prompt-maestro-2026-09
git pull origin repair/prompt-maestro-2026-09
git rev-parse HEAD
```

El instalador debe registrar el SHA exacto desplegado.

## 2. Backup

Desde el bench:

```bash
bench --site TU-SITIO backup --with-files
```

No continúes si el backup falla.

## 3. Instalar LivingOrg Bridge

Desde la carpeta del bench, usando la ruta absoluta del monorepo. Bench soporta `get-app` desde filesystem y `--soft-link` evita copiar o clonar de nuevo la carpeta anidada del app:

```bash
bench get-app --soft-link /RUTA/ABSOLUTA/Soft/frappe_app/livingorg_bridge
bench --site TU-SITIO install-app livingorg_bridge
bench --site TU-SITIO migrate
bench --site TU-SITIO clear-cache
```

En producción, el repositorio fuente usado por el symlink debe permanecer en una ruta estable y legible por el usuario de Bench. Si el equipo prefiere una copia física, puede empaquetar/publicar `frappe_app/livingorg_bridge` como repositorio de app separado en una fase posterior.

Verifica:

```bash
bench --site TU-SITIO list-apps
```

Debe aparecer `livingorg_bridge` junto a `frappe` y `erpnext`.

## 4. Preparar deployment de Custom DocTypes + portal

En la raíz de `Soft`:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-deploy.txt
```

Configura credenciales de un usuario técnico. Nunca las guardes en Git:

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="TU_API_KEY"
export FRAPPE_API_SECRET="TU_API_SECRET"
export LIVINGORG_REPO_ROOT="$(pwd)"
```

## 5. Validar antes de escribir

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode install --dry-run
```

El dry-run valida JSONs, topología de DocTypes y assets sin modificar ERPNext.

## 6. Sincronizar LivingOrg OS

```bash
python scripts/deploy.py --mode install --require-bridge
```

Esto crea/actualiza de forma idempotente:

- `OS Business Layer`;
- roles `OS *`;
- Custom DocTypes y child tables, incluidos `OS Process Action` y `OS Document Link`;
- campos operativos de `OS Process`, `OS Run` y `OS Step Run` mediante overlays;
- permisos canónicos;
- assets del portal;
- Web Page `/os`;
- verificación de `livingorg_bridge`.

Después:

```bash
bench --site TU-SITIO migrate
bench --site TU-SITIO clear-cache
bench restart
```

## 7. Smoke test obligatorio

Inicia sesión como `OS Admin` o `System Manager` y valida:

1. abre `/os`;
2. abre un proceso en Process Studio;
3. aparece **⚙ Acciones ERPNext** con indicador verde del Bridge;
4. crea una acción `LINK_DOCUMENT` contra un DocType inocuo de prueba;
5. crea un Run `Test`;
6. confirma que se crean `OS Run` + `OS Step Run`;
7. inicia el Step Run desde **Mi Trabajo**;
8. ejecuta/vincula el documento desde **ERPNext**;
9. verifica que aparece un `OS Document Link`;
10. completa el paso;
11. si el paso exige evidencia, confirma que el servidor bloquea completar sin ella;
12. si exige aprobación, confirma que se crea `OS Approval`, el paso queda Waiting y sólo el aprobador puede decidir.

## 8. Prueba del caso Sales Order → Sales Invoice

Hazla primero en staging/demo:

- proceso Active de prueba;
- acción `CREATE_FROM_SOURCE`;
- Source DocType `Sales Order`;
- Target DocType `Sales Invoice`;
- `submit_after_create = 0`.

Inicia el Run con un Sales Order de prueba y ejecuta la acción. Debe crear un Sales Invoice **Draft**, registrar `OS Document Link` y permitir abrirlo desde LivingOrg.

No actives `submit_after_create` hasta validar impuestos, cuentas, series, warehouses y permisos del sitio.

## 9. Roles

Asigna los roles `OS *` desde ERPNext y usa User Permissions por Company cuando corresponda. `livingorg_bridge` añade restricciones de usuario/rol para Step Runs y Aprobaciones, pero no sustituye la segmentación de Company de ERPNext.

## 10. Qué no usar

- No uses `reinstall.py` para actualizar.
- No pegues tokens/API keys en scripts.
- No edites ERPNext/Frappe core.
- No habilites Server Scripts inseguros para sustituir el Bridge.
- No configures métodos Python arbitrarios desde el portal.

Consulta también `DEPLOYMENT.md`, `ROLLBACK.md`, `SECURITY.md` y `docs/OPERATIONAL_ACTIONS.md`.
