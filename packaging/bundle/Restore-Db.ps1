<#
.SYNOPSIS
    HCL Software Learning Hub — restore a PostgreSQL dump (Windows).

.DESCRIPTION
    Restores a dump into the running stack. Supports custom-format dumps
    (pg_dump -Fc, magic "PGDMP" -> pg_restore) and plain SQL dumps (-> psql).
    Called automatically by Install.ps1 and usable standalone afterwards.

.PARAMETER DumpFile
    Dump to restore. Default: db\backup.dump inside the install directory.

.PARAMETER InstallDir
    Install directory holding .deploy-credentials. Default: script directory.

.PARAMETER DbPassword
    Database password. Read from .deploy-credentials when omitted.

.PARAMETER Yes
    Skip the overwrite confirmation.

.EXAMPLE
    .\Restore-Db.ps1 -DumpFile C:\backups\backup.dump
#>
[CmdletBinding()]
param(
    [string] $DumpFile   = '',
    [string] $InstallDir = '',
    [string] $DbPassword = '',
    [switch] $Yes
)

$ErrorActionPreference = 'Stop'

$BundleDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent ([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName) }
. (Join-Path $BundleDir 'lib\Common.ps1')
$null = Import-BundleEnv (Join-Path $BundleDir 'bundle.env')

if (-not $InstallDir) { $InstallDir = $BundleDir }
if (-not $DumpFile)   { $DumpFile   = Join-Path $InstallDir 'db\backup.dump' }

if (-not (Test-Path -LiteralPath $DumpFile)) { Stop-WithError "Dump file not found: $DumpFile" }
$dumpInfo = Get-Item -LiteralPath $DumpFile
if ($dumpInfo.Length -eq 0) { Stop-WithError "Dump file is empty: $DumpFile" }

if (-not (Find-ContainerRuntime)) { Stop-WithError 'No container runtime available' }
if (-not (Test-ContainerRunning $global:DB_CONTAINER)) {
    Stop-WithError "Container $global:DB_CONTAINER is not running. Start the stack first: Start.ps1"
}

$credsFile = Join-Path $InstallDir '.deploy-credentials'
if (-not $DbPassword) { $DbPassword = Read-Credential -Key 'DB_PASSWORD' -Path $credsFile }

# ── Format detection ─────────────────────────────────────────────────────────
# pg_dump custom/tar archives start with the 5-byte magic string "PGDMP".
# -AsByteStream is PowerShell 6+; Windows PowerShell 5.1 needs -Encoding Byte.
$magicBytes = if ($PSVersionTable.PSVersion.Major -ge 6) {
    Get-Content -LiteralPath $DumpFile -AsByteStream -TotalCount 5
} else {
    Get-Content -LiteralPath $DumpFile -Encoding Byte -TotalCount 5
}
$magic  = -join ($magicBytes | ForEach-Object { [char]$_ })
$format = if ($magic -eq 'PGDMP') { 'custom' } else { 'plain' }

Write-Host ""
Write-Host "  Database restore"
Write-Host "  ----------------"
Write-Host "  Dump    : $DumpFile ($([math]::Round($dumpInfo.Length / 1KB)) KB)"
Write-Host "  Format  : $format"
Write-Host "  Target  : $global:DB_NAME @ $global:DB_CONTAINER ($global:CRT_KIND)"
Write-Host ""

if (-not $Yes) {
    Write-Warn "This OVERWRITES all data currently in the $global:DB_NAME database."
    $answer = Read-Host '  Continue? [y/N]'
    if ($answer -notmatch '^[Yy]$') { Stop-WithError 'Aborted by user' }
}

# ── Pause the API so it cannot write mid-restore ─────────────────────────────
$apiWasRunning = Test-ContainerRunning $global:API_CONTAINER
if ($apiWasRunning) {
    Write-Info 'Stopping API during restore...'
    & $global:CRT stop $global:API_CONTAINER *> $null
}

if (-not (Wait-ForPostgres 30)) { Stop-WithError 'PostgreSQL is not accepting connections' }

Write-Info 'Copying dump into the database container...'
& $global:CRT cp $DumpFile "$($global:DB_CONTAINER):/tmp/hcl-restore.dump"
if ($LASTEXITCODE -ne 0) { Stop-WithError 'Failed to copy the dump into the container' }

$restoreLog = Join-Path $InstallDir ("restore-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

Write-Info "Restoring ($format format)..."
if ($format -eq 'custom') {
    # --clean --if-exists makes the restore repeatable; --no-owner/--no-acl
    # detaches it from roles that do not exist on this host.
    & $global:CRT exec -e "PGPASSWORD=$DbPassword" $global:DB_CONTAINER `
        pg_restore -U $global:DB_USER -d $global:DB_NAME `
        --clean --if-exists --no-owner --no-acl --single-transaction `
        /tmp/hcl-restore.dump 2>&1 | Tee-Object -FilePath $restoreLog | Out-Null
} else {
    & $global:CRT exec -e "PGPASSWORD=$DbPassword" $global:DB_CONTAINER `
        psql -U $global:DB_USER -d $global:DB_NAME --set ON_ERROR_STOP=off `
        -f /tmp/hcl-restore.dump 2>&1 | Tee-Object -FilePath $restoreLog | Out-Null
}
$restoreRc = $LASTEXITCODE

& $global:CRT exec $global:DB_CONTAINER rm -f /tmp/hcl-restore.dump *> $null

if ($restoreRc -ne 0) {
    Write-Warn "Restore finished with a non-zero exit code ($restoreRc)"
    Write-Warn "Review $restoreLog - errors about missing roles or DROP statements are usually harmless"
} else {
    Write-Ok "Database restored from $($dumpInfo.Name)"
}

# ── Sanity check: Prisma migration history ───────────────────────────────────
$hasMigrations = (& $global:CRT exec -e "PGPASSWORD=$DbPassword" $global:DB_CONTAINER `
    psql -U $global:DB_USER -d $global:DB_NAME -tAc `
    "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" 2>$null) -join '' 

if ($hasMigrations.Trim() -eq 't') {
    Write-Ok "Prisma migration history present - 'prisma migrate deploy' will apply only new migrations"
} else {
    Write-Warn 'Restored dump has no _prisma_migrations table'
    Write-Info 'The API will try to apply every migration on boot, which can fail on existing tables.'
}

$tableCount = (& $global:CRT exec -e "PGPASSWORD=$DbPassword" $global:DB_CONTAINER `
    psql -U $global:DB_USER -d $global:DB_NAME -tAc `
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>$null) -join ''
Write-Ok "Database now contains $($tableCount.Trim()) tables in schema public"

# ── Optional OIDC config bundled alongside the dump ──────────────────────────
$oidcFile = Join-Path (Split-Path -Parent $DumpFile) 'oidc-config.json'
if (Test-Path -LiteralPath $oidcFile) {
    & $global:CRT cp $oidcFile "$($global:API_CONTAINER):/app/data/oidc-config.json" *> $null
    if ($LASTEXITCODE -eq 0) { Write-Ok 'Okta/OIDC configuration restored' }
    else { Write-Warn 'Could not copy oidc-config.json into the API container' }
}

if ($apiWasRunning) {
    Write-Info 'Restarting API...'
    & $global:CRT start $global:API_CONTAINER *> $null
}

Write-Ok "Restore complete. Log: $restoreLog"
