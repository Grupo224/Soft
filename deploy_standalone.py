#!/usr/bin/env python3
"""Despliega LIVINGORG OS standalone (livingorg-os/) como SEGUNDA version en demo.altoplano.mx/livingorg."""
import requests, json, time, os, sys

KEY = "71c1c78729def83"
SECRET = "156794563fa0b28"
B = "https://demo.altoplano.mx"
HDR = {"Authorization": f"token {KEY}:{SECRET}"}
ROOT = "/home/ubuntu/.openclaw/workspace/Soft_repo/livingorg-os"

FILES = [
    ("styles.css", "livingorg-styles.css"),
    ("js/config.js", "livingorg-config.js"),
    ("js/app.js", "livingorg-app.js"),
]

def retry(fn, tries=10, delay=3):
    last = None
    for i in range(tries):
        try:
            r = fn()
            if r is not None and getattr(r, "status_code", None) in (200, 201, 202, 204, 404):
                return r
            if r is not None:
                last = r
        except Exception as e:
            last = e
        time.sleep(delay)
    return last

def build_html():
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        html = f.read()
    html = html.replace('href="styles.css?v=20260830"', 'href="/files/livingorg-styles.css?v=20260830"')
    html = html.replace('src="js/config.js?v=20260830"', 'src="/files/livingorg-config.js?v=20260830"')
    html = html.replace('src="js/app.js?v=20260830"', 'src="/files/livingorg-app.js?v=20260830"')
    return html

def upload_file(local, fname):
    # 1) eliminar File docs existentes con ese file_name
    r = retry(lambda: requests.get(B + "/api/resource/File", headers=HDR,
        params={"fields": '["name"]', "filters": json.dumps([["file_name", "=", fname]])}, timeout=40))
    if r is not None and getattr(r, "status_code", None) == 200:
        for d in r.json().get("data", []):
            retry(lambda: requests.delete(B + f"/api/resource/File/{d['name']}", headers=HDR, timeout=30))
    # 2) subir
    with open(os.path.join(ROOT, local), "rb") as fh:
        r = retry(lambda: requests.post(B + "/api/method/upload_file", headers=HDR,
            files={"file": (fname, fh, "application/octet-stream")},
            data={"is_private": "0", "folder": "Home"}, timeout=60))
    if r is not None and getattr(r, "status_code", None) == 200:
        url = r.json().get("message", {}).get("file_url", "")
        print(f"OK  {fname} -> {url}")
        return True
    print(f"FAIL {fname} -> {getattr(r, 'status_code', '?')} {getattr(r, 'text', '')[:120]}")
    return False

def upsert_webpage(html):
    route = "livingorg"
    # buscar existente
    r = retry(lambda: requests.get(B + "/api/resource/Web Page", headers=HDR,
        params={"fields": '["name"]', "filters": json.dumps([["route", "=", route]])}, timeout=40))
    name = None
    if r is not None and getattr(r, "status_code", None) == 200:
        data = r.json().get("data", [])
        if data:
            name = data[0]["name"]
    payload = {"title": "LivingOrg OS v2", "route": route, "published": 1,
               "content_type": "HTML", "main_section_html": html}
    if name:
        rr = retry(lambda: requests.put(B + f"/api/resource/Web Page/{name}", headers={**HDR, "Content-Type": "application/json"},
            data=json.dumps(payload), timeout=60))
        print(f"{'OK' if rr and getattr(rr,'status_code',None)==200 else 'FAIL'} Web Page actualizado: {name}")
    else:
        rr = retry(lambda: requests.post(B + "/api/resource/Web Page", headers={**HDR, "Content-Type": "application/json"},
            data=json.dumps(payload), timeout=60))
        print(f"{'OK' if rr and getattr(rr,'status_code',None) in (200,201) else 'FAIL'} Web Page creado")

if __name__ == "__main__":
    html = build_html()
    print("HTML ajustado OK")
    ok = True
    for local, fname in FILES:
        if not upload_file(local, fname):
            ok = False
    if ok:
        upsert_webpage(html)
    print("\n=== DESPLIEGUE COMPLETO ===" if ok else "\n=== HUBO ERRORES ===")
    print("URL: https://demo.altoplano.mx/livingorg")
