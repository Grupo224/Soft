#!/usr/bin/env python3
"""Deploy fusión (config fusionado + tema Control Room) → /livingorg."""
import requests, base64, urllib3
urllib3.disable_warnings()

BASE = "https://demo.altoplano.mx"
H = {"Authorization": "token 71c1c78729def83:156794563fa0b28"}
DIR = "/home/ubuntu/.openclaw/workspace/livingorg"

def api(method, path, **kw):
    r = requests.request(method, BASE + path, headers=H, timeout=90, verify=False, **kw)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text[:300]

def glist(doctype, fields, filters):
    sc, d = api("POST", "/api/method/frappe.client.get_list",
                json={"doctype": doctype, "fields": fields, "filters": filters, "limit_page_length": 200})
    return d.get("message", []) if sc == 200 else []

def upload(fname, local):
    r = glist("File", ["name"], [["file_name", "=", fname]])
    if r:
        api("DELETE", f"/api/resource/File/{r[0]['name']}")
    b64 = base64.b64encode(open(local, "rb").read()).decode()
    sc, d = api("POST", "/api/resource/File", json={"file_name": fname, "is_private": 0, "content": b64, "decode": True})
    print(f"  file {fname}:", "OK" if sc in (200, 201) else (sc, str(d)[:150]))

upload("livingorg-config-v20260909e.js", DIR + "/livingorg-config-v20260909e.js")
upload("livingorg-styles-v20260909e.css", DIR + "/livingorg-styles-v20260909e.css")

sc, d = api("GET", "/api/resource/Web Page/livingorg-os-v2")
if sc != 200:
    print("get page failed", sc, str(d)[:200]); raise SystemExit(1)
html = d["data"]["main_section_html"]
repls = [
    ("livingorg-config.js?v=202608301815", "livingorg-config-v20260909e.js?v=20260909e"),
    ("livingorg-styles-v20260909.css?v=20260909c", "livingorg-styles-v20260909e.css?v=20260909e"),
]
changed = 0
for old, new in repls:
    if old in html:
        html = html.replace(old, new)
        changed += 1
    else:
        print("  WARN no encontrado:", old)
sc2, d2 = api("PUT", "/api/resource/Web Page/livingorg-os-v2", json={"main_section_html": html})
print(f"  bumps: {changed}/2 · page PUT:", "OK" if sc2 == 200 else (sc2, str(d2)[:200]))
