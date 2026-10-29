#Requires -Version 5.1
<#
Read-only post-login API routing diagnostic (PowerShell on Windows -> one SSH session).
No real credentials, JWTs or passwords are sent; no server configuration is changed.
Run: .\scripts\diagnose-post-login-routing.ps1
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
    throw 'Invalid SSH destination.'
}
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw 'OpenSSH client is required.'
}
$remoteScript = @'
set -u
host="$1"
echo '=== POST-LOGIN API ROUTING DIAGNOSIS (READ ONLY) ==='
echo "UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo '[1] Service states'
for name in nginx petlife-gateway petlife-users petlife-pets petlife-reminders petlife-bookings; do
  state="$(systemctl is-active "$name" 2>/dev/null || true)"
  printf '%-23s %s\n' "$name" "$state"
done

echo
echo '[2] Effective Nginx /v1/ and /api/ destinations'
# This filter prints only routing directives, never environment variables or secrets.
if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | awk '
    /^[[:space:]]*location[[:space:]]+\^~[[:space:]]+\/(api|v1)\// { inblock=1; print; next }
    inblock && /^[[:space:]]*proxy_pass[[:space:]]+/ { print; next }
    inblock && /^[[:space:]]*\}/ { inblock=0 }
  ' | head -n 15
fi
echo
echo '[3] Unauthenticated route probes'
echo 'No Bearer tokens are sent. 401 is normal for protected routes.'
if ! command -v curl >/dev/null 2>&1; then
  echo 'FAIL: curl missing'
  exit 1
fi
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
probe() {
  label="$1"
  base="$2"
  endpoint="$3"
  : > "$tmp/body"
  : > "$tmp/headers"
  code="$(curl --silent --show-error --max-time 7 --connect-timeout 2 \
    -H "Host: $host" -H 'Accept: application/json' \
    --output "$tmp/body" --dump-header "$tmp/headers" \
    --write-out '%{http_code}' "$base$endpoint" 2>/dev/null)" || code='000'
  kind='other'
  if grep -q '"resultCode"' "$tmp/body"; then
    kind='users-envelope'
  elif grep -q '"success"' "$tmp/body" && grep -q '"errors"' "$tmp/body"; then
    kind='legacy-envelope'
  elif grep -q '"success"' "$tmp/body"; then
    kind='service-json'
  elif head -c 60 "$tmp/body" | grep -Eiq '<(!DOCTYPE|html)'; then
    kind='html'
  elif grep -qi 'application/json' "$tmp/headers"; then
    kind='json'
  fi
  printf '%-55s HTTP=%-3s body=%s\n' "$label" "$code" "$kind"
}
probe 'Gateway health (5300)' http://127.0.0.1:5300 /health/live
for path in /api/reminders/upcoming /api/service-requests/my /api/user-preferences/me /api/notifications/unread-count /v1/pets; do
  probe "Nginx $path" http://127.0.0.1 "$path"
  probe "Gateway $path" http://127.0.0.1:5300 "$path"
done
probe 'Pets service direct /v1/pets' http://127.0.0.1:5312 /v1/pets
echo
echo '[4] Interpretation'
echo '- Same path, different Nginx/Gateway response indicates a routing mismatch.'
echo '- Gateway 404 means its active route allowlist lacks that endpoint.'
echo '- Pets 503 must be handled by the Pets read-authority configuration/ownership workflow.'
echo '- No authentication success is proved without a valid JWT (not tested here).'
echo '- No server changes were made.'
'@
$remoteScript = $remoteScript.Replace("`r`n", "`n").Replace("`r", "") + "`n"
$payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
$target = "$SshUser@$Server"
$command = "printf %s '$payload' | base64 -d | bash -s -- '$Server'"
$report = Join-Path ([IO.Path]::GetTempPath()) ('petlife-post-login-routing-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
Write-Host "Running read-only routing checks on $target"
Write-Host "Report: $report"
& ssh -T -o ConnectTimeout=12 $target $command | Tee-Object -FilePath $report
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { throw "Diagnostic failed (SSH exit $exitCode). Report: $report" }
Write-Host "Completed. Send the report (no tokens/passwords): $report"
