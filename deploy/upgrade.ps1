param(
  [string]$Version = '3',
  [string]$Restore = 'latest',
  [switch]$CodeOnly,
  [switch]$NoRestart,
  [switch]$NoBackup
)

$args = @()
if ($Version) { $args += @('-Version', $Version) }
if ($CodeOnly) {
  $args += '-CodeOnly'
} else {
  if ($Restore) { $args += @('-Restore', $Restore) }
  if ($NoBackup) { $args += '-NoBackup' }
}
if ($NoRestart) { $args += '-NoRestart' }

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'sync.ps1') @args
exit $LASTEXITCODE
