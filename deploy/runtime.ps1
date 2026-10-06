Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Ok { param([string]$Message) Write-Host "[ OK ] $Message" -ForegroundColor Green }
function Write-WarnLine { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "  -> $Message" -ForegroundColor Cyan }
function Fail-Step { param([string]$Message) Write-Host "[FAIL] $Message" -ForegroundColor Red; exit 1 }
function Show-Banner { param([string]$Message) Write-Host "`n========================================"; Write-Host "  $Message"; Write-Host "========================================" }

function Get-ScriptRoot {
  Split-Path -Parent $PSScriptRoot
}

function Read-KeyValueFile {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $index = $trimmed.IndexOf('=')
    if ($index -lt 1) { continue }
    $key = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $result[$key] = $value
  }
  return $result
}

function Write-KeyValueFile {
  param(
    [string]$Path,
    [hashtable]$Values
  )
  $lines = foreach ($key in $Values.Keys) {
    "$key=$($Values[$key])"
  }
  Set-Content -LiteralPath $Path -Value ($lines -join [Environment]::NewLine) -Encoding UTF8
}

function Merge-Config {
  param(
    [hashtable]$Primary,
    [hashtable]$Fallback
  )
  $merged = @{}
  foreach ($key in $Fallback.Keys) { $merged[$key] = $Fallback[$key] }
  foreach ($key in $Primary.Keys) { $merged[$key] = $Primary[$key] }
  return $merged
}

function Get-InstallDir {
  Split-Path -Parent $PSScriptRoot
}

function Get-HubConfig {
  $installDir = Get-InstallDir
  $hubEnv = Read-KeyValueFile (Join-Path $installDir 'deploy\hub.env')
  $creds = Read-KeyValueFile (Join-Path $installDir '.deploy-credentials')
  $combined = Merge-Config -Primary $creds -Fallback $hubEnv
  if (-not $combined['INSTALL_DIR']) { $combined['INSTALL_DIR'] = $installDir }
  if (-not $combined['UI_PORT']) { $combined['UI_PORT'] = '5173' }
  if (-not $combined['API_PORT']) { $combined['API_PORT'] = '4000' }
  if (-not $combined['DB_HOST']) { $combined['DB_HOST'] = '127.0.0.1' }
  if (-not $combined['DB_PORT']) { $combined['DB_PORT'] = '5432' }
  if (-not $combined['DB_NAME']) { $combined['DB_NAME'] = 'hclhub' }
  if (-not $combined['DB_USER']) { $combined['DB_USER'] = 'hcluser' }
  if (-not $combined['SERVER_FQDN']) { $combined['SERVER_FQDN'] = $env:COMPUTERNAME }
  if (-not $combined['APP_NAME']) { $combined['APP_NAME'] = 'hcl-learning-hub' }
  return $combined
}

function Get-PgTooling {
  $candidates = @()
  if ($env:PG_BIN -and (Test-Path -LiteralPath $env:PG_BIN)) { $candidates += $env:PG_BIN }
  $pgRoot = 'C:\Program Files\PostgreSQL'
  if (Test-Path -LiteralPath $pgRoot) {
    $candidates += Get-ChildItem -LiteralPath $pgRoot -Directory -ErrorAction SilentlyContinue |
      Sort-Object { [version]$_.Name } -Descending |
      ForEach-Object { Join-Path $_.FullName 'bin' }
  }
  $pgDumpCmd = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
  if ($pgDumpCmd) { $candidates += (Split-Path -Parent $pgDumpCmd.Source) }
  $selected = $null
  foreach ($candidate in $candidates | Select-Object -Unique) {
    if (Test-Path -LiteralPath (Join-Path $candidate 'pg_dump.exe')) {
      $selected = $candidate
      break
    }
  }
  if ($selected) {
    return @{
      Bin = $selected
      PgDump = (Join-Path $selected 'pg_dump.exe')
      PgRestore = (Join-Path $selected 'pg_restore.exe')
      Psql = (Join-Path $selected 'psql.exe')
    }
  }
  return @{
    Bin = ''
    PgDump = 'pg_dump.exe'
    PgRestore = 'pg_restore.exe'
    Psql = 'psql.exe'
  }
}

