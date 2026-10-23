$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$files = @(Get-ChildItem -LiteralPath "$repo/scripts/windows" -Filter '*.ps1') + @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1')
foreach ($file in $files) {
  $tokens=$null; $errors=$null
  $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
  if ($errors.Count) { throw "PowerShell syntax failed: $($file.Name)" }
}
foreach ($name in @('FridayStaging.xml','FridayCaddy.xml')) {
  [xml]$config = Get-Content -LiteralPath "$repo/deploy/windows/$name" -Raw
  if ($config.service.log.mode -ne 'none' -or $config.service.startmode -ne 'Manual' -or $config.service.onfailure.action -ne 'none') { throw 'Unsafe wrapper defaults' }
}
[xml]$task = Get-Content -LiteralPath "$repo/deploy/windows/FridayBackupTask.xml" -Raw
if ($task.Task.Settings.Enabled -ne 'false' -or $task.Task.Settings.MultipleInstancesPolicy -ne 'IgnoreNew' -or $task.Task.Actions.Exec.Arguments -notmatch '-ConfirmStopApplication') { throw 'Unsafe scheduled task defaults' }
Write-Output "PowerShell syntax: $($files.Count) files PASS; XML safety: 3 files PASS"
