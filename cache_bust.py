#!/usr/bin/env python3
"""Añade cache-busting (?v=...) a os-web-page.html y actualiza el Web Page /os."""
import re, requests, time

B = "https://demo.altoplano.mx"
# leer credenciales reales desde reinstall.py (ya corregido)
src = open("/home/ubuntu/.openclaw/workspace/Soft_repo/reinstall.py").read()
KEY = re.search(r'KEY = "([^"]+)"', src).group(1)
SECRET = re.search(r'SECRET = "([^"]+)"', src).group(1)
HDR = {"Authorization": f"token {KEY}:{SECRET}"}

VERSION = "202608301810"

path = "/home/ubuntu/.openclaw/workspace/Soft_repo/portal/pages/os-web-page.html"
html = open(path, encoding="utf-8").read()

# cache-busting en css y js (solo las refs /files/os-*)
html = re.sub(r'(/files/os-[A-Za-z0-9.\-]+\.(?:css|js))(")', r'\1?v=' + VERSION + r'\2', html)
# también las fuentes externas no se tocan (son de Google)

open(path, "w", encoding="utf-8").write(html)
print("os-web-page.html actualizado con ?v=" + VERSION)

# actualizar Web Page /os
def req(method, p, **kw):
    for _ in range(6):
        try:
            r = requests.request(method, B + p, timeout=60, **kw)
            if r.status_code in (200, 201, 202, 204):
                return r
        except Exception:
            pass
        time.sleep(2)
    return None

# buscar el Web Page /os
r = req("GET", "/api/resource/Web Page", headers=HDR,
        params={"fields": '["name"]', "filters": '[["route","=","os"]]'})
name = None
if r and r.status_code == 200 and r.json().get("data"):
    name = r.json()["data"][0]["name"]

payload = {"title": "LivingOrg OS", "route": "os", "published": 1, "content_type": "HTML", "main_section_html": html}
if name:
    rr = req("PUT", f"/api/resource/Web Page/{name}", headers={**HDR, "Content-Type": "application/json"},
             data=__import__("json").dumps(payload))
    print(f"Web Page actualizado: {name} -> {getattr(rr,'status_code','?')}")
else:
    print("Web Page /os no encontrado")
