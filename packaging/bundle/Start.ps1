<#
.SYNOPSIS
    HCL Software Learning Hub — start the stack on Windows.

.DESCRIPTION
    Starts the database, API and web tiers in dependency order.
    Safe to run repeatedly; already-running containers are left alone.

.PARAMETER Quiet
    Suppress the status table and URL wait (used by the auto-start task).

.EXAMPLE
    .\Start.ps1
#>
[CmdletBinding()]
param([switch] $Quiet)

$ErrorActionPreference = 'Stop'

$BundleDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent ([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName) }
. (Join-Path $BundleDir 'lib\Common.ps1')
$null = Import-BundleEnv (Join-Path $BundleDir 'bundle.env')

if (-not (Find-ContainerRuntime)) {
    Stop-WithError 'No container runtime available. Start Docker Desktop and try again.'
}

Write-Banner "Starting $global:APP_NAME"

foreach ($name in @($global:DB_CONTAINER, $global:API_CONTAINER, $global:WEB_CONTAINER)) {
    if (-not (Test-ContainerExists $name)) {
        Stop-WithError "Container '$name' does not exist. Run the installer first."
    }
}

if (Test-ContainerRunning $global:DB_CONTAINER) {
    Write-Ok 'Database already running'
} else {
    & $global:CRT start $global:DB_CONTAINER | Out-Null
    Write-Ok 'Database started'
}

Write-Info 'Waiting for PostgreSQL...'
if (-not (Wait-ForPostgres 60)) {
    Stop-WithError "PostgreSQL did not become ready. Check: $global:CRT logs $global:DB_CONTAINER"
}
Write-Ok 'PostgreSQL ready'

foreach ($name in @($global:API_CONTAINER, $global:WEB_CONTAINER)) {
    if (Test-ContainerRunning $name) {
        Write-Ok "$name already running"
    } else {
        & $global:CRT start $name | Out-Null
        Write-Ok "$name started"
    }
}

if (-not $Quiet) {
    $credsFile  = Join-Path $BundleDir '.deploy-credentials'
    $serverHost = Read-Credential -Key 'SERVER_HOST' -Path $credsFile
    if (-not $serverHost) { $serverHost = 'localhost' }

    Write-Info 'Waiting for the web tier to answer...'
    if (Wait-ForHttp -Port ([int]$global:HTTP_PORT) -Attempts 45) {
        Write-Ok "Learning Hub is up: http://${serverHost}:$global:HTTP_PORT"
    } else {
        Write-Warn 'Web tier not responding yet - the API may still be applying migrations'
        Write-Info "Check: $global:CRT logs -f $global:API_CONTAINER"
    }
    Write-Host ""
    & $global:CRT ps --filter 'name=hcl-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    Write-Host ""
}
