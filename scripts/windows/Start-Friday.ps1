# Foreground launcher for an owner-managed Windows service wrapper or isolated staging console.
# Does not install services, modify IIS/ACL/DNS, or bypass FOUNDATION_NOT_PRODUCTION_READY.
param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$NodePath
)
$ErrorActionPreference = 'Stop'
if (-not [IO.Path]::IsPathRooted($EnvironmentFile) -or -not [IO.Path]::IsPathRooted($NodePath)) { throw 'Absolute environment and dedicated Node paths required' }
if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf) -or -not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { throw 'Environment or Node executable missing' }
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
try {
  if (-not (Test-Path -LiteralPath 'dist/server/api/main.js' -PathType Leaf) -or -not (Test-Path -LiteralPath 'dist/frontend/index.html' -PathType Leaf)) { throw 'Build application before starting' }
  & $NodePath scripts/check-runtime.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Node 22 runtime check failed' }
  & $NodePath "--env-file=$EnvironmentFile" dist/server/api/main.js
  $result = $LASTEXITCODE
} finally { Pop-Location }
exit $result
