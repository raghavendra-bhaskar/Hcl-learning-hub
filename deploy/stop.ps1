param(
  [switch]$WithDb
)

$runtimePath = Join-Path $PSScriptRoot 'runtime.ps1'
. $runtimePath

$config = Get-HubConfig
$installDir = $config['INSTALL_DIR']
$uiPort = [int]$config['UI_PORT']
$apiPort = [int]$config['API_PORT']
$pidFile = Join-Path $installDir 'run\hub.pid'

Show-Banner "Stopping $($config['APP_NAME'])"
$stopped = $false

if (Test-Path -LiteralPath $pidFile) {
  $pidValue = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
    Write-Info "Stopping process tree rooted at PID $pidValue"
    Start-Process -FilePath taskkill.exe -ArgumentList '/PID', $pidValue, '/T', '/F' -NoNewWindow -Wait | Out-Null
    $stopped = $true
    Write-Ok 'Application process tree stopped'
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Stop-PortProcesses -Ports @($uiPort, $apiPort)
if (-not $stopped) { Write-Info 'Nothing was running' }
if ($WithDb) {
  Write-WarnLine 'Database stop is not automated on Windows. Stop the PostgreSQL service manually if required.'
}
Write-Ok 'Stopped. All data is intact.'
