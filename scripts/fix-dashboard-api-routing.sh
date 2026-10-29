#!/usr/bin/env bash
# Invoked by fix-dashboard-api-routing.ps1. Minimal, reversible Nginx route change.
set -Eeuo pipefail
host="$1"
active=/etc/nginx/sites-enabled/petlife
if [ "$(id -u)" -ne 0 ]; then echo "FAIL: root SSH account is required." >&2; exit 1; fi
for cmd in nginx curl python3 systemctl readlink mktemp; do
  command -v "$cmd" >/dev/null || { echo "FAIL: missing $cmd" >&2; exit 1; }
done
real="$(readlink -f "$active")"
case "$real" in /etc/nginx/*) ;; *) echo "FAIL: unexpected active Nginx site." >&2; exit 1;; esac
nginx -t
tmp="$(mktemp -d)"
changed=0
backup=''
finish() {
  code="$?"
  trap - EXIT
  if [ "$code" -ne 0 ] && [ "$changed" -eq 1 ]; then
    echo "ROLLBACK: restoring $backup"
    if cp -p "$backup" "$real" && nginx -t && systemctl reload nginx; then
      echo "ROLLBACK: previous Nginx configuration restored."
    else
      echo "CRITICAL: automatic rollback failed. Backup: $backup" >&2
    fi
  fi
  rm -rf "$tmp"
  exit "$code"
}
trap finish EXIT
get() {
  curl -sS --max-time 9 --connect-timeout 3 -H "Host: $host" \
    -D "$tmp/headers" -o "$tmp/body" -w '%{http_code}' "$1"
}
routes=('/api/reminders/upcoming' '/api/service-requests/my')
echo '=== PETLIFEAU DASHBOARD API ROUTING REPAIR ==='
echo 'Mode: two exact GET endpoints only; other /api/ paths unchanged.'
health="$(get http://127.0.0.1:5300/health/live)"
echo "Gateway live: HTTP $health"
if [ "$health" != 200 ]; then echo 'FAIL: Gateway unhealthy; no changes.' >&2; exit 1; fi
for route in "${routes[@]}"; do
  code="$(get "http://127.0.0.1:5300$route")"
  echo "Gateway $route: HTTP $code (unauthenticated)"
  if [ "$code" != 401 ] && [ "$code" != 403 ]; then
    echo 'FAIL: Gateway route unavailable or unexpected; no changes.' >&2
    exit 1
  fi
done
pref_before="$(get 'http://127.0.0.1/api/user-preferences/me')"
notif_before="$(get 'http://127.0.0.1/api/notifications/unread-count')"
echo "Legacy preferences before: HTTP $pref_before"
echo "Legacy notifications before: HTTP $notif_before"
marker='# PetLifeAU dashboard Gateway routes (managed by fix-dashboard-api-routing.ps1)'
if grep -Fq "$marker" "$real"; then
  echo 'Managed routes already present; verifying without editing.'
else
  backup_dir=/var/backups/petlife-nginx-dashboard
  mkdir -p "$backup_dir"
  backup="$backup_dir/petlife.$(date -u +%Y%m%dT%H%M%SZ).$$.conf"
  cp -p "$real" "$backup"
  chmod 600 "$backup"
  echo "Backup created: $backup"
  changed=1
  python3 - "$real" <<'PYCODE'
import os, pathlib, re, stat, sys, tempfile
path = pathlib.Path(sys.argv[1])
source = path.read_text(encoding='utf-8')
managed = '# PetLifeAU dashboard Gateway routes (managed by fix-dashboard-api-routing.ps1)'
if managed in source:
    raise SystemExit('FAIL: managed marker already exists; refusing duplicate change.')
for endpoint in ('/api/reminders/upcoming','/api/service-requests/my'):
    if re.search(r'(?m)^\s*location\s+(?:=\s+|\^~\s+)?' + re.escape(endpoint) + r'(?:\s|\{)',source):
        raise SystemExit('FAIL: existing route would conflict: ' + endpoint)
roots = list(re.finditer(r'(?m)^([ \t]*)root\s+/var/www/petlife\s*;',source))
if len(roots) != 1:
    raise SystemExit('FAIL: expected one /var/www/petlife document root.')
root = roots[0]
servers = list(re.finditer(r'(?m)^[ \t]*server\s*\{',source[:root.start()]))
if not servers:
    raise SystemExit('FAIL: cannot locate frontend server block.')
context = source[servers[-1].end():root.start()]
if not re.search(r'(?m)^\s*listen\s+80\s+default_server\s*;',context):
    raise SystemExit('FAIL: frontend root is not in the expected port-80 server.')
if not re.search(r'(?m)^\s*server_name\s+_\s*;',context):
    raise SystemExit('FAIL: unexpected server_name.')
if not re.search(r'(?s)location\s+\^~\s+/api/\s*\{[^}]*proxy_pass\s+http://127\.0\.0\.1:5000\s*;',source):
    raise SystemExit('FAIL: expected legacy /api/ proxy not found.')
indent = root.group(1)
block = ['','',indent + managed]
for route in ('/api/reminders/upcoming', '/api/service-requests/my'):
    block += [
        indent + 'location = ' + route + ' {',
        indent + '    proxy_pass http://127.0.0.1:5300;',
        indent + '    proxy_http_version 1.1;',
        indent + '    proxy_set_header Host $host;',
        indent + '    proxy_set_header X-Real-IP $remote_addr;',
        indent + '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
        indent + '    proxy_set_header X-Forwarded-Proto $scheme;',
        indent + '    add_header X-PetLife-Route Gateway always;',
        indent + '}'
    ]
updated = source[:root.end()] + '\n'.join(block) + source[root.end():]
info=path.stat()
fd,stage=tempfile.mkstemp(prefix='.petlife-dashboard-',dir=str(path.parent))
try:
    with os.fdopen(fd,'w',encoding='utf-8') as target:
        target.write(updated)
    os.chmod(stage,stat.S_IMODE(info.st_mode))
    os.chown(stage,info.st_uid,info.st_gid)
    os.replace(stage,path)
finally:
    if os.path.exists(stage):
        os.unlink(stage)
print('Installed two exact-match dashboard API routes.')
PYCODE
  nginx -t
  systemctl reload nginx
fi
# An exact-match route sets this response header. Test it as well as HTTP status
# to avoid mistaking a 401 from the old API for successful Gateway routing.
for route in "${routes[@]}"; do
  good=0
  for attempt in 1 2 3; do
    code="$(get "http://127.0.0.1$route")"
    if [ "$code" = 401 ] || [ "$code" = 403 ]; then
      if grep -Eiq '^X-PetLife-Route:[[:space:]]*Gateway\r?$' "$tmp/headers"; then
        good=1
        break
      fi
    fi
    sleep 1
  done
  echo "Nginx $route: HTTP $code; Gateway route header confirmed=$good"
  if [ "$good" -ne 1 ]; then
    echo "FAIL: $route is not routed to Gateway." >&2
    exit 1
  fi
done
pref_after="$(get 'http://127.0.0.1/api/user-preferences/me')"
notif_after="$(get 'http://127.0.0.1/api/notifications/unread-count')"
home="$(get 'http://127.0.0.1/')"
echo "Legacy preferences after: HTTP $pref_after"
echo "Legacy notifications after: HTTP $notif_after"
echo "Frontend homepage: HTTP $home"
if [ "$pref_before" != "$pref_after" ] || [ "$notif_before" != "$notif_after" ] || [ "$home" != 200 ]; then
  echo 'FAIL: unrelated routes changed behavior; rolling back.' >&2
  exit 1
fi
changed=0
echo 'SUCCESS: two dashboard paths now reach Gateway. No Bearer tokens were used.'
echo 'Note: authenticated data access and remaining APIs must be tested separately.'
if [ -n "$backup" ]; then echo "Backup: $backup"; fi
