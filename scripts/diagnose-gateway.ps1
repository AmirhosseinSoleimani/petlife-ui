#Requires -Version 5.1
<#
Read-only diagnosis of the PetLifeAU frontend -> Nginx -> Gateway -> Users path.
Run on Windows: .\scripts\diagnose-gateway.ps1
Only one SSH connection is used. The server configuration is NOT modified.
Results are saved to a local temporary text file for sharing.
No user credentials or actual login/registration data are submitted.
#>
[CmdletBinding()]
param(
    [string]$Server = '172.16.4.63',
    [string]$SshUser = 'root'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($Server -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,253}$' -or
    $SshUser -notmatch '^[A-Za-z_][A-Za-z0-9_-]{0,31}$') {
    throw 'Invalid server or SSH username.'
}
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw 'OpenSSH client (ssh) was not found on this Windows computer.'
}

# This script is embedded and sent through SSH without creating files on the server.
$remoteScript = @'
set -u
host="$1"
echo "=== PETLIFEAU GATEWAY DIAGNOSIS (READ ONLY) ==="
echo "Host: $host"
echo "UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo

echo "[1] SERVICES AND LISTENING PORTS"
if command -v systemctl >/dev/null 2>&1; then
  for service in nginx petlife-gateway petlife-users; do
    state="$(systemctl is-active "$service" 2>/dev/null || true)"
    printf '%s: %s\n' "$service" "$state"
  done
else
  echo "systemctl unavailable"
fi
if command -v ss >/dev/null 2>&1; then
  ss -ltn | awk 'NR == 1 || $4 ~ /:(80|443|5300|5311)$/ {print}'
else
  echo "ss unavailable"
fi
echo

echo "[2] NGINX CONFIGURATION SYNTAX AND ROUTING DIRECTIVES"
if command -v nginx >/dev/null 2>&1; then
  nginx -t 2>&1 | tail -n 3
  echo "Selected directives from effective nginx configuration (no full config or secrets):"
  nginx -T 2>/dev/null |
    awk '/^# configuration file / || /^[[:space:]]*(listen|server_name|location|proxy_pass|root|try_files|rewrite)[[:space:]]/ { print NR ": " $0 }' |
    sed -E 's#(https?://)[^/@[:space:]]+:[^/@[:space:]]+@#\1[redacted]@#g' |
    sed -n '1,150p'
else
  echo "nginx binary unavailable"
fi
echo

echo "[3] SAFE HTTP PROBES (EMPTY JSON ONLY; NO USER CREDENTIALS)"
if ! command -v curl >/dev/null 2>&1; then
  echo "curl unavailable; HTTP probes skipped."
  exit 0
fi

scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
probe() {
  label="$1"
  method="$2"
  endpoint="$3"
  host_header="$4"
  : > "$scratch/headers"
  : > "$scratch/body"
  if [ "$method" = "POST" ]; then
    code="$(curl -sS --max-time 8 --connect-timeout 3 \
      --dump-header "$scratch/headers" --output "$scratch/body" \
      --write-out '%{http_code}' -H "Host: $host_header" \
      -H 'Content-Type: application/json' --data '{}' \
      "$endpoint" 2>/dev/null)" || code='000'
  else
    code="$(curl -sS --max-time 8 --connect-timeout 3 \
      --dump-header "$scratch/headers" --output "$scratch/body" \
      --write-out '%{http_code}' -H "Host: $host_header" \
      "$endpoint" 2>/dev/null)" || code='000'
  fi
  content_type="$(awk 'tolower($1) == "content-type:" {print $2}' "$scratch/headers" | tr -d '\r' | tail -n 1)"
  served_by="$(awk 'tolower($1) == "server:" {print $2}' "$scratch/headers" | tr -d '\r' | tail -n 1)"
  if [ -z "$content_type" ]; then content_type='unknown'; fi
  if [ -z "$served_by" ]; then served_by='unknown'; fi
  preview="$(head -c 140 "$scratch/body" | tr '\r\n' '  ')"
  printf '%s\n  HTTP=%s  content-type=%s  server=%s\n  body-preview=%s\n' \
    "$label" "$code" "$content_type" "$served_by" "$preview"
}
probe 'Gateway direct: live health' GET 'http://127.0.0.1:5300/health/live' 'localhost'
probe 'Gateway direct: POST login with empty JSON' POST 'http://127.0.0.1:5300/v1/identity/auth/login' 'localhost'
probe 'Gateway direct: POST customer register with empty JSON' POST 'http://127.0.0.1:5300/v1/identity/auth/register/customer' 'localhost'
probe 'Users service direct: POST login with empty JSON' POST 'http://127.0.0.1:5311/v1/identity/auth/login' 'localhost'
probe 'Nginx port 80: GET home' GET 'http://127.0.0.1/' "$host"
probe 'Nginx port 80: POST login with empty JSON' POST 'http://127.0.0.1/v1/identity/auth/login' "$host"
probe 'Nginx port 80: POST customer register with empty JSON' POST 'http://127.0.0.1/v1/identity/auth/register/customer' "$host"
echo
echo "[4] INTERPRETATION"
echo "Gateway 400/401 + Nginx 405 means the port 80 Nginx routing is the primary blocker."
echo "Gateway 404 indicates an absent route/disabled Gateway destination; 502/503 suggests an unavailable upstream."
echo "HTTP 000 means the listener was unreachable; check service/port output above."
echo "No settings were changed; no passwords or real registration payloads were sent."
'@

# Normalize Windows CRLF before executing Bash on Ubuntu.
$crlf = [string][char]13 + [string][char]10
$lf = [string][char]10
$remoteScript = $remoteScript.Replace($crlf, $lf).Replace([string][char]13, '') + $lf
$payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
$target = $SshUser + '@' + $Server
$remoteCommand = "printf %s '$payload' | base64 -d | bash -s -- '$Server'"
$report = Join-Path ([IO.Path]::GetTempPath()) ('petlife-gateway-diagnostic-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')

Write-Host ('Connecting to ' + $target + ' (one SSH session, no server changes).')
Write-Host ('Report will be saved to: ' + $report)
& ssh -T -o ConnectTimeout=12 $target $remoteCommand | Tee-Object -FilePath $report
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    throw ('Remote diagnosis failed (SSH exit ' + $exitCode + '). Report: ' + $report)
}
Write-Host ('Completed. Send the report content or file: ' + $report)
