#!/usr/bin/env python3
"""Cache-busting para /livingorg: sube la version de ?v= para forzar recarga de archivos nuevos."""
import re, requests, time, json

B = "https://demo.altoplano.mx"
# leer credenciales reales de reinstall.py (split simple, sin regex fragil)
KEY = SECRET = None
for line in open("/home/ubuntu/.openclaw/workspace/Soft_repo/reinstall.py"):
    if line.startswith('KEY = '):
        KEY = line.split('"')[1]
    elif line.startswith('SECRET = '):
        SECRET = line.split('"')[1]
HDR = {"Authorization": f"token {KEY}:{SECRET}"}
VERSION = "202608301815"

path = "/home/ubuntu/.openclaw/workspace/Soft_repo/livingorg-os/index.html"
html = open(path, encoding="utf-8").read()
html = html.replace('href="styles.css?v=', 'href="/files/livingorg-styles.css?v=')
html = html.replace('src="js/config.js?v=', 'src="/files/livingorg-config.js?v=')
html = html.replace('src="js/app.js?v=', 'src="/files/livingorg-app.js?v=')
html = re.sub(r'\?v=\d+', '?v=' + VERSION, html)
open(path, "w", encoding="utf-8").write(html)
print("index.html actualizado, versiones:")
for m in re.findall(r'/files/livingorg-[a-z]+\.(?:css|js)\?v=\d+', html):
    print("  ", m)

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

r = req("GET", "/api/resource/Web Page", headers=HDR, params={"fields": '["name"]', "filters": '[["route","=","livingorg"]]'})
name = None
if r and r.status_code == 200 and r.json().get("data"):
    name = r.json()["data"][0]["name"]

payload = {"title": "LivingOrg OS v2", "route": "livingorg", "published": 1, "content_type": "HTML", "main_section_html": html}
if name:
    rr = req("PUT", f"/api/resource/Web Page/{name}", headers={**HDR, "Content-Type": "application/json"}, data=json.dumps(payload))
    print(f"Web Page /livingorg actualizado: {name} -> {getattr(rr,'status_code','?')}")
else:
    print("Web Page /livingorg no encontrado")
