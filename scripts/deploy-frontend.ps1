#Requires -Version 5.1
<#
Build locally, upload to Ubuntu, and atomically replace /var/www/petlife.
Runs only from a clean, up-to-date develop checkout. No Docker or CI.
Requires SSH/SCP, Node/npm, and rsync on the target.
#>
[CmdletBinding()]
param(
  [string]$Server = "172.16.4.63",
  [string]$SshUser = "root"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
function Invoke-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File failed with exit code $LASTEXITCODE" }
}
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
try {
  if ($Server -notmatch '^[A-Za-z0-9.-]+$' -or $SshUser -notmatch '^[A-Za-z0-9_-]+$') {
    throw "Invalid server or SSH username."
  }
  if ((git branch --show-current).Trim() -ne "develop") { throw "Switch to develop first." }
  if (git status --porcelain) { throw "Working tree must be clean." }
  Invoke-Native "git" @("fetch", "origin", "develop")
  $localHead = (git rev-parse HEAD).Trim()
  $remoteHead = (git rev-parse origin/develop).Trim()
  if ($localHead -ne $remoteHead) { throw "Local develop must match origin/develop. Run git pull --ff-only." }
  Invoke-Native "npm" @("ci")
  Invoke-Native "npm" @("run", "build", "--", "--configuration", "production")
  $dist = Join-Path $root "dist/petlife-ui"
  if (!(Test-Path (Join-Path $dist "index.html"))) { throw "Angular build output missing index.html." }
  $archive = Join-Path $env:TEMP ("petlife-ui-" + [guid]::NewGuid().ToString("N") + ".tar.gz")
  $remote = "$SshUser@$Server"
  try {
    Invoke-Native "tar" @("-czf", $archive, "-C", $dist, ".")
    Invoke-Native "scp" @($archive, ($remote + ":/tmp/petlife-ui-release.tar.gz"))
    $deployScript = @'
set -Eeuo pipefail
target=/var/www/petlife
archive=/tmp/petlife-ui-release.tar.gz
test -s "$archive"
command -v rsync >/dev/null
command -v nginx >/dev/null
test -d "$target"
test ! -L "$target"
stage=$(mktemp -d /var/www/.petlife-stage.XXXXXXXX)
backup=$(mktemp -d /var/www/.petlife-backup.XXXXXXXX)
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT
tar -xzf "$archive" -C "$stage" --no-same-owner --no-same-permissions
test -s "$stage/index.html"
test -d "$stage"
# Refuse to touch a directory that contains backend/runtime state.
for protected in .env uploads storage services database; do
  if test -e "$target/$protected"; then
    echo "Protected path in web root: $protected; aborting" >&2
    exit 1
  fi
done
nginx -t
rsync -a --delete -- "$target/" "$backup/"
# Exclude nginx/server config files if present from deletion.
rsync -a --delete -- "$stage/" "$target/"
if ! nginx -t; then
  rsync -a --delete -- "$backup/" "$target/"
  echo "Nginx config failed: restored previous frontend" >&2
  exit 1
fi
echo "Frontend deployed. Backup at $backup"
'@
    # A Windows checkout may turn the Bash here-string into CRLF. Bash requires LF.
    # Normalize before base64 encoding; do not rely on Git's line-ending settings.
    $deployScript = $deployScript.Replace("`r`n", "`n").Replace("`r", "")
    $payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($deployScript + "`n"))
    Invoke-Native "ssh" @($remote, ("printf %s " + $payload + " | base64 -d | bash"))
    Write-Host ("Deployed frontend to " + $remote + ":/var/www/petlife")
  }
  finally { Remove-Item -Force -ErrorAction SilentlyContinue $archive }
}
finally { Pop-Location }
