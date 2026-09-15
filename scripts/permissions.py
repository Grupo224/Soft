"""Permisos canónicos de LivingOrg OS.

Este archivo es la fuente ejecutable de verdad para los roles OS. El despliegue
normaliza cada DocType antes de enviarlo a Frappe para impedir que un JSON legacy
reintroduzca permisos de escritura a Viewer/Auditor.
"""
from __future__ import annotations

from typing import Any


# R=read, W=write, C=create, D=delete. Los child tables se mantienen por
# consistencia aunque Frappe derive el acceso efectivo del documento padre.
MATRIX: dict[str, dict[str, str]] = {
    "OS Org Node": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Org Relation": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Role Card": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Process": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Process Step": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Process Edge": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Process Goal": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS SOP": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS SOP Step": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"RW","OS AI Supervisor":"R","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Prompt": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"RWCD","OS Manager":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Agent": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"RWCD","OS Manager":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Run": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Step Run": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"RW","OS Auditor":"R","OS Viewer":"R"},
    "OS Evidence": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"RWC","OS Auditor":"R","OS Viewer":"R"},
    "OS Approval": {"OS Admin":"RWCD","OS Architect":"R","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"RW","OS Auditor":"R","OS Viewer":"R"},
    "OS KPI Definition": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"R","OS Manager":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Integration": {"OS Admin":"RWCD","OS AI Supervisor":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Knowledge Source": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"RWC","OS Manager":"R","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Skill": {"OS Admin":"RWCD","OS Architect":"RWC","OS Publisher":"R","OS AI Supervisor":"RWC","OS Manager":"R","OS Auditor":"R","OS Viewer":"R"},
    "OS Policy": {"OS Admin":"RWCD","OS AI Supervisor":"R","OS Manager":"RW","OS Operator":"R","OS Auditor":"R","OS Viewer":"R"},
}

SYSTEM_MANAGER = {
    "role": "System Manager", "read": 1, "write": 1, "create": 1,
    "delete": 1, "report": 1, "export": 1,
}


def permission_row(role: str, code: str) -> dict[str, Any]:
    return {
        "role": role,
        "read": 1 if "R" in code else 0,
        "write": 1 if "W" in code else 0,
        "create": 1 if "C" in code else 0,
        "delete": 1 if "D" in code else 0,
        "report": 1 if "R" in code else 0,
        "export": 1 if role in {"OS Admin", "OS Auditor"} else 0,
    }


def canonical_permissions(doctype: str) -> list[dict[str, Any]]:
    rows = [permission_row(role, code) for role, code in MATRIX.get(doctype, {}).items()]
    rows.append(dict(SYSTEM_MANAGER))
    return rows


def apply_canonical_permissions(spec: dict[str, Any]) -> dict[str, Any]:
    """Devuelve el spec con permisos normalizados cuando el DocType está gobernado."""
    name = spec.get("name")
    if name in MATRIX:
        spec["permissions"] = canonical_permissions(str(name))
    return spec
