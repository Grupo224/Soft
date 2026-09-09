#!/usr/bin/env python3
"""Deploy re-skin tema Control Room → /livingorg (demo.altoplano.mx)."""
import requests, base64, urllib3
urllib3.disable_warnings()

BASE = "https://demo.altoplano.mx"
H = {"Authorization": "token 71c1c78729def83:156794563fa0b28"}
LOCAL = "/home/ubuntu/.openclaw/workspace/livingorg/livingorg-styles-v20260909e.css"
FNAME = "livingorg-styles-v20260909e.css"
PAGE = "livingorg-os-v2"
OLD = "livingorg-styles-v20260909.css?v=20260909c"
NEW = "livingorg-styles-v20260909e.css?v=20260909e"

def api(method, path, **kw):
    r = requests.request(method, BASE + path, headers=H, timeout=90, verify=False, **kw)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, r.text[:300]

def glist(doctype, fields, filters=None):
    sc, d = api("POST", "/api/method/frappe.client.get_list",
                json={"doctype": doctype, "fields": fields, "filters": filters or [], "limit_page_length": 200})
    return d.get("message", []) if sc == 200 else []

# 1) upload new styles
r = glist("File", ["name"], [["file_name", "=", FNAME]])
if r:
    api("DELETE", f"/api/resource/File/{r[0]['name']}")
b64 = base64.b64encode(open(LOCAL, "rb").read()).decode()
sc, d = api("POST", "/api/resource/File", json={"file_name": FNAME, "is_private": 0, "content": b64, "decode": True})
print("upload styles:", "OK" if sc in (200, 201) else (sc, str(d)[:200]))

# 2) bump /livingorg Web Page
sc, d = api("GET", f"/api/resource/Web Page/{PAGE}")
if sc != 200:
    print("get page failed", sc, str(d)[:200]); raise SystemExit(1)
html = d["data"].get("main_section_html") or ""
html2 = html.replace(OLD, NEW)
print("bump:", "changed" if html2 != html else "NO-OP (old ref no encontrado)")
sc2, d2 = api("PUT", f"/api/resource/Web Page/{PAGE}", json={"main_section_html": html2})
print("page PUT:", "OK" if sc2 == 200 else (sc2, str(d2)[:200]))
