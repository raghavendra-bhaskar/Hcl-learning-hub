<#
.SYNOPSIS
    HCL Software Learning Hub — stop the stack on Windows.

.DESCRIPTION
    Stops the web, API and database tiers in reverse dependency order.
    Containers and volumes are preserved — no data is lost.

.PARAMETER Remove
    Also delete the containers. Data volumes are kept.

.EXAMPLE
    .\Stop.ps1
#>
[CmdletBinding()]
param([switch] $Remove)

$ErrorActionPreference = 'Stop'

$BundleDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent ([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName) }
. (Join-Path $BundleDir 'lib\Common.ps1')
$null = Import-BundleEnv (Join-Path $BundleDir 'bundle.env')

if (-not (Find-ContainerRuntime)) {
    Stop-WithError 'No container runtime available (docker/podman).'
}

Write-Banner "Stopping $global:APP_NAME"

# Reverse order: web first so users stop hitting a half-stopped API.
foreach ($name in @($global:WEB_CONTAINER, $global:API_CONTAINER, $global:DB_CONTAINER)) {
    if (Test-ContainerRunning $name) {
        & $global:CRT stop -t 20 $name | Out-Null
        Write-Ok "$name stopped"
    } elseif (Test-ContainerExists $name) {
        Write-Ok "$name already stopped"
    } else {
        Write-Warn "$name does not exist"
    }
}

if ($Remove) {
    foreach ($name in @($global:WEB_CONTAINER, $global:API_CONTAINER, $global:DB_CONTAINER)) {
        & $global:CRT rm -f $name *> $null
        Write-Ok "$name removed"
    }
    Write-Warn "Containers removed. Volumes $global:DB_VOLUME and $global:API_VOLUME were kept."
    Write-Info 'Re-create the stack with: Install.ps1 -SkipDbRestore'
}

Write-Ok 'All services stopped. Data volumes are intact.'
