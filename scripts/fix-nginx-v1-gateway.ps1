#Requires -Version 5.1
[CmdletBinding()]
param([string]$Server='172.16.4.63',[string]$SshUser='root')
$ErrorActionPreference='Stop'
if($Server -notmatch '^[A-Za-z0-9.-]+$' -or $SshUser -notmatch '^[A-Za-z0-9_-]+$'){throw 'Invalid SSH destination'}
$bash=@'
set -Eeuo pipefail
host="$1"
active=/etc/nginx/sites-enabled/petlife
real="$(readlink -f "$active")"
case "$real" in /etc/nginx/*) ;; *) echo "Unexpected Nginx path"; exit 1;; esac
nginx -t
test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5300/health/live)" = 200
probe() {
  curl -s --max-time 8 -H "Host: $host" -H 'Content-Type: application/json' -d '{}' -o "$tmp/body" -w '%{http_code}' "$1"
}
tmp="$(mktemp -d)"
backup=""
changed=0
cleanup() {
  code=$?
  trap - EXIT
  if test "$code" -ne 0 && test "$changed" -eq 1; then
    echo "ROLLBACK: restoring $backup"
    cp -p "$backup" "$real"
    nginx -t && systemctl reload nginx || true
  fi
  rm -rf "$tmp"
  exit "$code"
}
trap cleanup EXIT
before="$(probe http://127.0.0.1/v1/identity/auth/login)"
if test "$before" = 400 && grep -q '"success":false' "$tmp/body"; then
  echo 'Already configured, no changes made'
  exit 0
fi
test "$before" = 405 || { echo "Unexpected initial HTTP $before; aborting"; exit 1; }
direct="$(curl -s --max-time 8 -H 'Content-Type: application/json' -d '{}' -o "$tmp/direct" -w '%{http_code}' http://127.0.0.1:5300/v1/identity/auth/login)"
test "$direct" = 400 && grep -q '"success":false' "$tmp/direct" || { echo 'Gateway precheck failed'; exit 1; }
mkdir -p /var/backups/petlife-nginx-v1
backup="/var/backups/petlife-nginx-v1/petlife.$(date -u +%Y%m%dT%H%M%SZ).$$"
cp -p "$real" "$backup"
chmod 600 "$backup"
changed=1
python3 - "$real" <<'PY'
import pathlib,re,sys,os,tempfile,stat
path=pathlib.Path(sys.argv[1]); text=path.read_text()
if re.search(r'(?m)^\s*location\s+(?:\^~\s+)?/v1/',text): raise SystemExit('Existing /v1/ location; refusing duplicate')
roots=list(re.finditer(r'(?m)^[ \t]*root\s+/var/www/petlife\s*;',text))
if len(roots)!=1: raise SystemExit('Unexpected frontend root')
root=roots[0]; blocks=list(re.finditer(r'(?m)^[ \t]*server\s*\{',text[:root.start()]))
if not blocks or not re.search(r'(?m)^\s*listen\s+80\s+default_server\s*;',text[blocks[-1].end():root.start()]): raise SystemExit('Unexpected server block')
snippet='''

    # PetLifeAU Users Gateway route
    location ^~ /v1/ {
        proxy_pass http://127.0.0.1:5300;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
'''
s=path.stat(); fd,name=tempfile.mkstemp(dir=str(path.parent),prefix='.petlife-v1-')
try:
    with os.fdopen(fd,'w') as f:f.write(text[:root.end()]+snippet+text[root.end():])
    os.chmod(name,stat.S_IMODE(s.st_mode));os.chown(name,s.st_uid,s.st_gid);os.replace(name,path)
finally:
    if os.path.exists(name):os.unlink(name)
PY
nginx -t
systemctl reload nginx
for route in login register/customer; do
  code="$(probe "http://127.0.0.1/v1/identity/auth/$route")"
  echo "$route HTTP $code"
  test "$code" = 400 && grep -q '"success":false' "$tmp/body"
done
home="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" http://127.0.0.1/)"
test "$home" = 200
changed=0
echo "SUCCESS: /v1/ forwards to Gateway. Backup: $backup"
echo "Existing /api/ and /uploads/ were not modified."
'@
$bash=$bash.Replace("`r`n","`n").Replace("`r","")+"`n"
$payload=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bash))
$target="$SshUser@$Server"
$cmd="printf %s '$payload' | base64 -d | bash -s -- '$Server'"
& ssh -T -o ConnectTimeout=12 $target $cmd
if($LASTEXITCODE -ne 0){throw "Gateway Nginx repair failed (SSH exit $LASTEXITCODE)"}
