param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$PostgresBin,
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [Parameter(Mandatory=$true)][string]$ServiceName,
  [Parameter(Mandatory=$true)][switch]$ConfirmStopApplication
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmStopApplication -or $ServiceName -notmatch '^[A-Za-z0-9_-]+$') { throw 'Explicit service and stop confirmation required' }
& "$PSScriptRoot\Test-FridayStaging.ps1" -EnvironmentFile $EnvironmentFile -NodePath $NodePath -PostgresBin $PostgresBin
if (-not [IO.Path]::IsPathRooted($BackupRoot)) { throw 'Absolute backup root required' }
$oldPath = $env:PATH
$env:PATH = $PostgresBin + [IO.Path]::PathSeparator + $oldPath
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
try {
  & $NodePath scripts/check-runtime.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Node 22 runtime check failed' }
  if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf) -or -not (Test-Path -LiteralPath $BackupRoot -PathType Container)) { throw 'Existing private environment/backup paths required' }
  $service = Get-Service -Name $ServiceName
  if ($service.Status -ne 'Running') { throw 'Backup requires the selected staging service to be Running; do not restart an intentionally stopped instance' }
  Stop-Service -InputObject $service
  $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Stopped, [TimeSpan]::FromSeconds(30))
  $destination = Join-Path $BackupRoot ('daily-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N'))
  & $NodePath "--env-file=$EnvironmentFile" dist/server/operations/main.js backup $destination --confirm-local-maintenance
  if ($LASTEXITCODE -ne 0) { throw 'Backup failed: keep service stopped and inspect maintenance ownership' }
  & $NodePath dist/server/operations/main.js verify $destination --confirm-local-maintenance
  if ($LASTEXITCODE -ne 0) { throw 'Verification failed: keep service stopped for review' }
  Start-Service -InputObject $service
  # Owner schedules daily and keeps 7 daily + 4 weekly snapshots, plus verified off-disk copy.
  # No automatic pruning or task/service installation; retain only after a successful restore rehearsal.
} finally { $env:PATH = $oldPath; Pop-Location }
