#!/usr/bin/env python3
"""Despliegue canónico, idempotente y no destructivo de LivingOrg OS.

Sincroniza Custom DocTypes + portal Website por REST. El runtime operativo puede
ser `livingorg_bridge` o un runtime API compatible; `--require-bridge` conserva
la verificación estricta del modo Bench/Custom App.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError
from scripts.permissions import apply_canonical_permissions
from scripts.schema_overlays import apply_schema_overlays

ROLES = [
    "OS Admin", "OS Architect", "OS Publisher", "OS AI Supervisor",
    "OS Manager", "OS Operator", "OS Auditor", "OS Viewer",
]

DT_PLAN = [
    ("os_prompt", None), ("os_agent", None),
    ("os_process_step", None), ("os_process_action", None), ("os_process_edge", None),
    ("os_sop_step", None), ("os_org_node", None), ("os_org_relation", None),
    ("os_role_card", None), ("os_kpi_definition", None), ("os_integration", None),
    ("os_skill", None), ("os_policy", None), ("os_process_goal", None),
    ("os_process", ["sop"]), ("os_knowledge_source", None), ("os_sop", None),
    ("os_process", None), ("os_run", None), ("os_step_run", None),
    ("os_document_link", None), ("os_evidence", None), ("os_approval", None),
]

PORTAL_ASSETS = [
    "css/os-portal.css", "css/os-hardening.css", "css/os-operational.css", "css/os-org-v2.css",
    "js/os-api.js", "js/os-runtime.js", "js/os-app.js", "js/os-canvas.js", "js/os-core.js",
    "js/os-hardening.js", "js/os-operational.js", "js/os-operational-workfix.js",
    "js/pages/os-page-agents.js", "js/pages/os-page-analytics.js", "js/pages/os-page-home.js",
    "js/pages/os-page-knowledge.js", "js/pages/os-page-org-v2.js", "js/pages/os-page-org.js", "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js", "js/pages/os-page-sop.js", "js/pages/os-page-work.js",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("install", "update", "standalone"), default="update")
    parser.add_argument("--dry-run", action="store_true", help="Valida archivos/configuración sin escribir en Frappe.")
    parser.add_argument("--require-bridge", action="store_true", help="Falla si el sitio no expone livingorg_bridge.status.capabilities.")
    return parser.parse_args()


def load_spec(dt_dir: Path, filename: str, remove_fields: list[str] | None) -> dict:
    path = dt_dir / f"{filename}.json"
    with path.open(encoding="utf-8") as handle:
        spec = json.load(handle)
    if remove_fields:
        spec["fields"] = [f for f in spec.get("fields", []) if f.get("fieldname") not in remove_fields]
    spec = {k: v for k, v in spec.items() if k != "doctype"}
    spec = apply_schema_overlays(spec)
    return apply_canonical_permissions(spec)


def ensure_module_and_roles(client: FrappeClient, dry_run: bool) -> None:
    if dry_run:
        return
    if not client.exists("Module Def", "OS Business Layer"):
        client.create("Module Def", {"module_name": "OS Business Layer", "app_name": "frappe", "custom": 1})
    for role in ROLES:
        if not client.exists("Role", role):
            client.create("Role", {"role_name": role, "desk_access": 0})


def sync_doctypes(client: FrappeClient, root: Path, dry_run: bool) -> None:
    dt_dir = root / "erpnext_setup" / "doctypes"
    for filename, remove_fields in DT_PLAN:
        spec = load_spec(dt_dir, filename, remove_fields)
        name = spec["name"]
        print(f"[doctype] {name}")
        if dry_run:
            continue
        if remove_fields is not None and client.exists("DocType", name):
            continue
        if client.exists("DocType", name):
            client.update("DocType", name, spec)
        else:
            client.create("DocType", spec)


def replace_public_file(client: FrappeClient, local_path: Path, remote_name: str, dry_run: bool) -> None:
    print(f"[asset] {remote_name}")
    if dry_run:
        return
    for doc in client.list("File", fields=["name"], filters=[["file_name", "=", remote_name]], limit=200):
        client.delete("File", doc["name"], allow_missing=True)
    client.upload_file(local_path, remote_name, is_private=False)


def sync_portal(client: FrappeClient, root: Path, dry_run: bool) -> None:
    asset_root = root / "portal" / "assets"
    for rel in PORTAL_ASSETS:
        path = asset_root / rel
        if not path.is_file():
            raise FileNotFoundError(path)
        replace_public_file(client, path, path.name, dry_run)
    page_path = root / "portal" / "pages" / "os-web-page.html"
    html = page_path.read_text(encoding="utf-8")
    print("[webpage] /os")
    if dry_run:
        return
    payload = {"title": "LivingOrg OS", "route": "os", "published": 1, "content_type": "HTML", "main_section_html": html}
    matches = client.list("Web Page", fields=["name"], filters=[["route", "=", "os"]], limit=5)
    if matches:
        client.update("Web Page", matches[0]["name"], payload)
    else:
        client.create("Web Page", payload)


def sync_standalone(client: FrappeClient, root: Path, dry_run: bool) -> None:
    standalone = root / "livingorg-os"
    mapping = [
        (standalone / "styles.css", "livingorg-styles.css"),
        (standalone / "js" / "config.js", "livingorg-config.js"),
        (standalone / "js" / "app.js", "livingorg-app.js"),
    ]
    for path, remote in mapping:
        if not path.is_file():
            raise FileNotFoundError(path)
        replace_public_file(client, path, remote, dry_run)
    html = (standalone / "index.html").read_text(encoding="utf-8")
    html = html.replace('href="styles.css', 'href="/files/livingorg-styles.css')
    html = html.replace('src="js/config.js', 'src="/files/livingorg-config.js')
    html = html.replace('src="js/app.js', 'src="/files/livingorg-app.js')
    print("[webpage] /livingorg")
    if dry_run:
        return
    payload = {"title": "LivingOrg OS v2", "route": "livingorg", "published": 1, "content_type": "HTML", "main_section_html": html}
    matches = client.list("Web Page", fields=["name"], filters=[["route", "=", "livingorg"]], limit=5)
    if matches:
        client.update("Web Page", matches[0]["name"], payload)
    else:
        client.create("Web Page", payload)


def check_bridge(client: FrappeClient, *, required: bool) -> bool:
    print("[bridge] livingorg_bridge.status.capabilities")
    try:
        response = client.request("GET", "/api/method/livingorg_bridge.status.capabilities")
        message = response.json().get("message", {})
        if message.get("operational_actions") is True:
            print(f"  OK livingorg_bridge {message.get('version', '?')}")
            return True
    except FrappeRequestError as exc:
        if required:
            raise
        print(f"  WARN bridge no disponible: {exc}")
        return False
    if required:
        raise RuntimeError("livingorg_bridge respondió sin capability operational_actions=true")
    return False


def main() -> int:
    args = parse_args()
    try:
        settings = load_settings()
        client = FrappeClient(settings)
        root = settings.repo_root
        if args.mode in {"install", "update"}:
            ensure_module_and_roles(client, args.dry_run)
            sync_doctypes(client, root, args.dry_run)
            sync_portal(client, root, args.dry_run)
            if not args.dry_run:
                check_bridge(client, required=args.require_bridge)
        if args.mode == "standalone":
            sync_standalone(client, root, args.dry_run)
        print("OK: validación completada" if args.dry_run else "OK: despliegue completado")
        return 0
    except (ConfigurationError, FrappeRequestError, FileNotFoundError, json.JSONDecodeError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
