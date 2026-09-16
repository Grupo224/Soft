# LivingOrg Bridge

Custom Frappe App complementaria a LivingOrg OS. No modifica ERPNext/Frappe core.

## Qué resuelve

- crea `OS Run` + `OS Step Run` con snapshots desde el proceso publicado;
- impone transiciones válidas en servidor;
- bloquea completar pasos cuando falta evidencia, aprobación o una acción de sistema obligatoria;
- restringe Step Runs y Aprobaciones al usuario/rol asignado;
- ejecuta una lista cerrada de acciones ERPNext (`CREATE_DOCUMENT`, `CREATE_FROM_SOURCE`, `UPDATE_DOCUMENT`, `SUBMIT_DOCUMENT`, `LINK_DOCUMENT`, `OPEN_DOCUMENT`);
- registra documentos reales en `OS Document Link`;
- usa permisos nativos del DocType destino: el bridge nunca sustituye permisos de ERPNext.

## Instalación desde este monorepo

Desde la carpeta del bench, con el repositorio ya clonado en el servidor:

```bash
bench get-app /RUTA/ABSOLUTA/Soft/frappe_app/livingorg_bridge
bench --site TU-SITIO install-app livingorg_bridge
bench --site TU-SITIO migrate
bench --site TU-SITIO clear-cache
```

Después ejecuta el deployment canónico del repositorio para sincronizar los Custom DocTypes y `/os`.

## API allowlist

Endpoints públicos sólo para usuarios autenticados:

- `livingorg_bridge.status.capabilities`
- `livingorg_bridge.api.start_run`
- `livingorg_bridge.api.start_step`
- `livingorg_bridge.api.complete_step`
- `livingorg_bridge.api.execute_action`
- `livingorg_bridge.api.get_step_actions`
- `livingorg_bridge.approvals.decide`

No existe endpoint para ejecutar un dotted path enviado por el navegador.

## Mappers ERPNext soportados

- Quotation → Sales Order
- Sales Order → Delivery Note
- Sales Order → Sales Invoice
- Delivery Note → Sales Invoice
- Purchase Order → Purchase Receipt
- Purchase Order → Purchase Invoice
- Purchase Receipt → Purchase Invoice

Otros pares pueden usar `CREATE_DOCUMENT` + Field Mapping JSON, siempre sujetos a permisos y validaciones del DocType destino.