function Parse-DatabaseUrl {
  param([string]$DatabaseUrl)
  if (-not $DatabaseUrl) { Fail-Step 'DATABASE_URL is required.' }
  $uri = [uri]$DatabaseUrl
  $userInfo = $uri.UserInfo.Split(':', 2)
  return @{
    Host = $uri.Host
    Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    User = if ($userInfo.Length -ge 1) { [uri]::UnescapeDataString($userInfo[0]) } else { '' }
    Password = if ($userInfo.Length -ge 2) { [uri]::UnescapeDataString($userInfo[1]) } else { '' }
    Database = $uri.AbsolutePath.TrimStart('/')
    Url = $DatabaseUrl
  }
}

function Assert-Command {
  param([string]$CommandName, [string]$Hint)
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Fail-Step "$CommandName not found. $Hint"
  }
}

function Test-NodeVersion {
  Assert-Command -CommandName 'node' -Hint 'Install Node.js 20 or newer.'
  $versionText = (& node -v).Trim()
  $major = [int](($versionText -replace '^v', '').Split('.')[0])
  if ($major -lt 20) {
    Fail-Step "Node.js 20 or newer is required. Found $versionText"
  }
  Write-Ok "Node.js detected: $versionText"
}

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-FreePortPids {
  param([int]$Port)
  $lines = & netstat -ano -p tcp | Select-String -Pattern ":$Port\s" | ForEach-Object { $_.ToString() }
  $processIds = @()
  foreach ($line in $lines) {
    $parts = ($line -replace '^\s+', '') -split '\s+'
    if ($parts.Length -ge 5) {
      $processId = $parts[-1]
      if ($processId -match '^\d+$') { $processIds += [int]$processId }
    }
  }
  return $processIds | Select-Object -Unique
}

function Stop-PortProcesses {
  param([int[]]$Ports)
  foreach ($port in $Ports) {
    $processIds = Get-FreePortPids -Port $port
    foreach ($processId in $processIds) {
      Write-WarnLine "Port $port in use by PID $processId - stopping it"
      Start-Process -FilePath taskkill.exe -ArgumentList '/PID', $processId, '/T', '/F' -NoNewWindow -Wait | Out-Null
    }
  }
}

function Wait-ForTcpPort {
  param(
    [string]$TargetHost,
    [int]$Port,
    [int]$TimeoutSeconds = 90
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $task = $client.ConnectAsync($TargetHost, $Port)
      if ($task.Wait(1500) -and $client.Connected) {
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

function Invoke-Npm {
  param(
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  $npmCmd = if ($npmCommand) { $npmCommand.Source } else { $null }
  if (-not $npmCmd) { $npmCmd = (Get-Command npm -ErrorAction Stop).Source }
  Push-Location $WorkingDirectory
  try {
    & $npmCmd @Arguments
    if ($LASTEXITCODE -ne 0) { Fail-Step "npm $($Arguments -join ' ') failed" }
  } finally {
    Pop-Location
  }
}

function Invoke-PgDump {
  param(
    [string]$PgDumpPath,
    [hashtable]$Database,
    [string]$TargetFile
  )
  $env:PGPASSWORD = $Database.Password
  try {
    & $PgDumpPath '-h' $Database.Host '-p' $Database.Port '-U' $Database.User '-d' $Database.Database '--format=custom' '--no-owner' '--no-acl' '-f' $TargetFile
    return $LASTEXITCODE
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

function Invoke-PgRestoreArchive {
  param(
    [string]$PgRestorePath,
    [hashtable]$Database,
    [string]$SourceFile
  )
  $env:PGPASSWORD = $Database.Password
  try {
    & $PgRestorePath '-h' $Database.Host '-p' $Database.Port '-U' $Database.User '-d' $Database.Database '--clean' '--if-exists' '--no-owner' '--no-acl' $SourceFile
    return $LASTEXITCODE
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

function Invoke-PsqlRestore {
  param(
    [string]$PsqlPath,
    [hashtable]$Database,
    [string]$SourceFile
  )
  $env:PGPASSWORD = $Database.Password
  try {
    & $PsqlPath '-h' $Database.Host '-p' $Database.Port '-U' $Database.User '-d' $Database.Database '--set' 'ON_ERROR_STOP=off' '-f' $SourceFile
    return $LASTEXITCODE
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

function Invoke-PsqlFile {
  param(
    [string]$PsqlPath,
    [string]$DatabaseUrl,
    [string]$Sql
  )
  $temp = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -LiteralPath $temp -Value $Sql -Encoding UTF8
    $env:DATABASE_URL = $DatabaseUrl
    & $PsqlPath $DatabaseUrl -f $temp | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail-Step 'psql execution failed' }
  } finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  }
}
