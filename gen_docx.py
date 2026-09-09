#!/usr/bin/env python3
"""Genera la solicitud formal de cambios/correcciones (DOCX) para LivingOrg OS."""
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import datetime

doc = Document()

# Estilos base
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(10.5)

def h(text, level=1):
    p = doc.add_heading(text, level=level)
    return p

def p(text, bold=False, size=None, color=None):
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.bold = bold
    if size: run.font.size = Pt(size)
    if color: run.font.color.rgb = RGBColor(*color)
    return para

def bullet(text, bold_prefix=None):
    para = doc.add_paragraph(style="List Bullet")
    if bold_prefix:
        r = para.add_run(bold_prefix)
        r.bold = True
        para.add_run(text)
    else:
        para.add_run(text)
    return para

def severity(tag):
    colors = {"P0": (0xC0, 0x2B, 0x2B), "P1": (0xD9, 0x6A, 0x00), "P2": (0x2E, 0x7D, 0x32), "P3": (0x6B, 0x72, 0x80)}
    p = doc.add_paragraph()
    r = p.add_run(f"[{tag}] ")
    r.bold = True
    r.font.color.rgb = RGBColor(*colors.get(tag, (0,0,0)))
    return p

# ===== Portada =====
title = doc.add_heading("Solicitud de Correcciones de Bugs y Mejoras de Diseño", level=0)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("LivingOrg OS — Portal ERPNext + Standalone · Grupo Altoplano")
r.italic = True
r.font.size = Pt(12)

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run(f"Fecha: {datetime.date.today().strftime('%d/%m/%Y')}\n").bold = True
meta.add_run("Repositorio: https://github.com/Grupo224/Soft\n")
meta.add_run("Entornos revisados: demo.altoplano.mx/os (portal ERPNext) · demo.altoplano.mx/livingorg (standalone)")

doc.add_paragraph()

# ===== Resumen ejecutivo =====
h("1. Resumen ejecutivo", level=1)
p("Tras desplegar y auditar el repositorio en la instancia demo, se identificaron bugs funcionales, "
  "problemas de diseño/CSS, fallas de responsivo en móvil y mejoras de usabilidad. Varios ya fueron "
  "corregidos directamente en la demo; el resto requieren intervención sobre el código fuente del repositorio.")
p("Nomenclatura de severidad: P0 = bloquea instalación/función · P1 = rompe una pantalla o flujo · "
  "P2 = degrada la experiencia · P3 = cosmético/limpieza.")

doc.add_paragraph()

# ===== 2. Bugs críticos =====
h("2. Bugs funcionales críticos", level=1)

severity("P0")
p("BUG-01 — Campo «process» colisiona con el motor de Frappe", bold=True)
bullet("Los Doctypes OS SOP, OS Run, OS Knowledge Source y OS Approval declaran un campo con fieldname «process». Frappe reserva process() como método interno de Meta, por lo que al crear/actualizar el Doctype vía API lanza «TypeError: 'NoneType' object is not callable».")
bullet("Impacto: imposible instalar esos 4 Doctypes por API (solo funciona por UI, que es más permisiva).")
bullet("Corrección propuesta: renombrar a «process_ref» en los 4 JSON y actualizar las referencias en el JS.")

severity("P0")
p("BUG-02 — Organigrama Vivo: recursión infinita con relaciones circulares", bold=True)
bullet("buildHierarchy() no rompe ciclos y treeLayout()/subtreeIds() recurren sin límite. Con dos nodos reportándose entre sí (A ⇄ B), el navegador revienta con «Maximum call stack size exceeded».")
bullet("Corrección propuesta: detectar y saltar relaciones que cerrarían un ciclo + guardas de visitado/depth en place() y subtreeIds().")

severity("P1")
p("BUG-03 — No se pueden conectar nodos en Process Studio", bold=True)
bullet("El flujo actual exige: botón «Conectar» → clic en origen → clic en destino. No hay conexión por arrastre y el usuario reporta que «no puede unir los nodos»; los pasos quedan sueltos en el lienzo.")
bullet("Corrección propuesta: implementar arrastrar-desde-el-puerto-para-conectar (drag-to-connect) y/o hacer explícito el estado «modo conectar» con indicaciones visuales.")

doc.add_paragraph()

# ===== 3. Diseño / CSS =====
h("3. Bugs de diseño y CSS", level=1)

severity("P2")
p("DIS-01 — Botones sobrepuestos en las tarjetas del Organigrama", bold=True)
bullet("En renderOrgCard() (tarjeta de 208×72 px), el punto de estado (esquina sup. derecha) y el chevron de expandir (esquina inf. derecha) se dibujan encima del texto cuando el título (26 caracteres) o el subtítulo (30 caracteres) son largos. No hay reserva de espacio ni elipsis.")
bullet("Corrección propuesta: recortar el texto con ellipsis y reservar espacio (padding derecho) para los controles, o mover el chevron fuera de la zona de texto.")

severity("P3")
p("DIS-02 — badgeExec con clave duplicada", bold=True)
bullet("En os-core.js, el mapa de badges de ejecución declara «AI→H» dos veces. Inofensivo, pero es ruido a limpiar.")

