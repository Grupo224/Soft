#!/usr/bin/env python3
"""Static contract validation for Organigrama Vivo 2.0.

This is intentionally independent from a live ERPNext site. It catches packaging,
load-order, schema and safety regressions before deployment. End-to-end checks on
a real site remain documented in docs/ORGANIGRAMA_TESTING_2.0.md.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL org-v2: {message}")


def load_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def fields(spec: dict) -> dict[str, dict]:
    return {field["fieldname"]: field for field in spec.get("fields", [])}


def main() -> int:
    required_files = [
        "portal/assets/js/pages/os-page-org-v2.js",
        "portal/assets/js/pages/os-page-org.js",
        "portal/assets/css/os-org-v2.css",
        "portal/pages/os-web-page.html",
        "erpnext_setup/doctypes/os_role_card.json",
        "erpnext_setup/doctypes/os_kpi_definition.json",
        "erpnext_setup/doctypes/os_sop.json",
        "deployment/manifest.json",
        "docs/ORGANIGRAMA_V2.md",
        "docs/ORGANIGRAMA_MIGRATION_2.0.md",
        "docs/ORGANIGRAMA_TESTING_2.0.md",
    ]
    for rel in required_files:
        require((ROOT / rel).is_file(), f"missing required file: {rel}")

    manifest = load_json("deployment/manifest.json")
    require(manifest.get("product_version") == "2.0.0", "manifest product_version must be 2.0.0")
    require(manifest.get("current_stable", {}).get("branch") == "release/organigrama-v2.0", "current stable branch mismatch")
    require(manifest.get("previous_stable", {}).get("branch") == "archive/organigrama-v1-stable", "previous stable branch mismatch")
    require(manifest.get("safety", {}).get("migrate_existing_org_relations_automatically") is False, "automatic relation migration must stay disabled")

    page = (ROOT / "portal/pages/os-web-page.html").read_text(encoding="utf-8")
    v2_pos = page.find("os-page-org-v2.js")
    v1_pos = page.find("os-page-org.js")
    require(v2_pos >= 0 and v1_pos >= 0 and v2_pos < v1_pos, "v2 route must load before legacy /org route")
    require("os-org-v2.css" in page, "v2 CSS is not loaded")

    deploy = (ROOT / "scripts/deploy.py").read_text(encoding="utf-8")
    require('"css/os-org-v2.css"' in deploy, "deploy.py does not publish v2 CSS")
    require('"js/pages/os-page-org-v2.js"' in deploy, "deploy.py does not publish v2 JS")

    role = fields(load_json("erpnext_setup/doctypes/os_role_card.json"))
    for name in ("org_node", "purpose", "objectives", "functions", "competencies", "tools", "process_refs", "sop_refs"):
        require(name in role, f"OS Role Card missing additive field {name}")

    kpi_spec = load_json("erpnext_setup/doctypes/os_kpi_definition.json")
    kpi = fields(kpi_spec)
    for name in ("org_node", "role_card", "designation"):
        require(name in kpi, f"OS KPI Definition missing field {name}")
    entity_options = kpi["entity_type"].get("options", "")
    require("Position" in entity_options and "RoleCard" in entity_options, "KPI entity_type missing Position/RoleCard")

    sop = fields(load_json("erpnext_setup/doctypes/os_sop.json"))
    require("responsible_node" in sop, "OS SOP missing responsible_node")

    js = (ROOT / "portal/assets/js/pages/os-page-org-v2.js").read_text(encoding="utf-8")
    require("function getDisplayTitle" in js, "display title helper missing")
    require("function getSourceLabel" in js, "source label helper missing")
    require("return String(node.title || sourceField(node)" in js, "display title must prefer title over linked source")
    require("Company: [\"Department\"]" in js, "Company hierarchy rule missing")
    require("Department: [\"Department\", \"Designation\"]" in js, "Department hierarchy rule missing")
    require("Designation: [\"Designation\", \"Employee\", \"Agent\"]" in js, "Position hierarchy rule missing")
    require("OS.router.register(\"/org\"" in js, "v2 /org route missing")

    hooks = (ROOT / "frappe_app/livingorg_bridge/livingorg_bridge/hooks.py").read_text(encoding="utf-8")
    gov = (ROOT / "frappe_app/livingorg_bridge/livingorg_bridge/governance.py").read_text(encoding="utf-8")
    require('"OS Org Relation"' in hooks and "validate_org_relation" in hooks, "Bridge org relation hook missing")
    require("ORG_ALLOWED_PARENTS" in gov and "validate_org_relation" in gov, "Bridge semantic validator missing")
    require("La relación crearía un ciclo jerárquico" in gov, "server-side cycle validation missing")

    print("PASS org-v2: packaging, load order, additive schema, display-name contract and hierarchy guards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
