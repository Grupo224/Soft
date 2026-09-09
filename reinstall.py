#!/usr/bin/env python3
"""Reinstalación limpia de LivingOrg OS en demo.altoplano.mx: borra TODO lo OS y despliega de nuevo desde el repo."""
import requests, json, time, os, sys

KEY = "71c1c78729def83"
SECRET = "156794563fa0b28"
B = "https://demo.altoplano.mx"
HDR = {"Authorization": f"token {KEY}:{SECRET}"}
JSON_HDR = {"Authorization": f"token {KEY}:{SECRET}", "Content-Type": "application/json"}
ROOT = "/home/ubuntu/.openclaw/workspace/Soft_repo"
DT_DIR = os.path.join(ROOT, "erpnext_setup", "doctypes")
ASSETS = os.path.join(ROOT, "portal", "assets")

ROLES = ["OS Admin", "OS Architect", "OS Publisher", "OS AI Supervisor",
         "OS Manager", "OS Operator", "OS Auditor", "OS Viewer"]

# Orden topológico de CREACIÓN (child tables y dependencias primero; ciclo OS Process<->OS SOP roto)
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
    ("os_policy", None),
    ("os_process_goal", None),
    ("os_process", ["sop"]),
    ("os_knowledge_source", None),
    ("os_sop", None),
    ("os_process", None),
    ("os_run", None),
    ("os_step_run", None),
    ("os_evidence", None),
    ("os_approval", None),
]

# Orden de BORRADO (reverse: dependientes primero)
DT_DELETE_ORDER = [
    "OS Approval", "OS Evidence", "OS Step Run", "OS Run", "OS Knowledge Source",
    "OS Org Relation", "OS SOP Step", "OS Process Step", "OS SOP", "OS Process",
    "OS Process Edge", "OS Process Goal", "OS Org Node", "OS Agent", "OS Prompt",
    "OS Policy", "OS Role Card", "OS KPI Definition", "OS Integration", "OS Skill",
]

PORTAL_FILES = [
    "css/os-portal.css", "js/os-api.js", "js/os-app.js", "js/os-canvas.js", "js/os-core.js",
    "js/pages/os-page-agents.js", "js/pages/os-page-analytics.js", "js/pages/os-page-home.js",
    "js/pages/os-page-knowledge.js", "js/pages/os-page-org.js", "js/pages/os-page-processes.js",
    "js/pages/os-page-runs.js", "js/pages/os-page-sop.js", "js/pages/os-page-work.js",
]
STANDALONE_FILES = [
    ("livingorg-os/styles.css", "livingorg-styles.css"),
    ("livingorg-os/js/config.js", "livingorg-config.js"),
    ("livingorg-os/js/app.js", "livingorg-app.js"),
]


def req(method, path, **kw):
    last = None
    for _ in range(8):
        try:
            r = requests.request(method, B + path, timeout=90, **kw)
            if r.status_code in (200, 201, 202, 204, 404):
                return r
            last = r
        except Exception as e:
            last = e
        time.sleep(2)
    return last


def list_files(prefix):
    r = req("GET", "/api/resource/File", headers=HDR,
            params={"fields": '["name","file_name"]', "filters": json.dumps([["file_name", "like", prefix + "%"]]), "limit_page_length": "200"})
    return r.json().get("data", []) if getattr(r, "status_code", None) == 200 else []


def wipe():
    print("===== BORRADO =====")
    # 1) Web pages
    for wp in ["livingorg-os", "livingorg-os-v2"]:
        r = req("DELETE", f"/api/resource/Web Page/{wp}", headers=HDR)
        print(f"  WebPage {wp}: {getattr(r,'status_code','?')}")
    # 2) Files (os-* y livingorg-*)
    for f in list_files("os-") + list_files("livingorg-"):
        req("DELETE", f"/api/resource/File/{f['name']}", headers=HDR)
    print(f"  Archivos os-*/livingorg-* borrados")
    # 3) Doctypes
    for dt in DT_DELETE_ORDER:
        r = req("DELETE", f"/api/resource/DocType/{dt}", headers=HDR)
        print(f"  DocType {dt}: {getattr(r,'status_code','?')}")
    # 4) Roles
    for role in ROLES:
        r = req("DELETE", f"/api/resource/Role/{role}", headers=HDR)
        print(f"  Role {role}: {getattr(r,'status_code','?')}")
    # 5) Module
    r = req("DELETE", "/api/resource/Module Def/OS Business Layer", headers=HDR)
    print(f"  Module Def: {getattr(r,'status_code','?')}")
    print("===== BORRADO COMPLETO =====\n")


