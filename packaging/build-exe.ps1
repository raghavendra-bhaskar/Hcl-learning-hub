<#
.SYNOPSIS
    Compile Install.ps1 into hcl-learning-hub-setup.exe.

.DESCRIPTION
    Wraps the PowerShell installer in a native Windows executable using the
    ps2exe module, so operators get a single double-clickable setup file that
    performs every prerequisite check itself.

    The produced EXE is NOT standalone: it reads bundle.env, lib\, images\ and
    db\ from the folder it is started in. Keep it inside the extracted bundle.

    Requires internet ONCE on the build machine to install ps2exe:
        Install-Module -Name ps2exe -Scope CurrentUser

.PARAMETER Source
    Install.ps1 to compile. Default: packaging\bundle\Install.ps1

.PARAMETER Output
    EXE path to write. Default: dist-bundle\hcl-learning-hub-setup.exe

.PARAMETER Version
    Version stamped into the EXE resource metadata.

.PARAMETER IconFile
    Optional .ico file for the executable.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File packaging\build-exe.ps1
#>
[CmdletBinding()]
param(
    [string] $Source   = '',
    [string] $Output   = '',
    [string] $Version  = '1.0.0',
    [string] $IconFile = ''
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $Source) { $Source = Join-Path $PSScriptRoot 'bundle\Install.ps1' }
if (-not $Output) { $Output = Join-Path $RepoRoot 'dist-bundle\hcl-learning-hub-setup.exe' }

if (-not (Test-Path -LiteralPath $Source)) { throw "Source script not found: $Source" }

if ($PSVersionTable.PSEdition -eq 'Core') {
    Write-Warning 'ps2exe targets Windows PowerShell 5.1. Re-run this script with powershell.exe, not pwsh.exe.'
}

# ── Ensure ps2exe is available ───────────────────────────────────────────────
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host 'Installing the ps2exe module (requires internet, one time only)...'
    try {
        Install-Module -Name ps2exe -Scope CurrentUser -Force -AllowClobber
    } catch {
        throw @"
Could not install ps2exe: $($_.Exception.Message)

On an offline build machine, copy the ps2exe module folder into:
  $HOME\Documents\WindowsPowerShell\Modules\ps2exe
and re-run this script. Alternatively ship install.cmd instead of the EXE.
"@
    }
}
Import-Module ps2exe -Force

$outDir = Split-Path -Parent $Output
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

$ps2exeArgs = @{
    InputFile     = $Source
    OutputFile    = $Output
    # requireAdmin embeds a UAC manifest so the installer always elevates.
    requireAdmin  = $true
    noConsole     = $false
    title         = 'HCL Software Learning Hub Setup'
    description   = 'Offline installer for the HCL Software Learning Hub'
    company       = 'HCL Software'
    product       = 'HCL Software Learning Hub'
    copyright     = "(c) $(Get-Date -Format yyyy) HCL Software"
    version       = $Version
}
if ($IconFile -and (Test-Path $IconFile)) { $ps2exeArgs.iconFile = $IconFile }

Write-Host "Compiling $Source -> $Output"
Invoke-PS2EXE @ps2exeArgs

if (Test-Path -LiteralPath $Output) {
    $kb = [math]::Round((Get-Item $Output).Length / 1KB)
    Write-Host "[ OK ] Created $Output (${kb} KB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Keep the EXE inside the extracted bundle folder - it reads"
    Write-Host "  bundle.env, lib\, images\ and db\ from its own directory."
} else {
    throw 'ps2exe did not produce an output file.'
}
