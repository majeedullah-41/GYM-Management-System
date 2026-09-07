param(
  [string]$Hwid,
  [string]$Gym,
  [string]$Expires,
  [string]$Customer = ""
)

$ErrorActionPreference = "Stop"
$bin = "D:\RustTarget\release\license-generator.exe"
$key = if ($env:GYM_LICENSE_KEY) { $env:GYM_LICENSE_KEY } else { "C:\Users\SALMAN~1\AppData\Local\Temp\opencode\devkeys\private.key" }
$outDir = Join-Path $PSScriptRoot "..\issued"

if (-not $Hwid) { $Hwid = Read-Host "Hardware ID" }
if (-not $Gym)  { $Gym  = Read-Host "Gym name" }
if (-not $Customer) { $Customer = Read-Host "Customer name (Enter for none)" }
if (-not $Expires)  { $Expires = Read-Host "Expiry (YYYY-MM-DD, Enter for permanent)" }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$slug = ($Gym -replace "[^a-zA-Z0-9]", "-").Trim("-").ToLowerInvariant()
if (-not $slug) { $slug = "license" }
$out = Join-Path $outDir "$slug.gymlic"

$args = @("issue", "--hwid", $Hwid, "--gym", $Gym, "--key", $key)
if ($Customer) { $args += @("--customer", $Customer) }
if ($Expires)  { $args += @("--type", "expiring", "--expires", $Expires) }
else           { $args += @("--type", "permanent") }

& $bin @args --out $out