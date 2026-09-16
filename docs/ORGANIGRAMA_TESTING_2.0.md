# Testing — Organigrama Vivo 2.0

No marcar una release como producción únicamente porque compila. Este documento separa pruebas automatizadas de contrato y pruebas E2E que requieren un sitio Frappe real.

## 1. Automatizadas en CI

GitHub Actions ejecuta:

```bash
python scripts/validate_repo.py
python scripts/validate_org_v2.py
python -m compileall -q scripts frappe_app *.py
node --check <todos los JS>
```

`validate_org_v2.py` comprueba:

- versión/branch declarados en manifest;
- coexistencia v2 + legacy;
- orden de carga v2 antes de 1.x;
- publicación de assets por `scripts/deploy.py`;
- campos aditivos de Role Card/KPI/SOP;
- contrato `title` como display name;
- helpers `getDisplayTitle`, `getSourceLabel`, `getSearchLabel`;
- matriz semántica de jerarquía;
- hook y validador server-side de Bridge.

## 2. E2E obligatorio en staging

Registrar cada caso como `PASS`, `FAIL` o `NO PROBADO`. No usar PASS sin observar el resultado.

### A. Nombre visual — P0

1. Abrir `/os#/org`.
2. Abrir un Puesto con Designation vinculada.
3. Cambiar `Nombre visible` a un valor distinto del nombre de Designation.
4. Guardar.
5. Confirmar que la card cambia inmediatamente.
6. Recargar navegador.
7. Confirmar que conserva exactamente el nuevo `title`.
8. Confirmar que el sidebar sigue mostrando por separado `Entidad vinculada · Designation`.

### B. Departamento

- crear primer Departamento desde Empresa;
- crear Subdepartamento desde Departamento;
- crear Puesto desde Departamento;
- editar nombre visual;
- comprobar persistencia tras refresh.

### C. Puesto

- crear Puesto sin Persona;
- comprobar estado `Vacante`;
- asignar Employee existente;
- asignar segundo Employee si el negocio lo requiere;
- quitar una asignación;
- confirmar que el Puesto sigue existiendo;
- confirmar que la Role Card sigue existiendo.

### D. Role Card

Editar y persistir:

- Propósito
- Misión
- Objetivos
- Resultados esperados
- Responsabilidades
- Funciones
- Competencias
- Herramientas

Recargar y verificar persistencia.

### E. KPI

- crear KPI desde pestaña KPI;
- verificar `entity_type=Position`;
- verificar `org_node` correcto;
- recargar;
- confirmar conteo de KPI en card.

### F. Proceso

- vincular un `OS Process` existente al Puesto;
- verificar `responsible_node`;
- abrir `Process Studio` desde la pestaña;
- confirmar que Organigrama y Process Studio siguen siendo módulos independientes.

### G. SOP

- vincular un `OS SOP` existente;
- verificar `responsible_node`;
- abrir ficha SOP;
- recargar Organigrama y comprobar vínculo.

### H. Documentos

- guardar Role Card;
- subir PDF/DOCX de prueba;
- verificar File adjunto a `OS Role Card`;
- cambiar/desasignar Persona;
- comprobar que el archivo permanece en el Puesto.

### I. Jerarquía

Comprobar acciones permitidas:

```text
Company -> Department
Department -> Department
Department -> Designation
Designation -> Designation
Designation -> Employee
Designation -> Agent
```

Comprobar bloqueos:

```text
Employee -> Department
Employee -> Designation
Department -> Employee
Company -> Employee
```

Arrastrar un nodo a un descendiente debe impedir ciclo.

Con Bridge instalado, repetir una relación inválida por REST/API y comprobar que servidor la rechaza.

### J. Relaciones históricas

Crear/cargar un dataset con una relación histórica que no cumpla la matriz 2.0.

Esperado:

- el upgrade no la elimina;
- aparece advertencia;
- no se crea una migración silenciosa.

### K. Visual / regresión

- zoom + / -;
- pan;
- Ajustar/Fit;
- vertical/horizontal;
- expandir/contraer;
- búsqueda por `title`;
- búsqueda por valor del vínculo ERPNext;
- filtro por tipo;
- clic en card;
- inspector Guardar/Cancelar;
- Process Studio sin regresiones;
- SOP sin regresiones.

## 3. Viewports obligatorios

Probar al menos:

```text
Desktop: 1920, 1440, 1280
Tablet: 1024, 820
Mobile: 430, 390, 360
```

Revisar:

- overflow horizontal accidental;
- toolbar;
- tabs del sidebar;
- botones táctiles;
- modales;
- zoom/pan;
- cards;
- inputs;
- lista de personas/KPIs/procesos/SOPs/documentos.

## 4. Performance

Con dataset representativo (recomendado 100+ nodos):

- un cambio de búsqueda no debe disparar requests por nodo;
- el render principal carga nodos, relaciones, Role Cards, KPIs, procesos y SOPs en requests agregados;
- documentos se cargan bajo demanda al abrir la pestaña;
- no deben aparecer listeners duplicados tras navegar ida/vuelta varias veces.

## 5. Criterio de promoción

### READY FOR STAGING

CI verde + revisión de código completa.

### READY FOR PRODUCTION

Además de CI verde:

- P0 Nombre visual PASS;
- Departamento/Puesto/Persona PASS;
- Role Card PASS;
- jerarquía/ciclos PASS;
- smoke desktop/tablet/mobile PASS;
- backup disponible;
- rollback revisado.

Si no se ejecutaron los E2E en un sitio real, el estado máximo permitido es `READY FOR STAGING`.
