<#
.SYNOPSIS
    HCL Software Learning Hub — Offline (Air-gap) Installer for Windows.

.DESCRIPTION
    Windows equivalent of install.sh. Runs entirely from the bundle produced by
    packaging\build-bundle.ps1: every container image ships inside images\ as a
    tar archive, so no registry, no internet and no npm install are required.

    The script performs all prerequisite checks itself — CPU, RAM, disk, ports,
    container runtime and WSL2 — so nothing has to be verified by hand.

    packaging\build-exe.ps1 compiles this file into hcl-learning-hub-setup.exe.

.PARAMETER InstallDir
    Target directory. Default: C:\Program Files\HCL Learning Hub

.PARAMETER ServerHost
    Public hostname or IP used for CORS and the printed URL. Auto-detected.

.PARAMETER Port
    HTTP port for the UI. Default comes from bundle.env.

.PARAMETER AdminPassword
    Local admin fallback password. Generated when omitted.

.PARAMETER DumpFile
    Database dump to restore. Default: db\backup.dump inside the bundle.

.PARAMETER SkipDbRestore
    Start with an empty database instead of restoring the bundled dump.

.PARAMETER Force
    Recreate containers even if they already exist.

.PARAMETER Yes
    Unattended mode — never prompt.

.EXAMPLE
    .\hcl-learning-hub-setup.exe -Yes

.EXAMPLE
    .\Install.ps1 -Port 8080 -InstallDir D:\HclHub -Yes
#>
[CmdletBinding()]
param(
    [string] $InstallDir    = "$env:ProgramFiles\HCL Learning Hub",
    [string] $ServerHost    = '',
    [int]    $Port          = 0,
    [string] $AdminPassword = '',
    [string] $DumpFile      = '',
    [switch] $SkipDbRestore,
    [switch] $Force,
    [switch] $Yes
)

$ErrorActionPreference = 'Stop'

# When compiled with ps2exe, $PSScriptRoot is empty — fall back to the exe path.
$BundleDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent ([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName) }

. (Join-Path $BundleDir 'lib\Common.ps1')
$null = Import-BundleEnv (Join-Path $BundleDir 'bundle.env')

if ($Port -gt 0) { $global:HTTP_PORT = "$Port" }
if (-not $ServerHost) {
    $ServerHost = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -First 1 -ExpandProperty IPAddress)
}
if (-not $ServerHost) { $ServerHost = 'localhost' }
if (-not $DumpFile)   { $DumpFile = Join-Path $BundleDir 'db\backup.dump' }

Write-Host ""
Write-Host "  HCL Software Learning Hub - Offline Installer" -ForegroundColor White
Write-Host "  ============================================="
Write-Host "  Version : $global:APP_VERSION"
Write-Host "  Bundle  : $BundleDir"
Write-Host "  Install : $InstallDir"
Write-Host "  Access  : http://${ServerHost}:$global:HTTP_PORT"
Write-Host ""

if (-not (Test-IsAdministrator)) {
    Stop-WithError "Run this installer from an elevated prompt (Run as Administrator)."
}

# ── Step 1: Pre-flight ───────────────────────────────────────────────────────
Write-Banner 'Step 1/8: Pre-flight checks'
$preflightOk = $true

$os = Get-CimInstance Win32_OperatingSystem
Write-Ok "OS: $($os.Caption) (build $($os.BuildNumber))"
if ([int]$os.BuildNumber -lt 17763) {
    Write-Warn 'Windows 10 1809 / Server 2019 (build 17763) or newer is required for containers'
    $preflightOk = $false
}

$cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
if ($cores -lt [int]$global:MIN_CPU_CORES) {
    Write-Warn "CPU cores: $cores (minimum $global:MIN_CPU_CORES)"; $preflightOk = $false
} else { Write-Ok "CPU cores: $cores" }

$ramMb = [math]::Round($os.TotalVisibleMemorySize / 1024)
if ($ramMb -lt [int]$global:MIN_RAM_MB) {
    Write-Warn "RAM: ${ramMb}MB (minimum $global:MIN_RAM_MB MB / 4GB)"; $preflightOk = $false
} else { Write-Ok "RAM: ${ramMb}MB" }

