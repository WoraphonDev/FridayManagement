# Foreground only; production guard remains unchanged.
param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$PostgresBin
)
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\Test-FridayStaging.ps1" -EnvironmentFile $EnvironmentFile -NodePath $NodePath -PostgresBin $PostgresBin
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
$oldPath = $env:PATH
try {
  $env:PATH = $PostgresBin + [IO.Path]::PathSeparator + $oldPath
  & $NodePath "--env-file=$EnvironmentFile" dist/server/api/main.js
  $result = $LASTEXITCODE
} finally { $env:PATH = $oldPath; Pop-Location }
exit $result
