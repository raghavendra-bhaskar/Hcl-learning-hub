<#
.SYNOPSIS
    HCL Software Learning Hub — offline bundle builder for Windows.

.DESCRIPTION
    Run this ONCE on a machine that HAS internet and Docker Desktop.
    It produces a self-contained .zip that installs on an air-gapped Windows
    host with no registry access:

        dist-bundle\hcl-learning-hub-<version>-windows.zip

    Bundle contents:
        images\      api, web and postgres images saved as tar archives
        db\          backup.dump restored automatically at install time
        lib\         shared PowerShell helpers
        Install.ps1  Start.ps1  Stop.ps1  Restore-Db.ps1  bundle.env
        install.cmd  start.cmd  stop.cmd
        hcl-learning-hub-setup.exe  (when -WithExe is used)

.PARAMETER WithExe
    Also compile Install.ps1 into hcl-learning-hub-setup.exe (needs the ps2exe module).

.PARAMETER WithDocker
    Embed a Docker Desktop installer placed in packaging\payload\.

.PARAMETER DumpFile
    Database dump to ship. Default: scripts\backup.dump

.PARAMETER OutputDir
    Where to write the archive. Default: dist-bundle\

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File packaging\build-bundle.ps1 -WithExe
#>
[CmdletBinding()]
param(
    [switch] $WithExe,
    [switch] $WithDocker,
    [string] $DumpFile  = '',
    [string] $OutputDir = ''
)

$ErrorActionPreference = 'Stop'

$RepoRoot  = Split-Path -Parent $PSScriptRoot
$BundleSrc = Join-Path $PSScriptRoot 'bundle'
if (-not $OutputDir) { $OutputDir = Join-Path $RepoRoot 'dist-bundle' }
if (-not $DumpFile)  { $DumpFile  = Join-Path $RepoRoot 'scripts\backup.dump' }

. (Join-Path $BundleSrc 'lib\Common.ps1')
$null = Import-BundleEnv (Join-Path $BundleSrc 'bundle.env')

function Write-Step { param([string]$M) Write-Host ""; Write-Host "=== $M ===" -ForegroundColor White }

if (-not (Find-ContainerRuntime)) {
    Stop-WithError 'Docker Desktop (or podman) must be running to build the bundle.'
}
Write-Ok "Build runtime: $global:CRT_KIND"

$stageName = "$global:APP_NAME-$global:APP_VERSION-windows"
$staging   = Join-Path $OutputDir $stageName
$archive   = Join-Path $OutputDir "$stageName.zip"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
foreach ($d in @('images', 'db', 'lib', 'runtime', 'docs')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging $d) | Out-Null
}

# ── 1. Build application images ──────────────────────────────────────────────
Write-Step '1/5  Building application images'

Write-Info "Building API image: $global:API_IMAGE"
& $global:CRT build -t $global:API_IMAGE (Join-Path $RepoRoot 'server')
if ($LASTEXITCODE -ne 0) { Stop-WithError 'API image build failed' }
Write-Ok 'API image built'

Write-Info "Building Web image: $global:WEB_IMAGE"
& $global:CRT build -t $global:WEB_IMAGE $RepoRoot
if ($LASTEXITCODE -ne 0) { Stop-WithError 'Web image build failed' }
Write-Ok 'Web image built'

Write-Info "Pulling database image: $global:DB_IMAGE"
& $global:CRT pull $global:DB_IMAGE
if ($LASTEXITCODE -ne 0) { Stop-WithError "Could not pull $global:DB_IMAGE - this step needs internet" }
Write-Ok 'Database image pulled'

# ── 2. Export images to tar ──────────────────────────────────────────────────
Write-Step '2/5  Exporting images for offline load'

$exports = @(
    @{ Image = $global:API_IMAGE; File = '01-api.tar' },
    @{ Image = $global:WEB_IMAGE; File = '02-web.tar' },
    @{ Image = $global:DB_IMAGE;  File = '03-postgres.tar' }
)
foreach ($e in $exports) {
    $out = Join-Path $staging "images\$($e.File)"
    Write-Info "Saving $($e.Image) -> $($e.File)"
    & $global:CRT save -o $out $e.Image
    if ($LASTEXITCODE -ne 0) { Stop-WithError "Failed to save $($e.Image)" }
}
$imgMb = [math]::Round((Get-ChildItem (Join-Path $staging 'images') | Measure-Object Length -Sum).Sum / 1MB)
Write-Ok "Images exported (${imgMb} MB)"

# ── 3. Database dump ─────────────────────────────────────────────────────────
Write-Step '3/5  Adding database dump'

