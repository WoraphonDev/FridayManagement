# Offline readiness checks only; never installs services or changes ACL/network.
param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$PostgresBin
)
$ErrorActionPreference = 'Stop'
foreach ($path in @($EnvironmentFile, $NodePath, $PostgresBin)) {
  if (-not [IO.Path]::IsPathRooted($path) -or -not (Test-Path -LiteralPath $path)) { throw 'Existing absolute config/runtime/PostgreSQL paths required' }
}
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
try {
  & $NodePath scripts/check-runtime.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Dedicated Node 22 runtime check failed' }
  $oldPath = $env:PATH
  try {
    $env:PATH = $PostgresBin + [IO.Path]::PathSeparator + $oldPath
    & $NodePath "--env-file=$EnvironmentFile" scripts/windows/preflight.mjs $EnvironmentFile $PostgresBin
    if ($LASTEXITCODE -ne 0) { throw 'Staging preflight failed' }
  } finally { $env:PATH = $oldPath }
} finally { Pop-Location }