def spec_for(fn, remove_fields):
    with open(os.path.join(DT_DIR, fn + ".json")) as f:
        spec = json.load(f)
    if remove_fields:
        spec["fields"] = [x for x in spec["fields"] if x["fieldname"] not in remove_fields]
    return {k: v for k, v in spec.items() if k != "doctype"}


def deploy():
    print("===== DESPLIEGUE =====")
    # Module
    req("POST", "/api/resource/Module Def", headers=JSON_HDR,
        data=json.dumps({"module_name": "OS Business Layer", "app_name": "frappe", "custom": 1}))
    print("  Module Def OS Business Layer")
    # Roles
    for role in ROLES:
        req("POST", "/api/resource/Role", headers=JSON_HDR, data=json.dumps({"role_name": role, "desk_access": 0}))
    print(f"  {len(ROLES)} roles creados")
    # Doctypes
    for fn, remove in DT_PLAN:
        spec = spec_for(fn, remove)
        name = spec["name"]
        if remove is not None:
            r = req("POST", "/api/resource/DocType", headers=JSON_HDR, data=json.dumps(spec))
            tag = "sin-sop"
        else:
            r = req("GET", f"/api/resource/DocType/{name}", headers=HDR)
            if getattr(r, "status_code", None) == 200:
                r = req("PUT", f"/api/resource/DocType/{name}", headers=JSON_HDR, data=json.dumps(spec))
                tag = "upd"
            else:
                r = req("POST", "/api/resource/DocType", headers=JSON_HDR, data=json.dumps(spec))
                tag = "new"
        ok = getattr(r, "status_code", None) in (200, 201)
        if not ok:
            print(f"  [FAIL] {name} ({tag}) -> {getattr(r,'status_code','?')} {getattr(r,'text','')[:200]}")
    print("  Doctypes creados")
    # Portal files
    for rel in PORTAL_FILES:
        fname = os.path.basename(rel)
        with open(os.path.join(ASSETS, rel), "rb") as fh:
            req("POST", "/api/method/upload_file", headers=HDR,
                files={"file": (fname, fh, "application/octet-stream")}, data={"is_private": "0", "folder": "Home"})
    print(f"  {len(PORTAL_FILES)} archivos portal subidos")
    # Standalone files
    for rel, fname in STANDALONE_FILES:
        with open(os.path.join(ROOT, rel), "rb") as fh:
            req("POST", "/api/method/upload_file", headers=HDR,
                files={"file": (fname, fh, "application/octet-stream")}, data={"is_private": "0", "folder": "Home"})
    print(f"  {len(STANDALONE_FILES)} archivos standalone subidos")
    # Web Page /os
    with open(os.path.join(ROOT, "portal", "pages", "os-web-page.html"), encoding="utf-8") as f:
        html = f.read()
    req("POST", "/api/resource/Web Page", headers=JSON_HDR, data=json.dumps(
        {"title": "LivingOrg OS", "route": "os", "published": 1, "content_type": "HTML", "main_section_html": html}))
    print("  Web Page /os")
    # Web Page /livingorg
    with open(os.path.join(ROOT, "livingorg-os", "index.html"), encoding="utf-8") as f:
        h2 = f.read()
    h2 = h2.replace('href="styles.css?v=20260830"', 'href="/files/livingorg-styles.css?v=20260830"')
    h2 = h2.replace('src="js/config.js?v=20260830"', 'src="/files/livingorg-config.js?v=20260830"')
    h2 = h2.replace('src="js/app.js?v=20260830"', 'src="/files/livingorg-app.js?v=20260830"')
    req("POST", "/api/resource/Web Page", headers=JSON_HDR, data=json.dumps(
        {"title": "LivingOrg OS v2", "route": "livingorg", "published": 1, "content_type": "HTML", "main_section_html": h2}))
    print("  Web Page /livingorg")
    print("===== DESPLIEGUE COMPLETO =====\n")


def verify():
    print("===== VERIFICACIÓN =====")
    for dt in ["OS Process", "OS SOP", "OS Org Node", "OS Policy", "OS Process Goal"]:
        r = req("POST", "/api/method/frappe.client.get_count", headers=JSON_HDR, data=json.dumps({"doctype": dt}))
        print(f"  {dt}: {getattr(r,'json',lambda:{})().get('message','?') if getattr(r,'status_code',None)==200 else getattr(r,'status_code','?')}")
    import urllib.request
    for path in ["/os", "/livingorg", "/files/os-core.js", "/files/livingorg-app.js"]:
        try:
            code = urllib.request.urlopen(B + path, timeout=20).status
        except Exception as e:
            code = getattr(e, "code", "ERR")
        print(f"  {path}: HTTP {code}")


if __name__ == "__main__":
    wipe()
    deploy()
    verify()
    print("\n=== REINSTALACIÓN COMPLETA ===")
