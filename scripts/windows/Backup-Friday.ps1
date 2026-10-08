param(
  [Parameter(Mandatory=$true)][string]$EnvironmentFile,
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [Parameter(Mandatory=$true)][string]$ServiceName,
  [Parameter(Mandatory=$true)][switch]$ConfirmStopApplication
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmStopApplication -or $ServiceName -match '[*?]') { throw 'Explicit service and stop confirmation required' }
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
try {
  & node scripts/check-runtime.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Node 22 runtime check failed' }
  if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf) -or -not (Test-Path -LiteralPath $BackupRoot -PathType Container)) { throw 'Existing private environment/backup paths required' }
  $service = Get-Service -Name $ServiceName
  Stop-Service -InputObject $service
  $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Stopped, [TimeSpan]::FromSeconds(30))
  $destination = Join-Path $BackupRoot ('daily-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N'))
  & node "--env-file=$EnvironmentFile" dist/server/operations/main.js backup $destination --confirm-local-maintenance
  if ($LASTEXITCODE -ne 0) { throw 'Backup failed: keep service stopped and inspect maintenance ownership' }
  & node dist/server/operations/main.js verify $destination --confirm-local-maintenance
  if ($LASTEXITCODE -ne 0) { throw 'Verification failed: keep service stopped for review' }
  Start-Service -InputObject $service
  # Owner schedules daily and keeps 7 daily + 4 weekly snapshots, plus verified off-disk copy.
  # No automatic pruning or task/service installation; retain only after a successful restore rehearsal.
} finally { Pop-Location }
