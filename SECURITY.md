# SECURITY

## Política

- Nunca almacenar secretos en Git, JavaScript, HTML, JSON de DocTypes o documentación.
- El portal `/os` usa exclusivamente sesión same-origin de Frappe.
- Credenciales de deployment se leen de `FRAPPE_BASE_URL`, `FRAPPE_API_KEY` y `FRAPPE_API_SECRET`.
- `.env` y variantes están ignorados por Git; `.env.example` sólo contiene placeholders.

## Incidente histórico de credenciales

Versiones anteriores del repositorio público contenían API credentials hardcodeadas. El HEAD reparado ya no depende de ellas, pero **cualquier credencial publicada debe considerarse comprometida**.

Acciones requeridas por un administrador de ERPNext:

1. revocar/eliminar las API keys históricas del usuario técnico;
2. generar credenciales nuevas con el menor privilegio posible;
3. revisar logs de acceso y operaciones inusuales desde la fecha de exposición;
4. configurar las nuevas credenciales únicamente como variables del entorno de deployment.

No se ejecutó ninguna prueba contra las credenciales expuestas durante esta reparación.

## Historial Git

Quitar un secreto del HEAD no lo elimina de commits antiguos. Reescribir historial (`git filter-repo`, BFG u otra técnica) cambia SHAs y puede afectar clones/branches. Por ser una operación disruptiva no se ejecuta automáticamente en esta reparación. Rotar la credencial es obligatorio incluso si posteriormente se limpia el historial.

## XSS

`portal/assets/js/os-hardening.js` sanitiza rich HTML mediante allowlist y bloquea:

- `script`, `style`, `iframe`, `object`, `embed`, SVG/MathML dinámicos;
- atributos `on*`, `style`, `srcdoc`;
- protocolos no permitidos;
- enlaces/imagenes con URLs inseguras.

No se deben añadir nuevos puntos de `innerHTML` con datos no confiables sin escape/sanitización.

## Autorización

`scripts/permissions.py` normaliza permisos de roles OS durante deployment. `OS Viewer` y `OS Auditor` son read-only.

Esto NO sustituye restricciones documentales. Para “sólo mis tareas”, Company, área, confidencialidad o asignaciones, usar autorización de servidor de Frappe (User Permissions, shares, permission query conditions o Custom App). Los filtros del navegador son sólo UX.

## Reporte

Si se detecta una credencial, token o vulnerabilidad en un PR, no la pegues en comentarios públicos. Revócala primero y describe el incidente sin reproducir el secreto.
