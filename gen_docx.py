#!/usr/bin/env python3
"""Genera la solicitud formal de cambios/correcciones (DOCX) para LivingOrg OS.

Script auxiliar conservado por compatibilidad. La ruta de salida ya no depende
de un workspace local específico: usa LIVINGORG_DOCX_OUTPUT o el directorio actual.
"""
from __future__ import annotations

import datetime
import os
from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH


def add_paragraph(doc, text, *, bold=False):
    paragraph = doc.add_paragraph()
    run = paragraph.add_run(text)
    run.bold = bold
    return paragraph


def add_bullet(doc, text):
    doc.add_paragraph(text, style="List Bullet")


def add_issue(doc, priority, title, bullets):
    colors = {"P0": (192, 43, 43), "P1": (217, 106, 0), "P2": (46, 125, 50), "P3": (107, 114, 128)}
    marker = doc.add_paragraph()
    run = marker.add_run(f"[{priority}] {title}")
    run.bold = True
    run.font.color.rgb = RGBColor(*colors.get(priority, (0, 0, 0)))
    for bullet in bullets:
        add_bullet(doc, bullet)


def build_document():
    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)

    doc.add_heading("Solicitud de Correcciones de Bugs y Mejoras de Diseño", level=0)
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.add_run("LivingOrg OS — Portal ERPNext + Standalone · Grupo Altoplano").italic = True
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.add_run(f"Fecha: {datetime.date.today().strftime('%d/%m/%Y')}\n").bold = True
    meta.add_run("Repositorio: https://github.com/Grupo224/Soft")

    doc.add_heading("1. Resumen ejecutivo", level=1)
    add_paragraph(doc, "Auditoría técnica del portal LivingOrg OS sobre ERPNext/Frappe y sus generaciones standalone. La prioridad es corregir errores sin perder funcionalidad ni romper compatibilidad.")
    add_paragraph(doc, "P0 = bloquea instalación/función · P1 = rompe pantalla/flujo · P2 = degrada experiencia · P3 = limpieza/pulido.")

    doc.add_heading("2. Bugs funcionales críticos", level=1)
    add_issue(doc, "P0", "BUG-01 — Campo process colisiona con Frappe", [
        "Los DocTypes afectados deben utilizar process_ref para no colisionar con Meta.process().",
        "Impacto histórico: creación/actualización por API bloqueada en los DocTypes afectados."
    ])
    add_issue(doc, "P0", "BUG-02 — Organigrama Vivo: relaciones circulares", [
        "La jerarquía debe cortar ciclos y mantener guardas de visitados/profundidad."
    ])
    add_issue(doc, "P1", "BUG-03 — Conexión de nodos en Process Studio", [
        "Mantener drag-to-connect y modo conectar con indicación visual clara."
    ])

    doc.add_heading("3. Diseño, CSS y responsive", level=1)
    add_issue(doc, "P2", "DIS-01 — Controles sobrepuestos en tarjetas", [
        "Reservar espacio para controles y truncar textos largos con elipsis."
    ])
    add_issue(doc, "P1", "MOV-01 — Sidebar standalone en móvil", [
        "Usar patrón off-canvas con hamburguesa y scrim en pantallas pequeñas."
    ])
    add_issue(doc, "P2", "MOV-02 — Validación de breakpoints", [
        "Validar 320, 360, 375, 390, 430, 720 y desktop: topbar, tablas, canvas, modales y asistentes."
    ])

    doc.add_heading("4. UX y documentación", level=1)
    add_issue(doc, "P2", "UX-01 — Sidebar persistente", [
        "Persistir preferencia de colapso en desktop sin parpadeo y con atributos accesibles."
    ])
    add_issue(doc, "P2", "DOC-01/02 — Deployment Frappe", [
        "Usar main_section_html para Web Page HTML y respetar el orden topológico de DocTypes.",
        "Mantener un único deployment canónico y conservar wrappers legacy por compatibilidad."
    ])

    doc.add_heading("5. Estado de seguridad", level=1)
    add_paragraph(doc, "Las credenciales nunca deben almacenarse en Git. El deployment actual debe leerlas desde variables de entorno y toda credencial publicada históricamente debe rotarse.")

    doc.add_heading("6. Prioridad sugerida", level=1)
    table = doc.add_table(rows=1, cols=4)
    table.style = "Light Grid Accent 1"
    for cell, text in zip(table.rows[0].cells, ["Prioridad", "Items", "Motivo", "Esfuerzo"]):
        cell.text = text
    for row in [
        ("P0", "Seguridad, permisos", "Evita exposición/escalamiento", "Alto"),
        ("P1", "API, XSS, móvil", "Estabilidad de flujos clave", "Medio"),
        ("P2", "Responsive, docs, deployment", "Operación mantenible", "Medio"),
        ("P3", "Pulido visual", "Calidad", "Bajo"),
    ]:
        cells = table.add_row().cells
        for cell, text in zip(cells, row):
            cell.text = text

    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run("— Fin de la solicitud —").italic = True
    return doc


def main():
    output = Path(os.environ.get("LIVINGORG_DOCX_OUTPUT", "Solicitud_Cambios_LivingOrgOS.docx")).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    build_document().save(output)
    print(f"Generado: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
