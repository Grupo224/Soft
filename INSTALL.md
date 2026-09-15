# INSTALL

## Prerrequisitos

- ERPNext/Frappe accesible por HTTPS.
- Usuario técnico con permisos suficientes para crear/actualizar Custom DocTypes, Roles, Files y Web Pages.
- Python 3.10+.
- Acceso local al repositorio.

## 1. Preparar Python

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-deploy.txt
```

## 2. Configurar variables

No copies secretos dentro de ningún `.py` o `.js`.

Linux/macOS:

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="TU_API_KEY"
export FRAPPE_API_SECRET="TU_API_SECRET"
```

PowerShell:

```powershell
$env:FRAPPE_BASE_URL="https://erp.example.com"
$env:FRAPPE_API_KEY="TU_API_KEY"
$env:FRAPPE_API_SECRET="TU_API_SECRET"
```

Opcional:

```bash
export FRAPPE_TIMEOUT_SECONDS=90
export LIVINGORG_REPO_ROOT="$(pwd)"
```

## 3. Validar repositorio

```bash
python scripts/validate_repo.py
python scripts/deploy.py --mode install --dry-run
```

El dry-run no escribe en ERPNext; valida configuración, JSONs y assets requeridos.

## 4. Instalar

```bash
python scripts/deploy.py --mode install
```

El instalador crea o actualiza de forma idempotente:

- `OS Business Layer`;
- roles `OS *`;
- Custom DocTypes;
- assets públicos del portal;
- Web Page `/os`.

Los permisos enviados a Frappe se normalizan desde `scripts/permissions.py`. No uses los JSON de `erpnext_setup/doctypes` como mecanismo independiente de permisos sin pasar por el despliegue canónico.

## 5. Validación manual requerida

En ERPNext verifica:

1. `/os` exige sesión y no abre como Guest.
2. `OS Viewer` y `OS Auditor` no pueden crear/escribir DocTypes OS.
3. Un operador sólo recibe el alcance que la política real de Frappe le permita.
4. Carga, búsqueda, CRUD y adjuntos funcionan según el rol.
5. No aparecen errores no controlados en consola.

La restricción documental por usuario/empresa debe configurarse con User Permissions, shares o una Custom App según el caso. La UI no sustituye autorización de servidor.
