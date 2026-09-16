#!/usr/bin/env python3
"""Static contract validation for Organigrama Vivo 2.x.

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


def require_fields(actual: dict[str, dict], names: tuple[str, ...], doctype: str, kind: str) -> None:
    for name in names:
        require(name in actual, f"{doctype} missing {kind} field {name}")


def main() -> int:
    required_files = [
        "portal/assets/js/pages/os-page-org-v2.js",
        "portal/assets/js/pages/os-org-profile-v2.js",
        "portal/assets/js/pages/os-page-org.js",
        "portal/assets/css/os-org-v2.css",
        "portal/assets/css/os-org-profile-v2.css",
        "portal/pages/os-web-page.html",
        "erpnext_setup/doctypes/os_role_card.json",
        "erpnext_setup/doctypes/os_kpi_definition.json",
        "erpnext_setup/doctypes/os_process.json",
        "erpnext_setup/doctypes/os_sop.json",
        "deployment/manifest.json",
        "docs/ORGANIGRAMA_V2.md",
        "docs/ORGANIGRAMA_MIGRATION_2.0.md",
        "docs/ORGANIGRAMA_TESTING_2.0.md",
    ]
    for rel in required_files:
        require((ROOT / rel).is_file(), f"missing required file: {rel}")

    manifest = load_json("deployment/manifest.json")
    require(manifest.get("product_version") == "2.0.1", "manifest product_version must be 2.0.1")
    require(manifest.get("current_stable", {}).get("organigrama") == "2.0.1", "current stable organigrama must be 2.0.1")
    require(manifest.get("current_stable", {}).get("branch") == "release/organigrama-v2.0", "current stable branch mismatch")
    require(manifest.get("current_stable", {}).get("profile_editor") == "portal/assets/js/pages/os-org-profile-v2.js", "profile editor manifest entry missing")
    require("repair/prompt-maestro-2026-09" in manifest.get("current_stable", {}).get("compatibility_branches", []), "compatibility branch alias missing")
    require(manifest.get("previous_stable", {}).get("branch") == "archive/organigrama-v1-stable", "previous stable branch mismatch")
    require(manifest.get("organigrama_v2", {}).get("preserves_legacy_schema_fields") is True, "manifest must declare legacy schema preservation")
    require("inside LivingOrg" in manifest.get("organigrama_v2", {}).get("full_profile_behavior", ""), "manifest must declare internal full profile behavior")
    require(manifest.get("safety", {}).get("migrate_existing_org_relations_automatically") is False, "automatic relation migration must stay disabled")

    page = (ROOT / "portal/pages/os-web-page.html").read_text(encoding="utf-8")
    v2_script = 'src="/files/os-page-org-v2.js'
    profile_script = 'src="/files/os-org-profile-v2.js'
    v1_script = 'src="/files/os-page-org.js'
    v2_pos = page.find(v2_script)
    profile_pos = page.find(profile_script)
    v1_pos = page.find(v1_script)
    require(v2_pos >= 0 and profile_pos >= 0 and v1_pos >= 0 and v2_pos < profile_pos < v1_pos, "script order must be org-v2 -> profile-v2 -> legacy org")
    require('href="/files/os-org-v2.css' in page, "v2 CSS is not loaded")
    require('href="/files/os-org-profile-v2.css' in page, "profile editor CSS is not loaded")

    deploy = (ROOT / "scripts/deploy.py").read_text(encoding="utf-8")
    require('"css/os-org-v2.css"' in deploy, "deploy.py does not publish v2 CSS")
    require('"css/os-org-profile-v2.css"' in deploy, "deploy.py does not publish profile CSS")
    require('"js/pages/os-page-org-v2.js"' in deploy, "deploy.py does not publish v2 JS")
    require('"js/pages/os-org-profile-v2.js"' in deploy, "deploy.py does not publish profile editor JS")

    role = fields(load_json("erpnext_setup/doctypes/os_role_card.json"))
    require_fields(
        role,
        ("role_title", "designation", "mission", "expected_results", "responsibilities", "kpis", "owner_user"),
        "OS Role Card",
        "legacy",
    )
    require_fields(
        role,
        ("org_node", "purpose", "objectives", "functions", "competencies", "tools", "process_refs", "sop_refs"),
        "OS Role Card",
        "additive",
    )

    kpi_spec = load_json("erpnext_setup/doctypes/os_kpi_definition.json")
    kpi = fields(kpi_spec)
    require_fields(
        kpi,
        ("kpi_title", "kpi_code", "entity_type", "formula", "source", "frequency", "owner_user", "threshold_warning", "threshold_critical"),
        "OS KPI Definition",
        "legacy",
    )
    require_fields(kpi, ("org_node", "role_card", "designation"), "OS KPI Definition", "additive")
    entity_options = kpi["entity_type"].get("options", "")
    for option in ("Company", "Process", "Step", "Agent", "Connector"):
        require(option in entity_options, f"OS KPI Definition lost legacy entity_type option {option}")
    require("Position" in entity_options and "RoleCard" in entity_options, "KPI entity_type missing Position/RoleCard")

    process = fields(load_json("erpnext_setup/doctypes/os_process.json"))
    require("responsible_node" in process and "org_area" in process, "OS Process must keep responsible_node/org_area for org links")

    sop = fields(load_json("erpnext_setup/doctypes/os_sop.json"))
    require_fields(
        sop,
        (
            "sop_title", "sop_code", "version_label", "status", "department", "objective", "scope", "trigger",
            "expected_result", "owner_user", "responsible_users", "roles", "approved_by", "approved_on", "process_ref",
            "tools", "file", "risk_level", "valid_from", "valid_until", "last_reviewed_on", "next_review_on",
            "estimated_time_minutes", "steps", "definition_of_done", "evidence_required", "exceptions", "controls",
            "metrics", "procedure_legacy",
        ),
        "OS SOP",
        "legacy",
    )
    require("responsible_node" in sop, "OS SOP missing additive field responsible_node")

    js = (ROOT / "portal/assets/js/pages/os-page-org-v2.js").read_text(encoding="utf-8")
    require("function getDisplayTitle" in js, "display title helper missing")
    require("function getSourceLabel" in js, "source label helper missing")
    require("function getSearchLabel" in js, "search label helper missing")
    require("return String(node.title || sourceField(node)" in js, "display title must prefer title over linked source")
    require("Company: [\"Department\"]" in js, "Company hierarchy rule missing")
    require("Department: [\"Department\", \"Designation\"]" in js, "Department hierarchy rule missing")
    require("Designation: [\"Designation\", \"Employee\", \"Agent\"]" in js, "Position hierarchy rule missing")
    require("OS.router.register(\"/org\"" in js, "v2 /org route missing")

    profile = (ROOT / "portal/assets/js/pages/os-org-profile-v2.js").read_text(encoding="utf-8")
    require('PROFILE_LINK = \'a[href^="/app/os-org-node/"]\'' in profile, "profile editor must intercept the previous full-profile link")
    require("event.preventDefault()" in profile, "profile editor must prevent navigation to the DocType")
    require("openProfile(nodeName)" in profile, "profile editor open flow missing")
    require('OS.orgProfileV2 = { version: "2.0.1"' in profile, "profile editor version must be 2.0.1")
    for label in ("Perfil del puesto", "Personas", "KPIs", "Procesos", "SOPs", "Documentos"):
        require(label in profile, f"profile editor missing section {label}")

    hooks = (ROOT / "frappe_app/livingorg_bridge/livingorg_bridge/hooks.py").read_text(encoding="utf-8")
    gov = (ROOT / "frappe_app/livingorg_bridge/livingorg_bridge/governance.py").read_text(encoding="utf-8")
    require('"OS Org Relation"' in hooks and "validate_org_relation" in hooks, "Bridge org relation hook missing")
    require("ORG_ALLOWED_PARENTS" in gov and "validate_org_relation" in gov, "Bridge semantic validator missing")
    require("La relación crearía un ciclo jerárquico" in gov, "server-side cycle validation missing")

    print("PASS org-v2.0.1: internal full profile, packaging, load order, legacy schema preservation and hierarchy guards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
