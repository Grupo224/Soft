# API capability matrix

Esta matriz evita confundir "desplegable por API" con "runtime Python instalado".

| Capacidad | Bench + Bridge | API-only schema/portal | API + OpenClaw Runtime | API + Server Script Runtime* |
|---|---:|---:|---:|---:|
| Crear/actualizar roles | Sí | Sí | Sí | Sí |
| Crear/actualizar Custom DocTypes | Sí | Sí | Sí | Sí |
| Sincronizar permisos del DocType | Sí | Sí | Sí | Sí |
| Subir CSS/JS | Sí | Sí | Sí | Sí |
| Crear/actualizar `/os` | Sí | Sí | Sí | Sí |
| Escrituras del navegador (token CSRF de sesión vía `livingorg_api_csrf`) | Sí | Sí, si Server Scripts están habilitados | Sí, si Server Scripts están habilitados | Sí |
| Hooks Python `doc_events` | Sí | No | No | Parcial/equivalente |
| `permission_query_conditions` Python | Sí | No | No | No equivalente directo garantizado |
| `has_permission` Python | Sí | No | No | No equivalente directo garantizado |
| Start Run con validación server-side | Sí | No | Sí, si runtime implementado | Sí, si script implementado |
| Start/Complete Step | Sí | No | Sí, si runtime implementado | Sí, si script implementado |
| Evidence enforcement | Sí | No | Sí, si runtime implementado | Sí, si script implementado |
| Approval enforcement | Sí | No | Sí, si runtime implementado | Sí, si script implementado |
| ERPNext document actions allowlist | Sí | No | Sí, si runtime implementado | Sí, sujeto a sandbox/API disponibles |
| Mappers nativos ERPNext Python | Sí | No | No directamente; usar APIs compatibles | Depende de sandbox/métodos disponibles |
| Requiere SSH/Bench | Sí | No | No | No para instalar scripts; Server Scripts deben estar habilitados previamente |

`*` Server Script Runtime sólo es opción cuando el sitio ya tiene Server Scripts habilitados y la configuración de hosting lo permite.

## Estados de VERIFY

- `FULL`: Bridge nativo disponible y capacidades críticas confirmadas.
- `API_RUNTIME`: runtime externo/server-script declarado y verificado por su health/capability endpoint.
- `DEGRADED`: schema + portal instalados, pero falta runtime operativo para acciones críticas.
- `FAILED`: identidad/API/schema base no verificables.

## Regla de UX

El portal debe deshabilitar u ocultar de forma explícita las acciones que requieran un runtime no disponible. Nunca presentar un botón operativo que sólo fallará después por ausencia del backend.
