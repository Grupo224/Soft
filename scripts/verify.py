#!/usr/bin/env python3
"""Verificación de sólo lectura para instalaciones LivingOrg OS.

Comprueba objetos administrados por el repositorio y clasifica el runtime como
FULL o DEGRADED. No modifica ERPNext.
"""
from __future__ import annotations

import argparse
import sys

from scripts.config import ConfigurationError, load_settings
from scripts.deploy import DT_PLAN, PORTAL_ASSETS, ROLES
from scripts.frappe_client import FrappeClient, FrappeRequestError


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-bridge", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    failures: list[str] = []
    runtime = "DEGRADED"

    try:
        settings = load_settings()
        client = FrappeClient(settings)

        identity = client.request("GET", "/api/method/frappe.auth.get_logged_user")
        print(f"[identity] {identity.json().get('message', '<unknown>')}")

        if not client.exists("Module Def", "OS Business Layer"):
            failures.append("Module Def: OS Business Layer")
        else:
            print("[module] OK OS Business Layer")

        for role in ROLES:
            if client.exists("Role", role):
                print(f"[role] OK {role}")
            else:
                failures.append(f"Role: {role}")

        seen: set[str] = set()
        for filename, _remove_fields in DT_PLAN:
            # El mismo DocType puede aparecer dos veces en el plan por ciclos de dependencias.
            spec_path = settings.repo_root / "erpnext_setup" / "doctypes" / f"{filename}.json"
            if not spec_path.is_file():
                failures.append(f"Spec missing: {spec_path}")
                continue
            import json
            with spec_path.open(encoding="utf-8") as handle:
                name = json.load(handle).get("name")
            if not name or name in seen:
                continue
            seen.add(name)
            if client.exists("DocType", name):
                print(f"[doctype] OK {name}")
            else:
                failures.append(f"DocType: {name}")

        pages = client.list(
            "Web Page",
            fields=["name", "route", "published"],
            filters=[["route", "=", "os"]],
            limit=5,
        )
        if pages:
            print(f"[webpage] OK /os ({pages[0].get('name')})")
        else:
            failures.append("Web Page: /os")

        expected_assets = {path.split("/")[-1] for path in PORTAL_ASSETS}
        for asset in sorted(expected_assets):
            files = client.list(
                "File",
                fields=["name", "file_name", "file_url"],
                filters=[["file_name", "=", asset]],
                limit=5,
            )
            if files:
                print(f"[asset] OK {asset}")
            else:
                failures.append(f"File: {asset}")

        # El portal escribe con el CSRF real de la sesión (la Web Page lo sirve como "None"):
        # sin este endpoint, todo POST/PUT/DELETE del navegador falla en silencio.
        try:
            csrf = client.request("GET", "/api/method/livingorg_api_csrf", allow_404=True)
            if csrf.status_code == 200 and "message" in (csrf.json() or {}):
                print("[portal] OK livingorg_api_csrf (token CSRF de sesión)")
            else:
                print(
                    "[portal] WARN livingorg_api_csrf no disponible "
                    f"(HTTP {csrf.status_code}): las escrituras del navegador fallarán"
                )
        except FrappeRequestError as exc:
            print(f"[portal] WARN livingorg_api_csrf no verificable: {exc}")

        try:
            response = client.request(
                "GET",
                "/api/method/livingorg_bridge.status.capabilities",
                allow_404=True,
            )
            if response.status_code == 200:
                message = response.json().get("message", {})
                if message.get("operational_actions") is True:
                    runtime = "FULL"
                    print(f"[runtime] FULL livingorg_bridge {message.get('version', '?')}")
                else:
                    print("[runtime] DEGRADED bridge sin operational_actions=true")
            else:
                print("[runtime] DEGRADED livingorg_bridge no detectado")
        except FrappeRequestError as exc:
            print(f"[runtime] DEGRADED bridge no verificable: {exc}")

        if args.require_bridge and runtime != "FULL":
            failures.append("Runtime: livingorg_bridge requerido")

        if failures:
            print("FAILED: faltan o no pudieron verificarse objetos:", file=sys.stderr)
            for item in failures:
                print(f" - {item}", file=sys.stderr)
            return 1

        print(f"OK: deployment verificado; estado={runtime}")
        if runtime == "DEGRADED":
            print(
                "INFO: schema/portal están presentes, pero las operaciones críticas requieren "
                "livingorg_bridge, OpenClaw Runtime o Server Script Runtime validado."
            )
        return 0
    except (ConfigurationError, FrappeRequestError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
