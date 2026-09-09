#!/usr/bin/env python3
"""Limpia los REGISTROS (datos) de todos los Doctypes OS_* (no-child) — el DELETE de DocType no dropa la tabla."""
import re, requests, time

src = open("/home/ubuntu/.openclaw/workspace/Soft_repo/reinstall.py").read()
KEY = re.search(r'KEY = "([^"]+)"', src).group(1)
SECRET = re.search(r'SECRET = "([^"]+)"', src).group(1)
B = "https://demo.altoplano.mx"
HDR = {"Authorization": f"token {KEY}:{SECRET}"}

# Doctypes OS no-child (con datos propios); los child tables van dentro del padre.
NON_CHILD = [
    "OS Agent", "OS Approval", "OS Evidence", "OS Integration", "OS KPI Definition",
    "OS Knowledge Source", "OS Org Node", "OS Org Relation", "OS Policy", "OS Process",
    "OS Prompt", "OS Role Card", "OS Run", "OS SOP", "OS Skill", "OS Step Run",
]

def req(method, path, **kw):
    for _ in range(6):
        try:
            r = requests.request(method, B + path, timeout=60, **kw)
            if r.status_code in (200, 201, 202, 204, 404):
                return r
        except Exception:
            pass
        time.sleep(2)
    return None

total = 0
for dt in NON_CHILD:
    r = req("GET", f"/api/resource/{dt}", headers=HDR, params={"fields": '["name"]', "limit_page_length": "500"})
    recs = r.json().get("data", []) if r and r.status_code == 200 else []
    for rec in recs:
        req("DELETE", f"/api/resource/{dt}/{rec['name']}", headers=HDR)
        total += 1
    if recs:
        print(f"  {dt}: {len(recs)} borrados")
print(f"Total registros borrados: {total}")
