#!/usr/bin/env python3
"""Actualiza el cache-busting del portal /os y vuelve a desplegarlo de forma segura."""
from __future__ import annotations

import re
import time

from scripts.config import load_settings
from scripts.deploy import sync_portal
from scripts.frappe_client import FrappeClient


def main() -> int:
    settings = load_settings()
    page = settings.repo_root / "portal" / "pages" / "os-web-page.html"
    html = page.read_text(encoding="utf-8")
    version = time.strftime("%Y%m%d%H%M%S")
    html = re.sub(r'(/files/os-[A-Za-z0-9.\-]+\.(?:css|js))(?:\?v=\d+)?', r'\1?v=' + version, html)
    page.write_text(html, encoding="utf-8")
    sync_portal(FrappeClient(settings), settings.repo_root, False)
    print(f"OK: /os actualizado con cache key {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