$driveLetter = (Split-Path -Qualifier $InstallDir).TrimEnd(':')
$freeGb = [math]::Round((Get-PSDrive -Name $driveLetter).Free / 1GB)
if ($freeGb -lt [int]$global:MIN_DISK_GB) {
    Write-Warn "Free disk on ${driveLetter}: ${freeGb}GB (minimum $global:MIN_DISK_GB GB)"; $preflightOk = $false
} else { Write-Ok "Free disk on ${driveLetter}: ${freeGb}GB" }

foreach ($p in @([int]$global:HTTP_PORT)) {
    $inUse = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
    if ($inUse) { Write-Warn "Port $p is already in use"; $preflightOk = $false }
    else        { Write-Ok "Port $p is free" }
}

$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if ($wsl) { Write-Ok 'WSL is available (required by Docker Desktop backend)' }
else      { Write-Warn 'WSL not found — Docker Desktop needs WSL2 or Hyper-V enabled' }

if (-not $preflightOk -and -not $Yes) {
    $answer = Read-Host '  Pre-flight reported issues. Continue anyway? [y/N]'
    if ($answer -notmatch '^[Yy]$') { Stop-WithError 'Aborted by user' }
}

# ── Step 2: Container runtime ────────────────────────────────────────────────
Write-Banner 'Step 2/8: Container runtime'

if (-not (Find-ContainerRuntime)) {
    Write-Warn 'No running container runtime detected'

    $dockerExe = Get-Command docker -ErrorAction SilentlyContinue
    $desktop   = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if ($dockerExe -and (Test-Path $desktop)) {
        Write-Info 'Docker Desktop is installed but not running — starting it...'
        Start-Process -FilePath $desktop | Out-Null
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 5
            if (Find-ContainerRuntime) { break }
        }
    }
}

if (-not (Find-ContainerRuntime)) {
    $installer = Get-ChildItem -Path (Join-Path $BundleDir 'runtime') -Filter '*Docker*Installer*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($installer) {
        Write-Info "Installing bundled Docker Desktop from $($installer.Name) (this takes several minutes)..."
        Start-Process -FilePath $installer.FullName -ArgumentList 'install', '--quiet', '--accept-license' -Wait
        Write-Warn 'Docker Desktop installed. A sign-out or reboot may be required.'
        Write-Warn 'Start Docker Desktop, wait for the whale icon to settle, then re-run this installer.'
        exit 2
    }
    Stop-WithError @"
No container runtime available.

Install Docker Desktop (WSL2 backend) on this host, start it, then re-run:
  https://www.docker.com/products/docker-desktop

Or rebuild the bundle with -WithDocker so the installer is embedded.
"@
}
Write-Ok "Using $global:CRT_KIND : $((& $global:CRT --version) -join ' ')"

# ── Step 3: Install files ────────────────────────────────────────────────────
Write-Banner 'Step 3/8: Installing bundle files'

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $BundleDir '*') -Destination $InstallDir -Recurse -Force
Write-Ok "Bundle copied to $InstallDir"

$credsFile = Join-Path $InstallDir '.deploy-credentials'

# ── Step 4: Load container images ────────────────────────────────────────────
Write-Banner 'Step 4/8: Loading container images (offline)'

$imageDir = Join-Path $InstallDir 'images'
if (-not (Test-Path $imageDir)) { Stop-WithError 'images\ directory missing from bundle' }

$tars = Get-ChildItem -Path $imageDir -Include '*.tar', '*.tar.gz' -File -Recurse
if (-not $tars) { Stop-WithError "No image archives found in $imageDir" }

foreach ($tar in $tars) {
    Write-Info "Loading $($tar.Name)..."
    & $global:CRT load -i $tar.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-WithError "Failed to load $($tar.Name)" }
}
Write-Ok "$($tars.Count) image archive(s) loaded"

foreach ($img in @($global:API_IMAGE, $global:WEB_IMAGE, $global:DB_IMAGE)) {
    & $global:CRT image inspect $img *> $null
    if ($LASTEXITCODE -ne 0) { Stop-WithError "Image $img is missing after load - rebuild the bundle" }
}
Write-Ok 'All required images present locally'

# ── Step 5: Secrets ──────────────────────────────────────────────────────────
Write-Banner 'Step 5/8: Secrets'

