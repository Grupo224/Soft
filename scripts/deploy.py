#!/usr/bin/env python3
"""Despliegue canónico, idempotente y no destructivo de LivingOrg OS.

Reemplaza la duplicación de install.py/update.py/update_v2.py sin borrar esos
entrypoints: los scripts legacy se mantienen como wrappers compatibles.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError
from scripts.permissions import apply_canonical_permissions

ROLES = [
    "OS Admin", "OS Architect", "OS Publisher", "OS AI Supervisor",
    "OS Manager", "OS Operator", "OS Auditor", "OS Viewer",
]

# Última topología conocida. Se rompe deliberadamente el ciclo Process <-> SOP.
DT_PLAN = [
    ("os_prompt", None), ("os_agent", None), ("os_process_step", None),
    ("os_process_edge", None), ("os_sop_step", None), ("os_org_node", None),
    ("os_org_relation", None), ("os_role_card", None), ("os_kpi_definition", None),
    ("os_integration", None), ("os_skill", None), ("os_policy", None),
    ("os_process_goal", None), ("os_process", ["sop"]),
    ("os_knowledge_source", None), ("os_sop", None), ("os_process", None),
    ("os_run", None), ("os_step_run", None), ("os_evidence", None),
    ("os_approval", None),
]

PORTAL_ASSETS = [
    "css/os-portal.css", "js/os-api.js", "js/os-app.js", "js/os-canvas.js", "js/os-core.js",
    "js/pages/os-page-agents.js", "js/pages/os-page-analytics.js", "js/pages/os-page-home.js",
    "js/pages/os-page-knowledge.js", "js/pages/os-page-org.js", "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js", "js/pages/os-page-sop.js", "js/pages/os-page-work.js",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("install", "update", "standalone"), default="update")
    parser.add_argument("--dry-run", action="store_true", help="Valida archivos/configuración sin escribir en Frappe.")
    return parser.parse_args()


def load_spec(dt_dir: Path, filename: str, remove_fields: list[str] | None) -> dict:
    path = dt_dir / f"{filename}.json"
    with path.open(encoding="utf-8") as handle:
        spec = json.load(handle)
    if remove_fields:
        spec["fields"] = [f for f in spec.get("fields", []) if f.get("fieldname") not in remove_fields]
    spec = {k: v for k, v in spec.items() if k != "doctype"}
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
            # Paso intermedio del ciclo: no degradar un DocType ya completo.
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
    payload = {
        "title": "LivingOrg OS", "route": "os", "published": 1,
        "content_type": "HTML", "main_section_html": html,
    }
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
    payload = {
        "title": "LivingOrg OS v2", "route": "livingorg", "published": 1,
        "content_type": "HTML", "main_section_html": html,
    }
    matches = client.list("Web Page", fields=["name"], filters=[["route", "=", "livingorg"]], limit=5)
    if matches:
        client.update("Web Page", matches[0]["name"], payload)
    else:
        client.create("Web Page", payload)


def main() -> int:
    args = parse_args()
    try:
        settings = load_settings()
        client = FrappeClient(settings)
        root = settings.repo_root

        # Dry-run también verifica que los JSON sean parseables y los assets existan.
        if args.mode in {"install", "update"}:
            ensure_module_and_roles(client, args.dry_run)
            sync_doctypes(client, root, args.dry_run)
            sync_portal(client, root, args.dry_run)
        if args.mode == "standalone":
            sync_standalone(client, root, args.dry_run)

        print("OK: validación completada" if args.dry_run else "OK: despliegue completado")
        return 0
    except (ConfigurationError, FrappeRequestError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
