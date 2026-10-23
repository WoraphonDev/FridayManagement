param([Parameter(Mandatory=$true)][string]$TemporaryRoot)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$root = Join-Path $TemporaryRoot ('Friday tooling ' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$node = Join-Path $root 'fake node.ps1'
Set-Content -LiteralPath $node -Value @'
$global:Calls.Add('node:' + ($args -join '|'))
$global:LASTEXITCODE = 0
if ($args -contains $global:FailAction) { $global:LASTEXITCODE = 17 }
'@
$config = Join-Path $root 'private.env'
Set-Content -LiteralPath $config -Value 'synthetic test only'
$bin = Join-Path $root 'Postgres bin'
$backups = Join-Path $root 'Backups'
New-Item -ItemType Directory -Path $bin,$backups | Out-Null
function global:Get-Service { param($Name) $global:Service }
function global:Stop-Service { param($InputObject) $global:Calls.Add('stop'); $InputObject.Status = 'Stopped' }
function global:Start-Service { param($InputObject) $global:Calls.Add('start'); $InputObject.Status = 'Running' }
function Assert-True($Value, $Message) { if (-not $Value) { throw $Message } }
$script:passed = 0
$script:failed = 0
function Case($Name, [scriptblock]$Test) {
  $global:Calls = [Collections.Generic.List[string]]::new()
  $global:FailAction = '__none__'
  $global:Service = [pscustomobject]@{ Status = 'Running' }
  $global:Service | Add-Member ScriptMethod WaitForStatus { param($Status,$Timeout) }
  try { & $Test; $script:passed++; Write-Output "PASS $Name" }
  catch { $script:failed++; Write-Output "FAIL $Name : $($_.Exception.Message)" }
}
$common = @{ EnvironmentFile=$config; NodePath=$node; PostgresBin=$bin; BackupRoot=$backups; ServiceName='FridayStaging'; ConfirmStopApplication=$true }
try {
  Case 'stopped service is rejected without restart' {
    $global:Service.Status = 'Stopped'
    $rejected = $false
    try { & "$repo/scripts/windows/Backup-Friday.ps1" @common } catch { $rejected = $true }
    Assert-True $rejected 'Backup must reject an already stopped service'
    Assert-True (-not $global:Calls.Contains('start')) 'Must not start an intentionally stopped service'
  }
  Case 'wildcard service names are rejected' {
    $c = $common.Clone(); $c.ServiceName='Friday[12]'
    $rejected = $false
    try { & "$repo/scripts/windows/Backup-Friday.ps1" @c } catch { $rejected = $true }
    Assert-True $rejected 'Wildcard must be rejected'
    Assert-True (-not $global:Calls.Contains('stop')) 'Must not stop wildcard service'
  }
  Case 'successful backup verifies before restart and quotes paths' {
    & "$repo/scripts/windows/Backup-Friday.ps1" @common
    Assert-True ($global:Calls.Contains('stop') -and $global:Calls.Contains('start')) 'Stop/restart required'
    $backupIndex = $global:Calls.FindIndex([Predicate[string]]{param($x) $x -match '\|backup\|'})
    $verifyIndex = $global:Calls.FindIndex([Predicate[string]]{param($x) $x -match '\|verify\|'})
    Assert-True ($backupIndex -gt $global:Calls.IndexOf('stop') -and $verifyIndex -gt $backupIndex -and $global:Calls.IndexOf('start') -gt $verifyIndex) 'Wrong backup/verify/restart order'
    Assert-True ($global:Calls[$backupIndex].Contains("--env-file=$config|")) 'Config path must be one argument'
    Assert-True ($global:Calls[$backupIndex].EndsWith('|--confirm-local-maintenance')) 'Exact CLI confirmation missing'
  }
  foreach ($action in @('backup','verify')) {
    Case "$action failure leaves service stopped and restores PATH" {
      $global:FailAction = $action
      $before = $env:PATH
      $rejected = $false
      try { & "$repo/scripts/windows/Backup-Friday.ps1" @common } catch { $rejected = $true }
      Assert-True $rejected 'Native failure must propagate'
      Assert-True (-not $global:Calls.Contains('start')) 'Failed backup must not restart'
      Assert-True ($env:PATH -eq $before) 'PATH leaked'
    }
  }
  Case 'restore requires stopped service and invokes exact isolated CLI' {
    $global:Service.Status = 'Stopped'
    & "$repo/scripts/windows/Restore-Friday.ps1" -EnvironmentFile $config -NodePath $node -PostgresBin $bin -ServiceName 'FridayStaging' -TargetDirectory $backups -ConfirmIsolatedRestore
    Assert-True ($global:Calls.Exists([Predicate[string]]{param($x) $x.EndsWith("|restore-postgres|$backups|--confirm-local-maintenance")})) 'Exact restore CLI missing'
    Assert-True (-not $global:Calls.Contains('start')) 'Restore must never cut over/restart automatically'
  }
} finally { Remove-Item -LiteralPath $root -Recurse -Force }
Write-Output "Tooling results: $script:passed passed / $script:failed failed (mock SCM; not Windows acceptance)"
if ($script:failed -ne 0) { exit 1 }
