#!/usr/bin/env python3
"""Actualiza LivingOrg OS en demo.altoplano.mx a la version mas reciente (Fase 6).
Corrige el bug del campo 'process' (ya aplicado en JSON/JS) y usa main_section_html.
Idempotente: crea doctypes nuevos, actualiza los cambiados, reemplaza archivos, actualiza Web Page."""
import json, os, sys
import requests

BASE = "https://demo.altoplano.mx"
KEY = "71c1c78729def83"
SECRET = "bbe692063363d59"
AUTH = f"token {KEY}:{SECRET}"
JSON_HEADERS = {"Authorization": AUTH, "Content-Type": "application/json"}
ROOT = os.path.dirname(os.path.abspath(__file__))
DT_DIR = os.path.join(ROOT, "erpnext_setup", "doctypes")
ASSETS = os.path.join(ROOT, "portal", "assets")

# (filename, campos_a_quitar_en_este_paso) — orden topologico, ciclo OS Process<->OS SOP roto
DT_PLAN = [
    ("os_prompt", None),
    ("os_agent", None),
    ("os_process_step", None),
    ("os_process_edge", None),
    ("os_sop_step", None),            # NUEVO (child table)
    ("os_org_node", None),
    ("os_org_relation", None),
    ("os_role_card", None),
    ("os_kpi_definition", None),
    ("os_integration", None),
    ("os_skill", None),               # NUEVO
    ("os_process", ["sop"]),          # sin link a OS SOP (aun no existe)
    ("os_knowledge_source", None),    # NUEVO (process_ref -> OS Process)
    ("os_sop", None),                 # full (process_ref + steps -> OS SOP Step)
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
    "js/pages/os-page-knowledge.js",
    "js/pages/os-page-org.js",
    "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js",
    "js/pages/os-page-sop.js",
    "js/pages/os-page-work.js",
]


def get_list(doctype, filters):
    r = requests.get(f"{BASE}/api/resource/{doctype}", headers={"Authorization": AUTH},
                     params={"fields": "[\"name\"]", "filters": json.dumps(filters),
                             "limit_page_length": "200"}, timeout=60)
    return r.json().get("data", [])


def exists(doctype, name):
    return requests.get(f"{BASE}/api/resource/{doctype}/{name}",
                        headers={"Authorization": AUTH}, timeout=60).status_code == 200


def post(doctype, data):
    return requests.post(f"{BASE}/api/resource/{doctype}", headers=JSON_HEADERS,
                         data=json.dumps(data), timeout=90)


def put(doctype, name, data):
    return requests.put(f"{BASE}/api/resource/{doctype}/{name}", headers=JSON_HEADERS,
                        data=json.dumps(data), timeout=90)


def spec_for(fn, remove_fields):
    with open(os.path.join(DT_DIR, fn + ".json")) as f:
        spec = json.load(f)
    if remove_fields:
        spec["fields"] = [f for f in spec["fields"] if f["fieldname"] not in remove_fields]
    return {k: v for k, v in spec.items() if k != "doctype"}


def step_doctypes():
    print("### Doctypes (crear nuevos / actualizar cambiados)")
    for fn, remove in DT_PLAN:
        spec = spec_for(fn, remove)
        name = spec["name"]
        if remove is not None:
            if exists("DocType", name):
                print(f"  [skip] {name} (paso sin '{remove}')")
                continue
            r = post("DocType", spec)
        else:
            if exists("DocType", name):
                r = put("DocType", name, spec)
                print(f"  [upd ] {name}" + ("" if r.ok else f" -> {r.status_code} {r.text[:300]}"))
                if not r.ok:
                    print("     (se continuara; revisar al final)")
                continue
            r = post("DocType", spec)
        if r.ok:
            print(f"  [ok  ] {name}" + (" (nuevo)" if remove is None else f" (sin '{remove}')"))
        else:
            print(f"  [FAIL] {name} -> {r.status_code} {r.text[:500]}")


def step_files():
    print("### Archivos (reemplazar preservando URL /files/<nombre>)")
    for rel in ASSET_FILES:
        fname = os.path.basename(rel)
        # eliminar TODOS los File docs con ese file_name (puede haber duplicados)
        docs = get_list("File", [["file_name", "=", fname]])
        for d in docs:
            requests.delete(f"{BASE}/api/resource/File/{d['name']}",
                            headers={"Authorization": AUTH}, timeout=30)
        if docs:
            print(f"  [del ] {fname} (x{len(docs)})")
        with open(os.path.join(ASSETS, rel), "rb") as fh:
            r = requests.post(f"{BASE}/api/method/upload_file",
                              headers={"Authorization": AUTH},
                              files={"file": (fname, fh, "application/octet-stream")},
                              data={"is_private": "0", "folder": "Home"}, timeout=120)
        if r.ok:
            url = r.json().get("message", {}).get("file_url", "")
            print(f"  [up  ] {fname} -> {url}")
        else:
            print(f"  [FAIL] {fname} -> {r.status_code} {r.text[:300]}")


def step_webpage():
    print("### Web Page")
    with open(os.path.join(ROOT, "portal", "pages", "os-web-page.html")) as f:
        html = f.read()
    wp_name = "livingorg-os"
    if exists("Web Page", wp_name):
        r = put("Web Page", wp_name, {
            "title": "LivingOrg OS", "route": "os", "published": 1,
            "content_type": "HTML", "main_section_html": html,
        })
        print(f"  [upd ] Web Page {wp_name}" + ("" if r.ok else f" -> {r.status_code} {r.text[:300]}"))
    else:
        r = post("Web Page", {
            "title": "LivingOrg OS", "route": "os", "published": 1,
            "content_type": "HTML", "main_section_html": html,
        })
        print(f"  [ok  ] Web Page creado" + ("" if r.ok else f" -> {r.status_code} {r.text[:300]}"))


if __name__ == "__main__":
    step_doctypes()
    step_files()
    step_webpage()
    print("\n=== ACTUALIZACION COMPLETA ===")
