# Modo B — API-First / OpenClaw

Este modo permite instalar y actualizar LivingOrg OS sin SSH y sin Bench usando HTTPS + Frappe REST API.

## Alcance

Por API se sincronizan:

- `Module Def` de LivingOrg;
- roles `OS *`;
- Custom DocTypes y child tables;
- overlays aditivos de schema;
- permisos canónicos definidos por el repositorio;
- CSS/JS públicos del portal;
- Web Page `/os`;
- verificación de identidad/capacidades.

No se instalan módulos Python ni hooks de Frappe por REST. No afirmar que `livingorg_bridge` está activo si no lo está.

## Requisitos

- ERPNext/Frappe v15+ accesible por HTTPS;
- usuario técnico dedicado con permisos suficientes;
- API Key + API Secret guardados únicamente en OpenClaw/secret store;
- acceso de lectura a esta rama/repo;
- Python 3.10+ si el agente ejecuta los scripts del repositorio localmente. El agente también puede reproducir las mismas llamadas REST directamente.

Variables:

```bash
export FRAPPE_BASE_URL="https://erp.example.com"
export FRAPPE_API_KEY="..."
export FRAPPE_API_SECRET="..."
```

## Preflight obligatorio

```bash
python scripts/preflight.py
```

Debe validar identidad, lectura de DocType y accesibilidad de recursos necesarios antes de escribir.

## Dry-run

```bash
python scripts/validate_repo.py
python scripts/deploy_api.py --mode install --dry-run
```

## Instalación

```bash
python scripts/deploy_api.py --mode install
python scripts/verify.py
```

## Actualización

```bash
python scripts/deploy_api.py --mode update --dry-run
python scripts/deploy_api.py --mode update
python scripts/verify.py
```

## Runtime operativo

El schema/portal no debe depender de secretos embebidos en frontend. Para las funciones que actualmente viven en `livingorg_bridge` hay dos opciones soportadas conceptualmente:

### A. External OpenClaw Runtime

OpenClaw mantiene la frontera de autorización y ejecuta acciones contra ERPNext usando su usuario técnico/API. Debe aplicar allowlists, validaciones de transición y auditoría equivalentes al Bridge. Nunca delegar esas validaciones sólo al navegador.

### B. Server Script Runtime

Sólo cuando el sitio YA tenga Server Scripts habilitados por su administrador. Los API Server Scripts pueden exponerse bajo `/api/method/...` y ser instalados/actualizados mediante API si los permisos/configuración del sitio lo permiten. El instalador no debe intentar habilitar Server Scripts modificando `site_config.json`, porque eso rompería la premisa sin SSH/Bench.

## Resultado permitido sin runtime operativo

Si no existe Bridge, OpenClaw Runtime ni Server Script Runtime, INSTALL puede dejar schema + portal sincronizados, pero VERIFY debe reportar estado `DEGRADED`/capacidad faltante para runs/approvals/actions. Nunca ocultar esa condición.

## Seguridad

- Safe mode siempre activo por defecto.
- No `DELETE` de DocTypes/campos/datos como parte de INSTALL o UPDATE.
- No ejecutar `reinstall.py` ni `cleanup_data.py`.
- No guardar tokens en Git, Web Page, File público ni JavaScript.
- El frontend usa sesión same-origin; el usuario técnico pertenece al agente, no al navegador.
