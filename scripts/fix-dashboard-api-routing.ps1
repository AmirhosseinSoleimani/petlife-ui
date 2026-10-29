#Requires -Version 5.1
<#
Automated, targeted Nginx repair for two dashboard API GET routes.
Run from the frontend repository: .\scripts\fix-dashboard-api-routing.ps1
Reads the companion .sh from the same scripts folder; no manual server work.
#>
[CmdletBinding()]
param([string]$Server='172.16.4.63',[string]$SshUser='root')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($Server -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,253}$' -or
    $SshUser -notmatch '^[A-Za-z_][A-Za-z0-9_-]{0,31}$') { throw 'Invalid SSH destination.' }
$scriptPath = Join-Path $PSScriptRoot 'fix-dashboard-api-routing.sh'
if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) { throw "Missing $scriptPath" }
$bash = [IO.File]::ReadAllText($scriptPath)
$bash = $bash.Replace("`r`n","`n").Replace("`r","")
$payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bash + "`n"))
$target = "$SshUser@$Server"
$remoteCommand = "printf %s '$payload' | base64 -d | bash -s -- '$Server'"
$report = Join-Path ([IO.Path]::GetTempPath()) ('petlife-dashboard-route-fix-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
Write-Host "Running targeted Gateway routing repair on $target"
Write-Host "Report: $report"
& ssh -T -o ConnectTimeout=12 $target $remoteCommand | Tee-Object -FilePath $report
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { throw "Nginx repair FAILED (SSH exit $exitCode). Report: $report" }
Write-Host 'Repair completed. Only two exact API paths were changed.'
