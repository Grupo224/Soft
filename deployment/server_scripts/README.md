# Server Scripts administrados por el producto

Server Scripts (tipo **API**) que el portal necesita y que `scripts/deploy.py`
publica de forma **aditiva**: si el script ya existe en el sitio, se conserva tal
cual; sólo se crea cuando falta.

| Script | API method | Por qué existe |
| :--- | :--- | :--- |
| `livingorg_api_csrf.json` | `livingorg_api_csrf` | La Web Page `/os` se sirve con `frappe.csrf_token = "None"` (no hay meta `csrf-token`). Las sesiones **autenticadas** sí exigen CSRF, así que todo POST/PUT/DELETE del navegador fallaba en silencio. Este endpoint devuelve el token real de la sesión y `os-api.js` lo precarga antes de escribir. |

Notas:

- Requiere que el sitio tenga **Server Scripts habilitados** (`server_script_enabled`). Si el hosting los tiene deshabilitados, el despliegue continúa y `scripts/verify.py` lo reporta como `[portal] WARN`.
- El cuerpo del script es una línea a propósito: dentro de `safe_exec` no conviene añadir imports ni helpers, y `frappe.sessions.get_csrf_token()` devuelve `None` en ese contexto.
- Si el endpoint no existe, el portal no rompe la lectura; sólo fallan las escrituras (es el caso que se corrigió el 2026-09-15).