doc.add_paragraph()

# ===== 4. Responsive / móvil =====
h("4. Responsive / móvil", level=1)

severity("P1")
p("MOV-01 — Standalone: la barra lateral no se oculta en móvil", bold=True)
bullet("En livingorg-os/styles.css no existe ninguna media query que oculte la sidebar en pantallas ≤720px; solo se colapsa a 76px (.app.collapsed). En un móvil de ~390px, la sidebar de 264px deja el contenido comprimido y «todo se ve roto».")
bullet("Corrección propuesta: agregar en @media(max-width:720px) el patrón off-canvas (transform:translateX(-100%) + botón hamburguesa + scrim), igual que el portal ERPNext.")

severity("P2")
p("MOV-02 — Portal ERPNext: revisar regresiones de responsivo tras el reskin", bold=True)
bullet("El usuario reporta que en móvil la barra lateral «ni se oculta» y varios elementos se ven rotos. El portal tiene el patrón off-canvas, pero el reskin reciente (tipografías, anchos, hero del Centro de Mando) requiere validación a 390px y 720px.")
bullet("Corrección propuesta: auditoría de breakpoints (390/720/1080px) sobre topbar, hero, tablas, toolbar del canvas y modal/assistant.")

doc.add_paragraph()

# ===== 5. UX =====
h("5. Usabilidad (UX)", level=1)

severity("P2")
p("UX-01 — Colapso de barra lateral con persistencia de estado", bold=True)
bullet("El portal ERPNext solo tiene colapso en móvil; el colapso en escritorio (añadido en la demo) aún no recuerda el estado entre recargas. El standalone sí persiste en localStorage.")
bullet("Corrección propuesta: persistir el estado colapsado en localStorage (antes del primer pintado, sin parpadeo) + aria-expanded/aria-label.")

severity("P3")
p("UX-02 — Selector de tema claro/oscuro", bold=True)
bullet("El standalone ofrece tema claro y oscuro; el portal ERPNext adoptó solo la paleta clara. Pendiente documentado: unificar el selector de tema.")

doc.add_paragraph()

# ===== 6. Documentación =====
h("6. Documentación", level=1)

severity("P2")
p("DOC-01 — README: campo de contenido HTML del Web Page", bold=True)
bullet("README_INSTALACION.md (paso 5) indica «Content Type: HTML» y pegar el contenido en «el campo HTML», sin aclarar que en Frappe v15 el contenido debe ir en main_section_html (no en main_section). Si se sigue literal, la página sale vacía.")

severity("P2")
p("DOC-02 — Orden de creación de Doctypes no seguro por API", bold=True)
bullet("El README lista «OS SOP Step» en la posición 3, pero ese child table apunta a OS Prompt/OS Agent (creados después). Por API falla la validación de Link; solo funciona por UI. Debe documentarse el orden topológico correcto.")

doc.add_paragraph()

# ===== 7. Priorización =====
h("7. Priorización sugerida", level=1)
table = doc.add_table(rows=1, cols=4)
table.style = "Light Grid Accent 1"
hdr = table.rows[0].cells
for i, t in enumerate(["Prioridad", "Items", "Motivo", "Esfuerzo estimado"]):
    hdr[i].text = t

rows = [
    ("P0", "BUG-01, BUG-02", "Bloquean instalación y una pantalla entera", "Bajo"),
    ("P1", "BUG-03, MOV-01", "Impiden flujos clave y el uso en móvil", "Medio"),
    ("P2", "DIS-01, MOV-02, DOC-01, DOC-02, UX-01", "Degradan calidad y experiencia", "Medio"),
    ("P3", "DIS-02, UX-02", "Limpieza y pulido", "Bajo"),
]
for row in rows:
    cells = table.add_row().cells
    for i, t in enumerate(row):
        cells[i].text = t

doc.add_paragraph()

# ===== 8. Estado en demo =====
h("8. Estado actual en la instancia demo", level=1)
p("Correcciones ya aplicadas directamente en demo.altoplano.mx (para no bloquear la operación):")
bullet("BUG-01 (process → process_ref) — corregido en los 4 Doctypes y el JS.")
bullet("BUG-02 (ciclo en Organigrama) — corregido con ruptura de ciclos + guardas.")
bullet("DOC-01 (main_section_html) — aplicado en el despliegue del Web Page.")
bullet("DOC-02 (orden topológico) — aplicado en el script de despliegue.")
bullet("Colapso de sidebar en escritorio (parcial de UX-01) — aplicado, sin persistencia aún.")
p("Pendientes de intervención en el repositorio: BUG-03, DIS-01, DIS-02, MOV-01, MOV-02, UX-01 (persistencia) y UX-02.", bold=True)

doc.add_paragraph()
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
fr = footer.add_run("— Fin de la solicitud —")
fr.italic = True
fr.font.size = Pt(9)

out = "/home/ubuntu/.openclaw/workspace/Solicitud_Cambios_LivingOrgOS.docx"
doc.save(out)
print("Generado:", out)
