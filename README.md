# LivingOrg OS

LivingOrg OS es una capa operativa sobre ERPNext/Frappe para modelar estructura, procesos, SOPs, ejecución, evidencia, aprobaciones, agentes, conocimiento y KPIs sin modificar el core de ERPNext, Frappe o Frappe CRM.

## Componentes

- `portal/`: portal principal `/os`, HTML/CSS/JavaScript Vanilla conectado por sesión same-origin a Frappe.
- `erpnext_setup/doctypes/`: esquemas de los Custom DocTypes `OS *`.
- `scripts/`: configuración, permisos canónicos, cliente REST, validación y despliegue reproducible.
- `livingorg-os/`, `livingorg-os-v2/`, `livingorg-flow-studio-v3/`: generaciones standalone/prototipos visuales conservadas por compatibilidad y referencia UX.
- scripts raíz (`install.py`, `update.py`, `update_v2.py`, `deploy_standalone.py`): entrypoints legacy conservados; delegan en `scripts/deploy.py`.

## Regla de arquitectura

ERPNext/Frappe es la fuente de verdad. Los canvases y prototipos visuales no deben convertirse en una segunda base de datos. No se modifica core.

## Inicio rápido

1. Lee `SECURITY.md` antes de usar credenciales.
2. Copia `.env.example` a `.env` fuera de Git y exporta sus variables en tu shell.
3. Instala la dependencia existente del tooling de despliegue: `python -m pip install -r requirements-deploy.txt`.
4. Valida: `python scripts/validate_repo.py`.
5. Haz un dry-run: `python scripts/deploy.py --mode update --dry-run`.
6. Despliega: `python scripts/deploy.py --mode update`.

Consulta `INSTALL.md`, `DEPLOYMENT.md`, `ROLLBACK.md` y `TROUBLESHOOTING.md` para el procedimiento completo.

## Seguridad

Nunca publiques API keys, API secrets, cookies, contraseñas ni tokens en este repositorio. El portal usa sesión same-origin de Frappe y no necesita secretos en JavaScript. Los permisos efectivos de los DocTypes durante el despliegue se normalizan desde `scripts/permissions.py`.

> Importante: versiones anteriores del repositorio contenían credenciales hardcodeadas. Deben considerarse comprometidas y rotarse en ERPNext aunque ya no aparezcan en el HEAD actual. Reescribir historial Git es una operación separada y potencialmente disruptiva; ver `SECURITY.md`.

## Desarrollo

No elimines generaciones antiguas solamente por estar duplicadas. Si un entrypoint queda obsoleto, se conserva como `DEPRECATED` o wrapper hasta una migración explícita. No introduzcas frameworks frontend sin una necesidad demostrable.

## Documentación

- `ARCHITECTURE.md`: arquitectura y fronteras.
- `AGENTS.md`: instrucciones para OpenClaw/Claude/Codex y otros agentes.
- `INSTALL.md`: instalación.
- `DEPLOYMENT.md`: despliegue/actualización.
- `UPGRADE.md`: estrategia de upgrade.
- `ROLLBACK.md`: reversión.
- `SECURITY.md`: seguridad y secretos.
- `COMPATIBILITY.md`: compatibilidad.
- `TROUBLESHOOTING.md`: diagnóstico.
- `CHANGELOG.md`: historial de producto.
