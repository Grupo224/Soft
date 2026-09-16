#!/usr/bin/env python3
"""Reinstalación destructiva de LivingOrg OS con doble confirmación.

Conserva la capacidad histórica de reinstalar desde cero, pero nunca se ejecuta
por accidente: exige --confirm-destroy y LIVINGORG_ALLOW_DESTRUCTIVE=1.
"""
from __future__ import annotations

import argparse
import os
import sys

from scripts.config import ConfigurationError, load_settings
from scripts.deploy import ensure_module_and_roles, sync_doctypes, sync_portal, sync_standalone
from scripts.frappe_client import FrappeClient, FrappeRequestError

ROLES = ["OS Admin", "OS Architect", "OS Publisher", "OS AI Supervisor", "OS Manager", "OS Operator", "OS Auditor", "OS Viewer"]
DT_DELETE_ORDER = [
    "OS Approval", "OS Evidence", "OS Step Run", "OS Run", "OS Knowledge Source",
    "OS Org Relation", "OS SOP Step", "OS Process Step", "OS SOP", "OS Process",
    "OS Process Edge", "OS Process Goal", "OS Org Node", "OS Agent", "OS Prompt",
    "OS Policy", "OS Role Card", "OS KPI Definition", "OS Integration", "OS Skill",
]


def guard() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-destroy", action="store_true")
    args = parser.parse_args()
    if not args.confirm_destroy or os.environ.get("LIVINGORG_ALLOW_DESTRUCTIVE") != "1":
        raise ConfigurationError(
            "Operación bloqueada. Para una reinstalación destructiva usa --confirm-destroy "
            "y exporta LIVINGORG_ALLOW_DESTRUCTIVE=1. Lee ROLLBACK.md antes de continuar."
        )


def wipe(client: FrappeClient) -> None:
    print("ADVERTENCIA: eliminando recursos LivingOrg OS del sitio configurado.")
    for route in ("os", "livingorg"):
        matches = client.list("Web Page", fields=["name"], filters=[["route", "=", route]], limit=20)
        for doc in matches:
            client.delete("Web Page", doc["name"], allow_missing=True)

    for prefix in ("os-", "livingorg-"):
        files = client.list("File", fields=["name", "file_name"], filters=[["file_name", "like", prefix + "%"]], limit=500)
        for doc in files:
            client.delete("File", doc["name"], allow_missing=True)

    for doctype in DT_DELETE_ORDER:
        client.delete("DocType", doctype, allow_missing=True)
    for role in ROLES:
        client.delete("Role", role, allow_missing=True)
    client.delete("Module Def", "OS Business Layer", allow_missing=True)


def main() -> int:
    try:
        guard()
        settings = load_settings()
        client = FrappeClient(settings)
        wipe(client)
        ensure_module_and_roles(client, False)
        sync_doctypes(client, settings.repo_root, False)
        sync_portal(client, settings.repo_root, False)
        sync_standalone(client, settings.repo_root, False)
        print("OK: reinstalación completada.")
        return 0
    except (ConfigurationError, FrappeRequestError, FileNotFoundError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