$dbPassword = $null; $jwtSecret = $null
if ((Test-Path $credsFile) -and -not $Force) {
    $dbPassword = Read-Credential -Key 'DB_PASSWORD' -Path $credsFile
    $jwtSecret  = Read-Credential -Key 'JWT_SECRET'  -Path $credsFile
    if (-not $AdminPassword) { $AdminPassword = Read-Credential -Key 'ADMIN_PASSWORD' -Path $credsFile }
    Write-Ok 'Reusing existing credentials from previous install'
}
if (-not $dbPassword)    { $dbPassword    = New-RandomHex 16 }
if (-not $jwtSecret)     { $jwtSecret     = New-RandomHex 32 }
if (-not $AdminPassword) { $AdminPassword = New-RandomHex 9 }
Write-Ok 'Database password, JWT secret and admin password ready'

# ── Step 6: Start the stack ──────────────────────────────────────────────────
Write-Banner 'Step 6/8: Starting containers'

if ($Force) {
    Write-Info '-Force: removing any existing containers'
    & $global:CRT rm -f $global:WEB_CONTAINER $global:API_CONTAINER $global:DB_CONTAINER *> $null
}

& $global:CRT network create $global:STACK_NETWORK *> $null
& $global:CRT volume  create $global:DB_VOLUME     *> $null
& $global:CRT volume  create $global:API_VOLUME    *> $null

if (Test-ContainerExists $global:DB_CONTAINER) {
    & $global:CRT start $global:DB_CONTAINER | Out-Null
    Write-Ok 'PostgreSQL container already existed - started'
} else {
    Write-Info 'Starting PostgreSQL...'
    & $global:CRT run -d --name $global:DB_CONTAINER `
        --network $global:STACK_NETWORK --network-alias postgres `
        -e "POSTGRES_DB=$global:DB_NAME" `
        -e "POSTGRES_USER=$global:DB_USER" `
        -e "POSTGRES_PASSWORD=$dbPassword" `
        -v "$($global:DB_VOLUME):/var/lib/postgresql/data" `
        --restart unless-stopped `
        $global:DB_IMAGE | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-WithError 'Failed to start PostgreSQL' }
    Write-Ok 'PostgreSQL started'
}

Write-Info 'Waiting for PostgreSQL to accept connections...'
if (-not (Wait-ForPostgres 60)) {
    Stop-WithError "PostgreSQL did not become ready. Check: $global:CRT logs $global:DB_CONTAINER"
}
Write-Ok 'PostgreSQL is ready'

# ── Step 7: Restore the database dump ────────────────────────────────────────
Write-Banner 'Step 7/8: Database restore'

if ($SkipDbRestore) {
    Write-Warn '-SkipDbRestore given - starting with an empty database'
} elseif (Test-Path -LiteralPath $DumpFile) {
    & (Join-Path $InstallDir 'Restore-Db.ps1') -DumpFile $DumpFile -InstallDir $InstallDir -DbPassword $dbPassword -Yes
} else {
    Write-Warn "No dump found at $DumpFile - the application will start with an empty database"
    Write-Info "Restore later with: .\Restore-Db.ps1 -DumpFile <file>"
}

# ── Step 8: API + Web ────────────────────────────────────────────────────────
Write-Banner 'Step 8/8: Starting API and Web tiers'

& $global:CRT rm -f $global:API_CONTAINER $global:WEB_CONTAINER *> $null

Write-Info 'Starting API...'
# Container alias MUST be "api": nginx.conf proxies /api/ to http://api:4000/
& $global:CRT run -d --name $global:API_CONTAINER `
    --network $global:STACK_NETWORK --network-alias api `
    -e "DATABASE_URL=postgresql://$($global:DB_USER):$dbPassword@postgres:5432/$($global:DB_NAME)" `
    -e 'NODE_ENV=production' `
    -e "PORT=$global:API_PORT" `
    -e "FRONTEND_ORIGIN=http://${ServerHost}:$global:HTTP_PORT" `
    -e 'ENABLE_LOCAL_ADMIN=true' `
    -e "LOCAL_ADMIN_USERNAME=$global:ADMIN_USERNAME" `
    -e "LOCAL_ADMIN_PASSWORD=$AdminPassword" `
    -e "LOCAL_ADMIN_JWT_SECRET=$jwtSecret" `
    -v "$($global:API_VOLUME):/app/data" `
    --restart unless-stopped `
    $global:API_IMAGE | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-WithError 'Failed to start the API container' }
Write-Ok 'API started (running Prisma migrations on boot)'

Write-Info 'Starting Web (nginx)...'
& $global:CRT run -d --name $global:WEB_CONTAINER `
    --network $global:STACK_NETWORK --network-alias web `
    -p "$($global:HTTP_PORT):80" `
    --restart unless-stopped `
    $global:WEB_IMAGE | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-WithError 'Failed to start the web container' }
Write-Ok 'Web started'

# ── Firewall ─────────────────────────────────────────────────────────────────
$ruleName = "HCL Learning Hub ($global:HTTP_PORT)"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow `
        -Protocol TCP -LocalPort ([int]$global:HTTP_PORT) -Profile Any | Out-Null
    Write-Ok "Firewall rule created for TCP $global:HTTP_PORT (5432 intentionally left closed)"
} else {
    Write-Ok "Firewall rule for TCP $global:HTTP_PORT already exists"
}

