#!/usr/bin/env python3
"""Validaciones estáticas rápidas del repositorio LivingOrg OS.

No reemplaza pruebas en ERPNext ni pruebas visuales. CI valida estructura,
JSON, secretos, deployment dual y que la capa operacional esté completa antes
de desplegar.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_DOCS = [
    "README.md", "INSTALL.md", "DEPLOYMENT.md", "ARCHITECTURE.md",
    "TROUBLESHOOTING.md", "AGENTS.md", "CHANGELOG.md", "SECURITY.md",
    "ROLLBACK.md", "UPGRADE.md", "COMPATIBILITY.md", "docs/OPERATIONAL_ACTIONS.md",
    "deployment/README.md", "deployment/manifest.json",
    "deployment/bench/INSTALL.md", "deployment/api/INSTALL.md",
    "deployment/api/API_MATRIX.md", "deployment/openclaw/AGENT.md",
]
REQUIRED_OPERATIONAL = [
    "erpnext_setup/doctypes/os_process_action.json",
    "erpnext_setup/doctypes/os_document_link.json",
    "scripts/schema_overlays.py",
    "scripts/deploy_api.py",
    "scripts/preflight.py",
    "scripts/verify.py",
    "portal/assets/js/os-operational.js",
    "portal/assets/js/os-operational-workfix.js",
    "portal/assets/css/os-operational.css",
    "frappe_app/livingorg_bridge/setup.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/hooks.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/api.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/events.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/governance.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/permissions.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/evidence_permissions.py",
    "frappe_app/livingorg_bridge/livingorg_bridge/status.py",
]
SECRET_PATTERNS = [
    re.compile(r'(?im)^\s*(?:API_)?SECRET\s*=\s*["\'][^"\']+["\']'),
    re.compile(r'(?im)^\s*(?:API_)?KEY\s*=\s*["\'][A-Za-z0-9_-]{8,}["\']'),
    re.compile(r'(?i)authorization\s*=\s*["\']token\s+[A-Za-z0-9_-]+:[A-Za-z0-9_-]+'),
    re.compile(r'/home/[^\s"\']+/\.openclaw/'),
]
TEXT_SUFFIXES = {".py", ".js", ".html", ".css", ".md", ".json", ".yml", ".yaml", ".txt", ".toml"}


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)
    print("ERROR:", message)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_DOCS + REQUIRED_OPERATIONAL:
        if not (ROOT / rel).is_file():
            fail(f"Falta archivo requerido: {rel}", errors)

    for json_file in ROOT.rglob("*.json"):
        if ".git" in json_file.parts:
            continue
        try:
            json.loads(json_file.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            fail(f"JSON inválido {json_file.relative_to(ROOT)}: {exc}", errors)

    manifest_path = ROOT / "deployment" / "manifest.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            modes = manifest.get("supported_modes", {})
            for mode in ("bench", "api"):
                if mode not in modes:
                    fail(f"Manifest no declara deployment mode requerido: {mode}", errors)
            safety = manifest.get("safety", {})
            if safety.get("default_safe_mode") is not True:
                fail("Manifest debe mantener default_safe_mode=true", errors)
            for key in ("delete_schema_objects", "drop_fields", "truncate_data", "reinstall", "store_secrets_in_repo"):
                if safety.get(key) is not False:
                    fail(f"Manifest debe declarar safety.{key}=false", errors)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            fail(f"Manifest inválido: {exc}", errors)

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES or ".git" in path.parts:
            continue
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
    for required_asset in ("os-hardening.css", "os-hardening.js", "os-api.js", "os-operational.css", "os-operational.js", "os-operational-workfix.js"):
        if required_asset not in web_page:
            fail(f"Web Page no carga asset requerido: {required_asset}", errors)

    deploy = (ROOT / "scripts" / "deploy.py").read_text(encoding="utf-8")
    for token in ("os_process_action", "os_document_link", "apply_schema_overlays", "os-operational.js", "os-operational-workfix.js"):
        if token not in deploy:
            fail(f"Deployment no incluye componente operativo: {token}", errors)

    deploy_api = (ROOT / "scripts" / "deploy_api.py").read_text(encoding="utf-8")
    if "--require-bridge" in deploy_api:
        fail("deploy_api.py no debe exigir Bridge", errors)
    for token in ("deploy.main", "--mode", "--dry-run"):
        if token not in deploy_api:
            fail(f"deploy_api.py no cumple contrato esperado: {token}", errors)

    hooks = (ROOT / "frappe_app" / "livingorg_bridge" / "livingorg_bridge" / "hooks.py").read_text(encoding="utf-8")
    for token in ("OS Process", "OS Step Run", "OS Approval", "OS Evidence", "permission_query_conditions", "has_permission", "governance.validate_step_run"):
        if token not in hooks:
            fail(f"Custom App no declara control requerido: {token}", errors)

    if errors:
        print(f"\nValidación fallida: {len(errors)} problema(s).")
        return 1
    print("OK: validación estática del repositorio, deployment dual y capa operacional completada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
