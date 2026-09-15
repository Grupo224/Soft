#!/usr/bin/env python3
"""Preflight de sólo lectura para deployment LivingOrg por API.

No crea, actualiza ni elimina documentos. Verifica conectividad, identidad y acceso
básico a recursos necesarios por scripts/deploy.py.
"""
from __future__ import annotations

import sys

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError

READ_CHECKS = (
    ("DocType", "DocType"),
    ("Role", "Role"),
    ("Module Def", "Module Def"),
    ("Web Page", "Web Page"),
    ("File", "File"),
)


def main() -> int:
    try:
        settings = load_settings()
        client = FrappeClient(settings)

        identity = client.request("GET", "/api/method/frappe.auth.get_logged_user")
        user = identity.json().get("message") or "<unknown>"
        print(f"[identity] OK {user}")
        print(f"[endpoint] OK {settings.base_url}")

        for label, doctype in READ_CHECKS:
            client.list(doctype, fields=["name"], limit=1)
            print(f"[read] OK {label}")

        try:
            response = client.request(
                "GET",
                "/api/method/livingorg_bridge.status.capabilities",
                allow_404=True,
            )
            if response.status_code == 200:
                message = response.json().get("message", {})
                if message.get("operational_actions") is True:
                    print(f"[runtime] FULL livingorg_bridge {message.get('version', '?')}")
                else:
                    print("[runtime] WARN livingorg_bridge respondió sin operational_actions=true")
            else:
                print("[runtime] INFO livingorg_bridge no detectado; API-only requiere runtime externo/server-script para operaciones críticas")
        except FrappeRequestError as exc:
            # La ausencia del Bridge no bloquea el preflight API. Sí se reporta.
            print(f"[runtime] INFO bridge no verificable: {exc}")

        print("OK: preflight API completado (sólo lectura)")
        return 0
    except (ConfigurationError, FrappeRequestError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