# ── Auto-start on boot ───────────────────────────────────────────────────────
$taskName = 'HCL Learning Hub'
$startPs1 = Join-Path $InstallDir 'Start.ps1'
$action   = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startPs1`" -Quiet"
$trigger  = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Settings $settings -RunLevel Highest -User 'SYSTEM' -Force | Out-Null
Write-Ok "Auto-start registered as scheduled task '$taskName'"

# ── Save credentials ─────────────────────────────────────────────────────────
@"
# HCL Software Learning Hub - Deployment Credentials
# Generated: $(Get-Date -Format 'o')
APP_VERSION=$global:APP_VERSION
INSTALL_DIR=$InstallDir
SERVER_HOST=$ServerHost
HTTP_PORT=$global:HTTP_PORT
CONTAINER_RUNTIME=$global:CRT_KIND
DB_NAME=$global:DB_NAME
DB_USER=$global:DB_USER
DB_PASSWORD=$dbPassword
JWT_SECRET=$jwtSecret
ADMIN_USERNAME=$global:ADMIN_USERNAME
ADMIN_PASSWORD=$AdminPassword
ACCESS_URL=http://${ServerHost}:$global:HTTP_PORT
"@ | Set-Content -LiteralPath $credsFile -Encoding UTF8

# Restrict the credentials file to Administrators + SYSTEM
$acl = Get-Acl -LiteralPath $credsFile
$acl.SetAccessRuleProtection($true, $false)
$acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }
foreach ($who in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM')) {
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($who, 'FullControl', 'Allow')))
}
Set-Acl -LiteralPath $credsFile -AclObject $acl
Write-Ok "Credentials saved to $credsFile (Administrators + SYSTEM only)"

# ── Health check ─────────────────────────────────────────────────────────────
Write-Banner 'Health check'
if (Wait-ForHttp -Port ([int]$global:HTTP_PORT) -Attempts 45) {
    Write-Ok "Frontend is responding on http://127.0.0.1:$global:HTTP_PORT/"
} else {
    Write-Warn 'Frontend did not respond yet - the API may still be applying migrations'
    Write-Info "Check: $global:CRT logs -f $global:API_CONTAINER"
}

Write-Banner 'Installation complete'
Write-Host ""
Write-Host "  Application URL : http://${ServerHost}:$global:HTTP_PORT" -ForegroundColor Green
Write-Host "  Admin login     : $global:ADMIN_USERNAME / $AdminPassword" -ForegroundColor Green
Write-Host "  Credentials     : $credsFile"
Write-Host "  Runtime         : $global:CRT_KIND"
Write-Host ""
Write-Host "  Manage the stack:"
Write-Host "    `"$InstallDir\start.cmd`"      # start"
Write-Host "    `"$InstallDir\stop.cmd`"       # stop"
Write-Host "    powershell -File `"$InstallDir\Restore-Db.ps1`" -DumpFile <file>"
Write-Host ""

if (-not $Yes) { Read-Host '  Press ENTER to close' | Out-Null }
