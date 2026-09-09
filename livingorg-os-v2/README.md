# LivingOrg OS v2 — funcional + tema Control Room

App **funcional** (formularios de captura reales, no demo): procesos, organigrama vivo,
SOPs, agentes, ejecución, aprobaciones, gobierno — con el **tema visual Control Room**
(del Flow Studio v3).

## Estructura
```
index.html   → Web Page HTML (referencia /files/*.js / *.css)
js/config.js → ★ lo que editas: entidades, campos, menú, marca
js/app.js    → motor: genera tablas, formularios (wizard), panel de detalle, organigrama
styles.css   → tema Control Room (sidebar navy + naranja #F26B1F + Inter)
deploy.py    → sube assets a demo + bump de versión en el Web Page
```

## Tema
Re-skin por tokens CSS en `:root` (de `livingorg-styles.css` original):
- sidebar → navy `#0C1420` con radial gradient
- marca → naranja `#F26B1F`
- canvas → gris frío `#F7F7F8`
- fuente → Inter

## Deploy (demo.altoplano.mx)
```bash
python3 deploy.py   # sube styles.css + bump ?v= en Web Page "livingorg-os-v2" (ruta /livingorg)
```
