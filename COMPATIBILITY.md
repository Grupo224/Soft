# COMPATIBILITY

## Soporte objetivo

- ERPNext/Frappe: implementación basada en REST estándar, Web Page, Custom DocTypes, Roles y Files. Debe validarse contra la versión concreta del sitio antes de producción.
- Navegadores: Chrome/Chromium modernos con `fetch`, Promises, `AbortController`, CSS Grid/Flex y Custom Properties.
- Viewports objetivo: 320, 360, 375, 390, 430 px, tablets, laptop, desktop y pantallas grandes.
- JavaScript: Vanilla JS; no requiere framework ni build frontend.
- Python: 3.10+ recomendado para tooling de deployment.

## Compatibilidad hacia atrás

Se conservan:

- `install.py`;
- `update.py`;
- `update_v2.py`;
- `deploy_standalone.py`;
- generaciones standalone y Flow Studio.

Los entrypoints legacy delegan en el deployment canónico. No se eliminaron funcionalidades por considerarlas antiguas.

## Dependencias externas

Frontend: ninguna dependencia JavaScript nueva. Las fuentes de Google son opcionales visualmente; existe fallback a fuentes del sistema.

Deployment: `requests`, ya utilizado históricamente por los scripts y formalizado en `requirements-deploy.txt`.

## Limitaciones conocidas

- `document.execCommand` del editor enriquecido es una API legacy del navegador; se conserva por compatibilidad. La sanitización se aplica alrededor del editor. Una migración futura a otro editor requiere evaluación separada.
- Reglas de seguridad documentales y transiciones fuertes no pueden garantizarse sólo desde HTML/CSS/JS. Requieren configuración/permisos de Frappe o Custom App.
- Las pruebas visuales reales requieren navegador/runtime; la validación estática no las sustituye.
