# ============================================================
# HCL Software Learning Hub — Shared Bundle Helpers (Windows)
#
# Dot-sourced by Install.ps1 / Start.ps1 / Stop.ps1 / Restore-Db.ps1.
# Never run directly.
# ============================================================

$script:HclLibDir    = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$script:HclBundleDir = Split-Path -Parent $script:HclLibDir

function Write-Ok     { param([string]$Message) Write-Host "[ OK ] $Message" -ForegroundColor Green }
function Write-Warn   { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Info   { param([string]$Message) Write-Host "  -> $Message"   -ForegroundColor Cyan }
function Write-Banner {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================"
    Write-Host "  $Message"
    Write-Host "========================================"
}
function Stop-WithError {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    exit 1
}

# ── Load bundle.env into a hashtable and promote it to script scope ──────────
function Import-BundleEnv {
    param([string]$Path = (Join-Path $script:HclBundleDir 'bundle.env'))

    if (-not (Test-Path -LiteralPath $Path)) {
        Stop-WithError "bundle.env not found at $Path"
    }

    $config = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) { continue }
        $key = $trimmed.Substring(0, $idx).Trim()
        $val = $trimmed.Substring($idx + 1).Trim()
        $config[$key] = $val
        Set-Variable -Name $key -Value $val -Scope Global -Force
    }
    return $config
}

# ── Detect an available container runtime ────────────────────────────────────
# Sets global $CRT (command) and $CRT_KIND (docker|podman).
function Find-ContainerRuntime {
    foreach ($candidate in @('docker', 'podman')) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        & $candidate info *> $null
        if ($LASTEXITCODE -eq 0) {
            Set-Variable -Name CRT      -Value $candidate -Scope Global -Force
            Set-Variable -Name CRT_KIND -Value $candidate -Scope Global -Force
            return $true
        }
    }
    return $false
}

function Test-ContainerExists {
    param([string]$Name)
    $names = & $global:CRT ps -a --format '{{.Names}}' 2>$null
    return ($names -split "`n" | ForEach-Object { $_.Trim() }) -contains $Name
}

function Test-ContainerRunning {
    param([string]$Name)
    $names = & $global:CRT ps --format '{{.Names}}' 2>$null
    return ($names -split "`n" | ForEach-Object { $_.Trim() }) -contains $Name
}

function Wait-ForPostgres {
    param([int]$Attempts = 60)
    for ($i = 0; $i -lt $Attempts; $i++) {
        & $global:CRT exec $global:DB_CONTAINER pg_isready -U $global:DB_USER -d $global:DB_NAME *> $null
        if ($LASTEXITCODE -eq 0) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-ForHttp {
    param([int]$Port, [int]$Attempts = 45)
    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5 | Out-Null
            return $true
        } catch { Start-Sleep -Seconds 2 }
    }
    return $false
}

# ── Credentials file helpers (KEY=VALUE, same shape as the Linux installer) ──
function Read-Credential {
    param([string]$Key, [string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match "^$([regex]::Escape($Key))=(.*)$") { return $Matches[1] }
    }
    return $null
}

function New-RandomHex {
    param([int]$Bytes = 16)
    $buffer = New-Object 'System.Byte[]' $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ([System.BitConverter]::ToString($buffer) -replace '-', '').ToLower()
}

function Test-IsAdministrator {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
