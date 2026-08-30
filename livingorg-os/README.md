# LIVINGORG OS — Grupo Altoplano

App sin build (HTML + CSS + JS vanilla). Los datos se guardan en el
navegador (`localStorage`); no depende de ningún backend.

```
index.html    → punto de entrada
styles.css    → sistema de diseño (todos los tokens de color en :root)
js/config.js  → ★ lo que editas: objetos, campos, menú, marca
js/app.js     → el motor: genera formularios, tablas, panel de detalle,
                el asistente de Procesos, el organigrama, etc.
kit.html      → pack de UX/UI reutilizable (tokens, botones, badges…)
```

## Correr en local

No requiere instalación. Dos formas:

1. **Doble clic en `index.html`** — funciona directo en cualquier navegador
   moderno.
2. **Servidor local** (recomendado si vas a probar en varios dispositivos o
   quieres evitar restricciones de `file://` en algunos navegadores):
   ```bash
   cd livingorg-os
   python3 -m http.server 8080
   # abre http://localhost:8080
   ```

Las tipografías (Montserrat/Inter/IBM Plex Mono) se cargan de Google Fonts;
sin conexión el sistema usa las fuentes locales del sistema operativo — no
es un error, es el respaldo documentado.

## Desplegar desde GitHub (GitHub Pages)

Esta carpeta usa solo rutas relativas, por lo que funciona igual en
`file://`, un servidor propio o GitHub Pages.

1. Trabaja en una rama, nunca directo en `main`:
   ```bash
   git checkout -b feature/mi-cambio
   # ... cambios ...
   git add livingorg-os
   git commit -m "Descripción del cambio"
   git push -u origin feature/mi-cambio
   ```
2. Abre un Pull Request hacia `main`. `main` queda protegida: los cambios
   entran por PR revisado, no por push directo.
3. Al fusionar, en **Settings → Pages** del repositorio configura:
   - Source: `Deploy from a branch`
   - Branch: `main` — carpeta `/livingorg-os` (o la raíz, si este proyecto
     vive en un repo propio).
4. **Cache-busting**: `index.html` carga `styles.css`/`app.js`/`config.js`
   con `?v=AAAAMMDD`. Sube ese número (la fecha de hoy) cada vez que
   publiques un cambio en esos tres archivos — así el navegador de quien
   ya visitó el sitio no sigue sirviendo la versión vieja desde caché.
5. **Versión etiquetada por release**:
   ```bash
   git tag -a v1.1.0 -m "Rediseño del módulo de Procesos"
   git push origin v1.1.0
   ```

No hay secretos ni credenciales en este proyecto (todo vive en el
navegador de cada usuario) — no hay nada que excluir del repo aparte de lo
que ya cubre el `.gitignore` de la raíz.

## Checklist de QA antes de publicar

Repite esto en un navegador limpio (o pestaña privada) antes de cada
despliegue:

- [ ] `index.html` abre sin errores en la consola (F12 → Console).
- [ ] Recorre cada módulo del menú lateral al menos una vez (Centro de
      Mando, Organigrama, Procesos, SOPs, Ejecución, Mi Trabajo,
      Aprobaciones, Agentes, Prompts, Conocimiento, Conexiones, Analítica,
      Gobierno) — cada uno debe renderizar contenido sin quedar en blanco.
- [ ] Crear un registro nuevo en al menos 2 módulos (guardar y verificar
      que aparece en la lista/tarjetas de inmediato).
- [ ] Editar el **nombre** de un registro ya creado y confirmar que se
      actualiza en la tarjeta, la tabla, las migas y el panel de detalle.
- [ ] Vaciar el buscador de un listado con 0 resultados → debe mostrarse el
      estado vacío ("Sin resultados…"), no una tabla en blanco.
- [ ] **Procesos**: crear uno en Modo Rápido y otro en Modo Completo
      (recorrer los 6 pasos); intentar publicar un proceso incompleto como
      "Activo" → debe bloquear y listar exactamente qué falta.
- [ ] Contraer y expandir la barra lateral con el botón; recargar la
      página → debe recordar el estado.
- [ ] Probar en un viewport de ~390px de ancho (herramientas de desarrollo
      → modo dispositivo): ningún botón ni columna debe quedar cortado
      fuera de la pantalla sin poder desplazarse a él.
- [ ] Confirmar que todo el texto visible está en español.

## Estado de esta entrega

**Hecho en esta iteración** (ver también el resumen de la conversación):
correcciones de accesibilidad y estado persistente de la barra lateral,
migas que reflejan el registro abierto, y el rediseño completo del módulo
de Procesos (asistente por pasos, SIPOC, RACI, metas por cadencia,
checklist de publicación, duplicar proceso).

**Pendiente, documentado a propósito (no se descartó en silencio):**
- **Rediseño visual con el pack de marca.** Se acordó esperar el pack de
  diseño (tokens/capturas de referencia) antes de retocar colores o
  tipografía — no se inventó un estilo nuevo. Cuando llegue, se aplica
  centralizado en `:root` de `styles.css`.
- **Asistente de IA que propone pasos/KPIs/metas** y **plantillas por
  vertical** (gasolinera, inmobiliaria, restaurante, POS): el propio
  documento de rediseño los ubica en una fase posterior (semana 7–8) del
  plan de implementación, no en el MVP del formulario.
- **Medición del tiempo real de captura por paso** del asistente (el
  documento lo sugiere como métrica de mejora continua): requiere
  instrumentación adicional, queda para una iteración de analítica.
