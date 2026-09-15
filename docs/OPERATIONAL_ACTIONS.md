# Acciones Operativas — LivingOrg OS

## Objetivo

Un paso de proceso no sólo describe trabajo: puede declarar **qué acción ocurre en ERPNext** y cada ejecución registra el documento real producido.

Ejemplo:

```text
Paso: Crear factura
Sistema: ERPNext
Acción: CREATE_FROM_SOURCE
Source DocType: Sales Order
Target DocType: Sales Invoice
Resultado del Run: Sales Invoice ACC-SINV-2026-00042
```

## Modelo

```text
OS Process
  ├─ OS Process Step
  └─ OS Process Action  (configuración)

OS Run
  └─ OS Step Run
       └─ OS Document Link (documentos reales de esa ejecución)
```

`OS Process Action` es configuración reutilizable. `OS Document Link` es historial operativo; nunca se guarda un folio fijo dentro de la definición del proceso.

## Acciones disponibles

- `OPEN_DOCUMENT`: vincula/abre un documento existente.
- `CREATE_DOCUMENT`: crea un documento nuevo usando `defaults_json` y valores autorizados del usuario.
- `CREATE_FROM_SOURCE`: transforma un documento origen en otro. Para pares estándar usa mappers nativos ERPNext.
- `UPDATE_DOCUMENT`: actualiza campos editables de un documento existente.
- `SUBMIT_DOCUMENT`: envía un documento en Draft si el usuario tiene permiso Submit.
- `LINK_DOCUMENT`: vincula un documento ya existente al Step Run.

No existe `CALL_METHOD`, `RUN_PYTHON` ni configuración de dotted paths arbitrarios.

## Seguridad

El Custom App `livingorg_bridge` comprueba en servidor:

1. sesión autenticada;
2. asignación del Step Run al usuario/rol;
3. rol adicional declarado por la acción, cuando exista;
4. permisos nativos `read/write/create/submit` del DocType ERPNext;
5. existencia del Source/Target DocType;
6. allowlist de acciones;
7. campos editables, rechazando metacampos reservados;
8. evidencia/aprobación antes de completar un paso;
9. transición de estados válida.

El frontend sólo mejora UX; no es la frontera de autorización.

## Ejemplo: Sales Order → Sales Invoice

En Process Studio → **Acciones ERPNext**:

```text
Paso: Facturar pedido
Nombre: Crear factura
Acción: Crear desde documento origen
Source DocType: Sales Order
Target DocType: Sales Invoice
Regla de finalización: Document Linked
Obligatoria: Sí
Enviar tras crear: No
```

Al iniciar un Run se puede seleccionar el `Sales Order` origen. Cuando el operador ejecuta **Crear factura**, el servidor usa el mapper nativo de ERPNext, inserta el `Sales Invoice` con los permisos del usuario y crea `OS Document Link`.

## Test vs Live

- `Test`: permite probar un proceso sin exigir que esté Active. Los documentos ERPNext que se creen siguen siendo **documentos reales**; por eso conviene usar una instancia demo/staging o acciones de sólo vínculo durante pruebas.
- `Live`: sólo debe usarse con procesos `Active` y usuarios autorizados.

## Limitaciones deliberadas

- No se intenta inferir automáticamente todos los mappings posibles de ERPNext.
- Los pares no incluidos en la allowlist nativa requieren mapping declarativo o una extensión explícita del Custom App.
- Integraciones externas (WhatsApp, n8n, APIs) quedan declaradas como `External`, pero no se ejecutan por este bridge hasta implementar un conector específico.
