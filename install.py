#!/usr/bin/env python3
"""Instala LivingOrg OS en demo.altoplano.mx via Frappe REST API (sin SSH, sin tocar core).
Orden topologico correcto + rompimiento del ciclo OS Process <-> OS SOP."""
import json, os, sys
import requests

BASE = "https://demo.altoplano.mx"
AUTH = "token 71c1c78729def83:bbe692063363d59"
JSON_HEADERS = {"Authorization": AUTH, "Content-Type": "application/json"}
ROOT = os.path.dirname(os.path.abspath(__file__))
DT_DIR = os.path.join(ROOT, "erpnext_setup", "doctypes")
ASSETS = os.path.join(ROOT, "portal", "assets")

ROLES = [
    "OS Admin", "OS Architect", "OS Publisher", "OS AI Supervisor",
    "OS Manager", "OS Operator", "OS Auditor", "OS Viewer",
]

# (filename, campos_a_quitar_en_este_paso)
DT_PLAN = [
    ("os_prompt", None),
    ("os_agent", None),
    ("os_process_step", None),
    ("os_process_edge", None),
    ("os_org_node", None),
    ("os_org_relation", None),
    ("os_role_card", None),
    ("os_kpi_definition", None),
    ("os_integration", None),
    ("os_process", ["sop"]),          # sin el link a OS SOP (aun no existe)
    ("os_sop", None),                 # referencia OS Process (ya existe)
    ("os_process", None),             # re-PUT para agregar el link sop
    ("os_run", None),
    ("os_step_run", None),
    ("os_evidence", None),
    ("os_approval", None),
]

ASSET_FILES = [
    "css/os-portal.css",
    "js/os-api.js",
    "js/os-app.js",
    "js/os-canvas.js",
    "js/os-core.js",
    "js/pages/os-page-agents.js",
    "js/pages/os-page-analytics.js",
    "js/pages/os-page-home.js",
    "js/pages/os-page-org.js",
    "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js",
    "js/pages/os-page-work.js",
]


def get(doctype, name):
    return requests.get(f"{BASE}/api/resource/{doctype}/{name}",
                        headers={"Authorization": AUTH}, timeout=60)


def exists(doctype, name):
    return get(doctype, name).status_code == 200


def post(doctype, data):
    return requests.post(f"{BASE}/api/resource/{doctype}",
                         headers=JSON_HEADERS, data=json.dumps(data), timeout=60)


def put(doctype, name, data):
    return requests.put(f"{BASE}/api/resource/{doctype}/{name}",
                        headers=JSON_HEADERS, data=json.dumps(data), timeout=60)


def step_module():
    print("### 0) Module Def")
    if exists("Module Def", "OS Business Layer"):
        print("  [skip] OS Business Layer"); return
    r = post("Module Def", {"module_name": "OS Business Layer", "app_name": "frappe", "custom": 1})
    print(f"  [{'ok' if r.ok else 'FAIL'}] OS Business Layer" + ("" if r.ok else f" -> {r.status_code} {r.text[:300]}"))
    if not r.ok: sys.exit(1)


def step_roles():
    print("### 1) Roles")
    for role in ROLES:
        if exists("Role", role):
            print(f"  [skip] {role}"); continue
        r = post("Role", {"role_name": role, "desk_access": 0})
        print(f"  [{'ok' if r.ok else 'FAIL'}] {role}" + ("" if r.ok else f" -> {r.status_code} {r.text[:200]}"))
        if not r.ok: sys.exit(1)


def spec_for(fn, remove_fields):
    with open(os.path.join(DT_DIR, fn + ".json")) as f:
        spec = json.load(f)
    if remove_fields:
        spec["fields"] = [f for f in spec["fields"] if f["fieldname"] not in remove_fields]
    return {k: v for k, v in spec.items() if k != "doctype"}


def step_doctypes():
    print("### 2) DocTypes")
    for fn, remove in DT_PLAN:
        spec = spec_for(fn, remove)
        name = spec["name"]
        if remove is not None:
            # paso intermedio sin sop: solo crear si no existe
            if exists("DocType", name):
                print(f"  [skip] {name} (sin {remove})"); continue
            r = post("DocType", spec)
            print(f"  [{'ok' if r.ok else 'FAIL'}] {name} (sin {remove})" + ("" if r.ok else f" -> {r.status_code} {r.text[:400]}"))
            if not r.ok: sys.exit(1)
        else:
            # crear o actualizar (re-PUT)
            if exists("DocType", name):
                r = put("DocType", name, spec)
                print(f"  [{'ok' if r.ok else 'FAIL'}] {name} (update)" + ("" if r.ok else f" -> {r.status_code} {r.text[:400]}"))
                if not r.ok: sys.exit(1)
            else:
                r = post("DocType", spec)
                print(f"  [{'ok' if r.ok else 'FAIL'}] {name}" + ("" if r.ok else f" -> {r.status_code} {r.text[:400]}"))
                if not r.ok: sys.exit(1)


def step_files():
    print("### 3) Archivos (publicos)")
    for rel in ASSET_FILES:
        fname = os.path.basename(rel)
        if exists("File", f"/files/{fname}"):
            print(f"  [skip] {fname}"); continue
        with open(os.path.join(ASSETS, rel), "rb") as fh:
            r = requests.post(f"{BASE}/api/method/upload_file",
                              headers={"Authorization": AUTH},
                              files={"file": (fname, fh, "application/octet-stream")},
                              data={"is_private": "0", "folder": "Home"},
                              timeout=120)
        if r.ok:
            try:
                url = r.json().get("message", {}).get("file_url", "")
            except Exception:
                url = ""
            print(f"  [ok]   {fname} -> {url}")
        else:
            print(f"  [FAIL] {fname} -> {r.status_code} {r.text[:300]}")
            sys.exit(1)


def step_webpage():
    print("### 4) Web Page")
    if exists("Web Page", "os"):
        print("  [skip] Web Page /os (ya existe)"); return
    with open(os.path.join(ROOT, "portal", "pages", "os-web-page.html")) as f:
        html = f.read()
    # Frappe v15: content_type "HTML" lee el campo main_section_html (no main_section)
    r = post("Web Page", {
        "title": "LivingOrg OS",
        "route": "os",
        "published": 1,
        "content_type": "HTML",
        "main_section_html": html,
    })
    print(f"  [{'ok' if r.ok else 'FAIL'}] Web Page /os" + ("" if r.ok else f" -> {r.status_code} {r.text[:400]}"))
    if not r.ok: sys.exit(1)


if __name__ == "__main__":
    step_module()
    step_roles()
    step_doctypes()
    step_files()
    step_webpage()
    print("\n=== INSTALACION COMPLETA ===")
    print("Portal: https://demo.altoplano.mx/os")
