#!/bin/bash
# Re-subir los archivos corregidos a demo.altoplano.mx (borrar File previo + subir).
AUTH="Authorization: token 71c1c78729def83:156794563fa0b28"
B="https://demo.altoplano.mx"
cd /home/ubuntu/.openclaw/workspace/Soft_repo

upload_one() {
  local local_path="$1" fname="$2"
  # 1) borrar File docs con ese file_name
  local hashes=$(curl -s -m 20 -H "$AUTH" "$B/api/resource/File?filters=%5B%5B%22file_name%22%2C%22%3D%22%2C%22$fname%22%5D%5D&fields=%5B%22name%22%5D" | python3 -c "import sys,json; print(' '.join(d['name'] for d in json.load(sys.stdin).get('data',[])))" 2>/dev/null)
  for h in $hashes; do
    curl -s -m 20 -o /dev/null -X DELETE -H "$AUTH" "$B/api/resource/File/$h"
  done
  # 2) subir
  local resp=$(curl -s -m 40 -X POST -H "$AUTH" -F "file=@$local_path;filename=$fname;type=application/octet-stream" -F "is_private=0" -F "folder=Home" "$B/api/method/upload_file")
  if echo "$resp" | grep -q '"file_url"'; then
    echo "OK   $fname -> $(echo "$resp" | grep -o '/files/[^"]*')"
  else
    echo "FAIL $fname -> $(echo "$resp" | head -c 120)"
  fi
}

upload_one "portal/assets/js/pages/os-page-org.js" "os-page-org.js"
upload_one "portal/assets/js/os-core.js" "os-core.js"
upload_one "portal/assets/js/os-canvas.js" "os-canvas.js"
upload_one "portal/assets/js/pages/os-page-processes.js" "os-page-processes.js"
upload_one "portal/assets/css/os-portal.css" "os-portal.css"
upload_one "livingorg-os/js/app.js" "livingorg-app.js"
upload_one "livingorg-os/styles.css" "livingorg-styles.css"
