# TROUBLESHOOTING

## El portal muestra “Necesitas iniciar sesión”

1. abre `/app` y confirma que la sesión ERPNext esté activa;
2. vuelve a `/os` en el mismo origen;
3. en Network revisa `/api/method/frappe.auth.get_logged_user`;
4. un 401 implica sesión expirada; un 403 implica permisos insuficientes.

## Error 403 al guardar

No eleves permisos desde JavaScript. Revisa Role Permission Manager, `scripts/permissions.py` y, si aplica, User Permissions/Company. Prueba con el rol real, no con Administrator.

## HTTP 200 pero la UI reporta error

Es intencional: Frappe puede transportar `exc`/`exception` dentro del payload. `os-api.js` trata esos payloads como fallo y muestra correlation id para diagnóstico.

## Assets viejos después de deployment

```bash
python cache_bust.py
```

Después recarga sin caché. Confirma en Network que `os-hardening.css`, `os-hardening.js` y `os-api.js` tienen la clave `?v=` actual.

## El deployment no arranca

Comprueba variables:

```bash
python -c "import os; print(bool(os.getenv('FRAPPE_BASE_URL')), bool(os.getenv('FRAPPE_API_KEY')), bool(os.getenv('FRAPPE_API_SECRET')))"
```

No imprimas los valores. Luego:

```bash
python scripts/deploy.py --mode update --dry-run
```

## Timeout / 429 / 502 / 503 / 504

El cliente de deployment reintenta errores temporales con backoff. Puedes ampliar de forma razonable:

```bash
export FRAPPE_TIMEOUT_SECONDS=180
```

No aumentes indefinidamente el timeout para ocultar un problema del servidor.

## Overflow móvil

Prueba 320, 360, 375, 390 y 430 px. El documento completo no debe desplazarse horizontalmente. Tablas, pasos y canvases pueden desplazarse dentro de su propio contenedor cuando su naturaleza lo requiera.

## Rich text eliminado al guardar

La sanitización elimina contenido no permitido. Evita scripts, iframes, inline styles, handlers `on*` y URLs no HTTPS/relativas. Esto es una medida de seguridad, no pérdida accidental.

## “Mi Trabajo” muestra sólo mis registros, ¿eso es seguridad?

No. Es un filtro UX. La restricción real requiere autorización documental de Frappe. Ver `SECURITY.md` y `ARCHITECTURE.md`.

## Validación estática

```bash
python scripts/validate_repo.py
python -m compileall scripts *.py
```

Si Node está disponible:

```bash
find portal livingorg-os livingorg-os-v2 livingorg-flow-studio-v3 -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Reinstalación bloqueada

Es correcto. `reinstall.py` y `cleanup_data.py` exigen doble guard para evitar destrucción accidental. Consulta `ROLLBACK.md` antes de habilitar `LIVINGORG_ALLOW_DESTRUCTIVE=1`.
