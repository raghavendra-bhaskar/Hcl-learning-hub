param(
  [switch]$Foreground
)

$runtimePath = Join-Path $PSScriptRoot 'runtime.ps1'
. $runtimePath

$config = Get-HubConfig
$installDir = $config['INSTALL_DIR']
$uiPort = [int]$config['UI_PORT']
$apiPort = [int]$config['API_PORT']
$appName = $config['APP_NAME']
$serverFqdn = $config['SERVER_FQDN']
$logDir = Join-Path $installDir 'logs'
$runDir = Join-Path $installDir 'run'
$pidFile = Join-Path $runDir 'hub.pid'
$logFile = Join-Path $logDir 'hub.log'

Ensure-Directory $logDir
Ensure-Directory $runDir
Show-Banner "Starting $appName"
Test-NodeVersion

if ((Test-Path -LiteralPath (Join-Path $runDir 'hub.pid'))) {
  $existingPid = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
    Write-WarnLine "Already running (PID $existingPid). Use deploy\\stop.cmd first."
    exit 0
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath (Join-Path $installDir 'node_modules'))) { Fail-Step 'node_modules missing. Run deploy\install.cmd or npm install.' }
if (-not (Test-Path -LiteralPath (Join-Path $installDir 'server\node_modules'))) { Fail-Step 'server\node_modules missing. Run deploy\install.cmd or npm install --prefix server.' }
if (-not (Test-Path -LiteralPath (Join-Path $installDir 'server\.env'))) { Fail-Step 'server/.env missing. Run deploy\install.cmd first.' }

Stop-PortProcesses -Ports @($apiPort, $uiPort)

if ($Foreground) {
  Write-Info 'Running in foreground. Press Ctrl+C to stop.'
  Push-Location $installDir
  try {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npmCmd = if ($npmCommand) { $npmCommand.Source } else { $null }
    if (-not $npmCmd) { $npmCmd = (Get-Command npm -ErrorAction Stop).Source }
    & $npmCmd 'run' 'dev'
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

$command = "cd /d `"$installDir`" && npm run dev >> `"$logFile`" 2>&1"
$process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c',$command -WorkingDirectory $installDir -WindowStyle Hidden -PassThru
$process.Id | Set-Content -LiteralPath $pidFile -Encoding ASCII
Write-Ok "Launched (PID $($process.Id)), logging to $logFile"

$apiUp = Wait-ForTcpPort -TargetHost '127.0.0.1' -Port $apiPort -TimeoutSeconds 90
if ($apiUp) { Write-Ok 'API is responding' } else { Write-WarnLine 'API did not respond yet' }
$uiUp = Wait-ForTcpPort -TargetHost '127.0.0.1' -Port $uiPort -TimeoutSeconds 90
if ($uiUp) { Write-Ok 'UI is responding' } else { Write-WarnLine 'UI did not respond yet' }

if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $logFile) { Get-Content -LiteralPath $logFile -Tail 30 }
  Fail-Step "The Hub exited during startup. Full log: $logFile"
}

Show-Banner 'Running'
Write-Host ""
Write-Ok "Application : https://$serverFqdn`:$uiPort"
Write-Ok "API health  : https://$serverFqdn`:$apiPort/health"
Write-Ok "Logs        : Get-Content -Wait '$logFile'"
Write-Ok "Stop        : deploy\\stop.cmd"
Write-Host ""
