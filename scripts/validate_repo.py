#!/usr/bin/env python3
"""Validaciones estáticas rápidas del repositorio LivingOrg OS.

No reemplaza pruebas en ERPNext ni pruebas visuales en navegador. Está pensado
para CI, ingenieros y agentes antes de abrir un PR.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_DOCS = [
    "README.md", "INSTALL.md", "DEPLOYMENT.md", "ARCHITECTURE.md",
    "TROUBLESHOOTING.md", "AGENTS.md", "CHANGELOG.md", "SECURITY.md",
    "ROLLBACK.md", "UPGRADE.md", "COMPATIBILITY.md",
]
SECRET_PATTERNS = [
    re.compile(r'(?im)^\s*(?:API_)?SECRET\s*=\s*["\'][^"\']+["\']'),
    re.compile(r'(?im)^\s*(?:API_)?KEY\s*=\s*["\'][A-Za-z0-9_-]{8,}["\']'),
    re.compile(r'(?i)authorization\s*=\s*["\']token\s+[A-Za-z0-9_-]+:[A-Za-z0-9_-]+'),
    re.compile(r'/home/[^\s"\']+/\.openclaw/'),
]
TEXT_SUFFIXES = {".py", ".js", ".html", ".css", ".md", ".json", ".yml", ".yaml", ".txt"}


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)
    print("ERROR:", message)


def main() -> int:
    errors: list[str] = []

    for doc in REQUIRED_DOCS:
        if not (ROOT / doc).is_file():
            fail(f"Falta documentación requerida: {doc}", errors)

    for json_file in ROOT.rglob("*.json"):
        if ".git" in json_file.parts:
            continue
        try:
            json.loads(json_file.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            fail(f"JSON inválido {json_file.relative_to(ROOT)}: {exc}", errors)

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES or ".git" in path.parts:
            continue
        # El ejemplo de entorno contiene placeholders explícitos y es seguro.
        if path.name == ".env.example":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                fail(f"Posible secreto/ruta local hardcodeada: {path.relative_to(ROOT)}", errors)
                break

    portal_js = ROOT / "portal" / "assets" / "js"
    for js_file in portal_js.rglob("*.js"):
        text = js_file.read_text(encoding="utf-8")
        if js_file.name != "os-api.js" and re.search(r'\bfetch\s*\(', text):
            fail(f"fetch() fuera del adaptador API: {js_file.relative_to(ROOT)}", errors)

    web_page = (ROOT / "portal" / "pages" / "os-web-page.html").read_text(encoding="utf-8")
    for required_asset in ("os-hardening.css", "os-hardening.js", "os-api.js"):
        if required_asset not in web_page:
            fail(f"Web Page no carga asset requerido: {required_asset}", errors)

    if errors:
        print(f"\nValidación fallida: {len(errors)} problema(s).")
        return 1
    print("OK: validación estática del repositorio completada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
