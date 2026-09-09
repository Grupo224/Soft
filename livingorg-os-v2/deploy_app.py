#!/usr/bin/env python3
"""Deploy app.js (botones Guardar/Actualizar) → /livingorg."""
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

fname = "livingorg-app-v20260909e.js"
r = glist("File", ["name"], [["file_name", "=", fname]])
if r:
    api("DELETE", f"/api/resource/File/{r[0]['name']}")
b64 = base64.b64encode(open(DIR + "/livingorg-app.js", "rb").read()).decode()
sc, d = api("POST", "/api/resource/File", json={"file_name": fname, "is_private": 0, "content": b64, "decode": True})
print(f"  file {fname}:", "OK" if sc in (200, 201) else (sc, str(d)[:150]))

sc, d = api("GET", "/api/resource/Web Page/livingorg-os-v2")
html = d["data"]["main_section_html"]
old = "livingorg-app-v20260909.js?v=20260909d"
new = "livingorg-app-v20260909e.js?v=20260909e"
if old in html:
    html = html.replace(old, new)
    sc2, d2 = api("PUT", "/api/resource/Web Page/livingorg-os-v2", json={"main_section_html": html})
    print("  app.js bump:", "OK" if sc2 == 200 else (sc2, str(d2)[:200]))
else:
    print("  WARN: ref no encontrada:", old)
