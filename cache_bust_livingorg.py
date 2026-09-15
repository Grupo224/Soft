#!/usr/bin/env python3
"""Actualiza cache-busting de /livingorg y vuelve a desplegar el standalone seguro."""
from __future__ import annotations

import re
import time

from scripts.config import load_settings
from scripts.deploy import sync_standalone
from scripts.frappe_client import FrappeClient


def main() -> int:
    settings = load_settings()
    page = settings.repo_root / "livingorg-os" / "index.html"
    html = page.read_text(encoding="utf-8")
    version = time.strftime("%Y%m%d%H%M%S")
    html = re.sub(r'\?v=\d+', '?v=' + version, html)
    page.write_text(html, encoding="utf-8")
    sync_standalone(FrappeClient(settings), settings.repo_root, False)
    print(f"OK: /livingorg actualizado con cache key {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
