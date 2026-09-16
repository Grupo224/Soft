#!/usr/bin/env python3
"""Despliegue seguro de la generación `livingorg-os-v2`.

Sustituye los scripts históricos que contenían credenciales/rutas de servidor.
Publica los tres assets actuales y actualiza la Web Page preservando la versión v2.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.config import ConfigurationError, load_settings
from scripts.frappe_client import FrappeClient, FrappeRequestError

HERE = Path(__file__).resolve().parent
ASSETS = [
    (HERE / "styles.css", "livingorg-v2-styles.css"),
    (HERE / "js" / "config.js", "livingorg-v2-config.js"),
    (HERE / "js" / "app.js", "livingorg-v2-app.js"),
]


def replace_file(client: FrappeClient, local: Path, remote: str) -> None:
    for doc in client.list("File", fields=["name"], filters=[["file_name", "=", remote]], limit=50):
        client.delete("File", doc["name"], allow_missing=True)
    client.upload_file(local, remote, is_private=False)
    print(f"OK asset: {remote}")


def main() -> int:
    try:
        settings = load_settings()
        client = FrappeClient(settings)
        for local, remote in ASSETS:
            if not local.is_file():
                raise FileNotFoundError(local)
            replace_file(client, local, remote)

        version = time.strftime("%Y%m%d%H%M%S")
        html = (HERE / "index.html").read_text(encoding="utf-8")
        html = html.replace("/files/livingorg-styles.css", "/files/livingorg-v2-styles.css")
        html = html.replace("/files/livingorg-config.js", "/files/livingorg-v2-config.js")
        html = html.replace("/files/livingorg-app.js", "/files/livingorg-v2-app.js")
        import re
        html = re.sub(r"\?v=\d+", "?v=" + version, html)

        payload = {
            "title": "LivingOrg OS v2",
            "route": "livingorg-v2",
            "published": 1,
            "content_type": "HTML",
            "main_section_html": html,
        }
        matches = client.list("Web Page", fields=["name"], filters=[["route", "=", "livingorg-v2"]], limit=5)
        if matches:
            client.update("Web Page", matches[0]["name"], payload)
        else:
            client.create("Web Page", payload)
        print("OK Web Page: /livingorg-v2")
        return 0
    except (ConfigurationError, FrappeRequestError, FileNotFoundError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