if (Test-Path -LiteralPath $DumpFile) {
    Copy-Item $DumpFile (Join-Path $staging 'db\backup.dump') -Force
    Write-Ok "Dump added: $(Split-Path -Leaf $DumpFile)"
} else {
    Write-Warn "No dump at $DumpFile - the bundle will install an empty database"
}

$oidcSrc = Join-Path (Split-Path -Parent $DumpFile) 'oidc-config.json'
if (Test-Path $oidcSrc) {
    Copy-Item $oidcSrc (Join-Path $staging 'db\oidc-config.json') -Force
    Write-Ok 'OIDC config added'
}

# ── 4. Optional runtime payload ──────────────────────────────────────────────
Write-Step '4/5  Container runtime payload'

if ($WithDocker) {
    $payload = Get-ChildItem -Path (Join-Path $PSScriptRoot 'payload') -Filter '*Docker*Installer*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($payload) {
        Copy-Item $payload.FullName (Join-Path $staging 'runtime') -Force
        Write-Ok "Embedded $($payload.Name)"
    } else {
        Write-Warn 'No Docker Desktop installer found in packaging\payload\ - skipping'
        Write-Info 'Download "Docker Desktop Installer.exe" into packaging\payload\ and rebuild.'
    }
} else {
    'Rebuild with -WithDocker (and place Docker Desktop Installer.exe in packaging\payload\) to embed the runtime.' |
        Set-Content (Join-Path $staging 'runtime\README.txt')
    Write-Info 'Skipped (target host must already have Docker Desktop)'
}

# ── 5. Scripts, docs and archive ─────────────────────────────────────────────
Write-Step '5/5  Assembling archive'

foreach ($f in @('bundle.env', 'Install.ps1', 'Start.ps1', 'Stop.ps1', 'Restore-Db.ps1',
                 'install.cmd', 'start.cmd', 'stop.cmd')) {
    Copy-Item (Join-Path $BundleSrc $f) $staging -Force
}
Copy-Item (Join-Path $BundleSrc 'lib\Common.ps1') (Join-Path $staging 'lib') -Force

foreach ($doc in @('README.md', 'PROJECT_OVERVIEW.md')) {
    $p = Join-Path $RepoRoot $doc
    if (Test-Path $p) { Copy-Item $p (Join-Path $staging 'docs') -Force }
}
$bundleReadme = Join-Path $BundleSrc 'BUNDLE-README.md'
if (Test-Path $bundleReadme) { Copy-Item $bundleReadme (Join-Path $staging 'README.md') -Force }

if ($WithExe) {
    Write-Info 'Compiling Install.ps1 -> hcl-learning-hub-setup.exe'
    & (Join-Path $PSScriptRoot 'build-exe.ps1') -Source (Join-Path $staging 'Install.ps1') `
        -Output (Join-Path $staging 'hcl-learning-hub-setup.exe') -Version $global:APP_VERSION
    if (Test-Path (Join-Path $staging 'hcl-learning-hub-setup.exe')) {
        Write-Ok 'hcl-learning-hub-setup.exe created'
    } else {
        Write-Warn 'EXE compilation failed - install.cmd is still available as a fallback'
    }
}

@"
HCL Software Learning Hub - Offline Bundle
Version    : $global:APP_VERSION
Platform   : windows
Built on   : $(Get-Date -Format 'o')
Built with : $global:CRT_KIND
Images     : $global:API_IMAGE, $global:WEB_IMAGE, $global:DB_IMAGE
Database   : $(if (Test-Path (Join-Path $staging 'db\backup.dump')) { 'backup.dump included' } else { 'none (empty install)' })

Install:
  1. Right-click the extracted folder -> Properties -> Unblock (if present)
  2. Run hcl-learning-hub-setup.exe as Administrator
     (or right-click install.cmd -> Run as administrator)
"@ | Set-Content (Join-Path $staging 'MANIFEST.txt')

if (Test-Path $archive) { Remove-Item $archive -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $archive -CompressionLevel Optimal
Remove-Item $staging -Recurse -Force

$hash = (Get-FileHash -Path $archive -Algorithm SHA256).Hash
"$hash  $(Split-Path -Leaf $archive)" | Set-Content "$archive.sha256"

$zipMb = [math]::Round((Get-Item $archive).Length / 1MB)
Write-Ok "Bundle ready: $archive (${zipMb} MB)"
Write-Ok "Checksum:     $archive.sha256"
Write-Host ""
Write-Host "  Copy to the air-gapped host, extract, then run as Administrator:"
Write-Host "    hcl-learning-hub-setup.exe      (or install.cmd)"
Write-Host ""
