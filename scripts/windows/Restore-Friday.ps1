# Isolated rehearsal only. Never switches config or starts a service.
param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$PostgresBin,
  [Parameter(Mandatory=$true)][string]$ServiceName,
  [Parameter(Mandatory=$true)][string]$TargetDirectory,
  [Parameter(Mandatory=$true)][switch]$ConfirmIsolatedRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmIsolatedRestore -or $ServiceName -notmatch '^[A-Za-z0-9_-]+$' -or -not [IO.Path]::IsPathRooted($TargetDirectory)) { throw 'Explicit isolated restore confirmation, exact service and absolute target required' }
$service = Get-Service -Name $ServiceName
if ($service.Status -ne 'Stopped') { throw 'Stop the staging application explicitly before isolated restore' }
& "$PSScriptRoot\Test-FridayStaging.ps1" -EnvironmentFile $EnvironmentFile -NodePath $NodePath -PostgresBin $PostgresBin
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$oldPath = $env:PATH
Push-Location $projectRoot
try {
  $env:PATH = $PostgresBin + [IO.Path]::PathSeparator + $oldPath
  # File must set FRIDAY_RESTORE_SOURCE plus DATA_DIR matching TargetDirectory and a separate empty *_staging DB.
  & $NodePath "--env-file=$EnvironmentFile" dist/server/operations/main.js restore-postgres $TargetDirectory --confirm-local-maintenance
  if ($LASTEXITCODE -ne 0) { throw 'Isolated restore failed; leave services stopped and inspect target, never retry into a partially restored target' }
} finally { $env:PATH = $oldPath; Pop-Location }
