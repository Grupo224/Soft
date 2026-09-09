#!/usr/bin/env python3
"""Actualiza el portal ERPNext a la ultima version (reskin + Procesos rediseñado + 20 doctypes).
Re-aplica los fixes de process->process_ref (ya en JSON/JS locales), ciclo organigrama y colapso sidebar."""
import json, os, sys, time
import requests

KEY = "71c1c78729def83"
SECRET = "156794563fa0b28"
B = "https://demo.altoplano.mx"
AUTH = f"token {KEY}:{SECRET}"
JSON_HDR = {"Authorization": AUTH, "Content-Type": "application/json"}
ROOT = "/home/ubuntu/.openclaw/workspace/Soft_repo"
DT_DIR = os.path.join(ROOT, "erpnext_setup", "doctypes")
ASSETS = os.path.join(ROOT, "portal", "assets")

# orden topologico (child tables y dependencias primero; ciclo OS Process<->OS SOP roto)
DT_PLAN = [
    ("os_prompt", None),
    ("os_agent", None),
    ("os_process_step", None),
    ("os_process_edge", None),
    ("os_sop_step", None),
    ("os_org_node", None),
    ("os_org_relation", None),
    ("os_role_card", None),
    ("os_kpi_definition", None),
    ("os_integration", None),
    ("os_skill", None),
    ("os_policy", None),           # NUEVO
    ("os_process_goal", None),     # NUEVO (child)
    ("os_process", ["sop"]),       # sin link a OS SOP (aun no existe)
    ("os_knowledge_source", None),
    ("os_sop", None),
    ("os_process", None),          # re-PUT con sop + policy + goals
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
    "js/pages/os-page-knowledge.js",
    "js/pages/os-page-org.js",
    "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js",
    "js/pages/os-page-sop.js",
    "js/pages/os-page-work.js",
]


def req(method, path, **kw):
    last = None
    for _ in range(10):
        try:
            r = requests.request(method, B + path, timeout=90, **kw)
            if r.status_code in (200, 201, 202, 204, 404):
                return r
            last = r
        except Exception as e:
            last = e
        time.sleep(3)
    return last


def exists(doctype, name):
    r = req("GET", f"/api/resource/{doctype}/{name}", headers={"Authorization": AUTH})
    return getattr(r, "status_code", None) == 200


def spec_for(fn, remove_fields):
    with open(os.path.join(DT_DIR, fn + ".json")) as f:
        spec = json.load(f)
    if remove_fields:
        spec["fields"] = [x for x in spec["fields"] if x["fieldname"] not in remove_fields]
    return {k: v for k, v in spec.items() if k != "doctype"}


def step_doctypes():
    print("### Doctypes")
    for fn, remove in DT_PLAN:
        spec = spec_for(fn, remove)
        name = spec["name"]
        if remove is not None:
            if exists("DocType", name):
                print(f"  [skip] {name} (sin '{remove}')")
                continue
            r = req("POST", "/api/resource/DocType", headers=JSON_HDR, data=json.dumps(spec))
        else:
            if exists("DocType", name):
                r = req("PUT", f"/api/resource/DocType/{name}", headers=JSON_HDR, data=json.dumps(spec))
                tag = "upd"
            else:
                r = req("POST", "/api/resource/DocType", headers=JSON_HDR, data=json.dumps(spec))
                tag = "new"
        ok = getattr(r, "status_code", None) in (200, 201)
        print(f"  [{'ok' if ok else 'FAIL'}] {name} ({tag if remove is None else 'crear-sin-sop'})" + ("" if ok else f" -> {getattr(r,'status_code','?')} {getattr(r,'text','')[:250]}"))


def step_files():
    print("### Archivos")
    for rel in ASSET_FILES:
        fname = os.path.basename(rel)
        # borrar File docs existentes con ese file_name
        r = req("GET", "/api/resource/File", headers={"Authorization": AUTH},
                params={"fields": '["name"]', "filters": json.dumps([["file_name", "=", fname]])})
        if getattr(r, "status_code", None) == 200:
            for d in r.json().get("data", []):
                req("DELETE", f"/api/resource/File/{d['name']}", headers={"Authorization": AUTH})
        with open(os.path.join(ASSETS, rel), "rb") as fh:
            r = req("POST", "/api/method/upload_file", headers={"Authorization": AUTH},
                    files={"file": (fname, fh, "application/octet-stream")},
                    data={"is_private": "0", "folder": "Home"})
        ok = getattr(r, "status_code", None) == 200
        url = r.json().get("message", {}).get("file_url", "") if ok else ""
        print(f"  [{'ok' if ok else 'FAIL'}] {fname} -> {url}")


def step_webpage():
    print("### Web Page")
    with open(os.path.join(ROOT, "portal", "pages", "os-web-page.html"), encoding="utf-8") as f:
        html = f.read()
    payload = {"title": "LivingOrg OS", "route": "os", "published": 1, "content_type": "HTML", "main_section_html": html}
    r = req("GET", "/api/resource/Web Page", headers={"Authorization": AUTH},
            params={"fields": '["name"]', "filters": json.dumps([["route", "=", "os"]])})
    name = None
    if getattr(r, "status_code", None) == 200 and r.json().get("data"):
        name = r.json()["data"][0]["name"]
    if name:
        r = req("PUT", f"/api/resource/Web Page/{name}", headers=JSON_HDR, data=json.dumps(payload))
        print(f"  [upd] Web Page {name}")
    else:
        r = req("POST", "/api/resource/Web Page", headers=JSON_HDR, data=json.dumps(payload))
        print("  [new] Web Page")


if __name__ == "__main__":
    step_doctypes()
    step_files()
    step_webpage()
    print("\n=== ACTUALIZACION COMPLETA ===")
