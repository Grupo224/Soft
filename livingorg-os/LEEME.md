# LIVINGORG OS — base del portal · Edición Grupo Altoplano

> **Rediseño visual (esta versión):** identidad Grupo Altoplano con **dos temas**
> conmutables desde la barra superior (icono luna/paleta):
> **Claro/"white"** (por defecto): sidebar blanco, superficie clara, selección en
> *pill* naranja suave, contadores a la derecha — inspirado en tus referencias.
> **Oscuro:** sidebar navy (la versión anterior). El tema se guarda por navegador.
>
> Incluye **`kit.html`** = *pack de UX/UI* reutilizable (tokens de color,
> tipografía, botones, badges, inputs, nav, tarjetas y tabla) para aplicar este
> diseño a tu software existente sin partir de cero.
>
> Para cambiar la marca en todo el sistema, edita las variables en `:root`
> (y el bloque `[data-theme="dark"]`) de `styles.css`. **No se modificó tu
> información:** mismos módulos, campos y datos semilla; `js/config.js` intacto.



> **Rediseño visual (esta versión):** interfaz con la identidad de Grupo
> Altoplano — logo de montaña, naranja de marca (#F5820A) + navy (#0C1420),
> superficie cálida tipo papel y **curvas de nivel** como firma. Tipografías
> Montserrat (títulos) + Inter (texto) + IBM Plex Mono (datos). Se añadieron
> el **Centro de Mando** con hero, KPIs con medidor real, **Mapa de ejecución**
> (Humano/IA/Sistema), Health Score, y una topbar con crear rápido, buscador
> ⌘K, notificaciones y selector de workspace. **No se modificó tu información:**
> mismos módulos, campos y datos semilla; `js/config.js` queda intacto.


Prototipo funcional del *sistema operativo vivo* descrito en tu blueprint:
organigrama + procesos + SOPs + ejecución + conocimiento, con el lenguaje
central **Humano / IA / Sistema** y enfoque *evidence-first*. Todo en español.

Está pensado como **base para partir**: código limpio, sin build, sin
dependencias, y una arquitectura donde agregar campos o módulos es editar
**un solo archivo de configuración**.

---

## Cómo abrirlo
Haz doble clic en **`index.html`** (funciona en cualquier navegador moderno,
sin instalar nada). Los datos se guardan en el navegador (localStorage), así
que lo que crees persiste entre sesiones en esa misma máquina.

> Las tipografías se cargan de internet; sin conexión usa fuentes del sistema.

---

## Estructura
```
index.html        → punto de entrada (carga estilos + config + motor)
styles.css        → sistema de diseño completo (todos los colores en :root)
js/config.js      → ★ LO QUE EDITAS: objetos, campos, menú, marca, datos demo
js/app.js         → el "motor": genera formularios, tablas, panel de detalle,
                    carga de documentos, organigrama, buscador, etc.
```

## Lo que ya funciona
- **Centro de Mando** con pulso, health score y acciones rápidas.
- **Organigrama Vivo**: nodos arrastrables, relaciones semánticas, zoom, inspector.
- **Procesos**, con captura 100% por formulario mediante un asistente por
  pasos — nunca un desplegable decide qué se está editando. Modo Rápido (7
  campos, <2 min) o Modo Completo (6 pasos: identidad, SIPOC, pasos con
  quién ejecuta/rol/herramienta/tiempo/punto de control, RACI, metas por
  cadencia diaria/semanal/quincenal/mensual con cascada sugerida desde la
  mensual, y mejora continua). Publicar como "Activo" valida un checklist
  de calidad y bloquea con la lista exacta de lo que falta. Incluye
  "Duplicar y ajustar".
- **Módulos** (SOPs, Agentes, Prompts, Conocimiento, Ejecución, Mi Trabajo,
  Aprobaciones, Conexiones, Gobierno) con crear / editar / borrar,
  búsqueda, vista tabla o tarjetas y panel de detalle ("contrato operativo").
- **SOP Builder** con campos amplios + **carga de documentos** (.docx, .pdf,
  imágenes…) para alimentar la base de cada objeto.
- **Analítica** calculada desde tus datos (ejecución por Humano/IA/Sistema).
- **Buscador global** (⌘K / Ctrl+K).
- **Barra lateral contraíble** (ícono + tooltip en modo colapsado) que
  recuerda su estado entre sesiones; navegación operable por teclado.
- Editar el nombre de cualquier registro lo actualiza en tarjetas, listas,
  migas y detalle — sin recargar.

Ver `README.md` para cómo correr esta app en local, desplegarla desde
GitHub (Pages) y el checklist de QA antes de publicar.

---

## Cómo editarlo (sin tocar el motor)

**Cambiar la marca / colores** → `js/config.js` (`LO.BRAND`) y `styles.css` (`:root`).

**Agregar un campo a un formulario** → en `js/config.js`, dentro del objeto,
agrega una línea a `fields`. Ejemplo, un campo de texto amplio nuevo en SOP:
```js
{ key: "notas", label: "Notas internas", type: "textarea", help: "Opcional" },
```
Aparece solo en el formulario, la tabla, el detalle y el buscador.

**Tipos de campo disponibles**: `text`, `textarea`, `longtext` (muy amplio),
`number`, `date`, `select`, `tags`, `actor` (Humano/IA/Sistema), `status`,
`autonomy`, `risk`, `link` (a otro objeto), `steps`, y **`files`** (documentos).

**Agregar un módulo nuevo** → copia un bloque de `LO.ENTITIES`, cámbiale los
campos, y añade una entrada en `LO.NAV`. Listo: menú, lista y formularios se
generan solos.

---

## De prototipo a producción
Este prototipo guarda todo en el navegador. Cuando lo lleves a producción, el
blueprint recomienda: frontend Next.js/React + TypeScript, React Flow para el
canvas, TipTap para SOPs, backend tipado (NestJS o FastAPI), PostgreSQL (+ JSONB
y pgvector), archivos en almacenamiento tipo S3, secretos en un vault, y un
motor de runs durable. La capa de datos de este demo (`Store` en `app.js`) está
aislada a propósito: se reemplaza por llamadas a tu API sin reescribir pantallas.

Orden de construcción sugerido (del blueprint): **primero** organigrama +
procesos + SOP + tareas humanas + versiones + evidencia; **después** prompts +
agentes + IA supervisada + conectores; **luego** autonomía acotada + knowledge
brain + analítica avanzada.
