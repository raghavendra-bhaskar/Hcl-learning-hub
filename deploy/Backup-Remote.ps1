<#
.SYNOPSIS
    Pull a PostgreSQL backup of the HCL Learning Hub from the Linux VM to this
    Windows machine, and optionally schedule it to run automatically.

.DESCRIPTION
    Runs `deploy/sync.sh --backup-only` on the VM (which writes a custom-format
    pg_dump into <install-dir>/backups/), copies the newest dump here over scp,
    verifies it, and prunes local copies older than -KeepDays.

    Database credentials never appear in this script or on the command line:
    sync.sh reads them from .deploy-credentials on the VM.

    UNATTENDED RUNS NEED KEY-BASED SSH. A scheduled task cannot type a password.
    Set a key up once:

        ssh-keygen -t ed25519 -C "hcl-hub-backup"
        type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh hcluser@<vm> `
            "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
        ssh hcluser@<vm> "echo ok"      # must not prompt for a password

.PARAMETER VmHost
    Hostname or IP of the VM, e.g. blmycldtl596461.nonprod.hclpnp.com

.PARAMETER VmUser
    SSH user on the VM. Default: hcluser

.PARAMETER InstallDir
    Hub install directory on the VM. Default: /home/<VmUser>/software/hcl-learning-hub

.PARAMETER Destination
    Local folder for the downloaded dumps. Default: %USERPROFILE%\HclHubBackups

.PARAMETER KeepDays
    Delete local dumps older than this many days. Default: 30 (0 disables pruning).

.PARAMETER IdentityFile
    Optional path to a private key for ssh/scp.

.PARAMETER InstallTask
    Register a daily Windows scheduled task that runs this script.

.PARAMETER TaskTime
    Time of day for the scheduled task. Default: 02:00

.EXAMPLE
    .\Backup-Remote.ps1 -VmHost blmycldtl596461.nonprod.hclpnp.com

.EXAMPLE
    .\Backup-Remote.ps1 -VmHost 10.115.54.50 -Destination D:\HclHubBackups -InstallTask
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $VmHost,
    [string] $VmUser       = 'hcluser',
    [string] $InstallDir   = '',
    [string] $Destination  = "$env:USERPROFILE\HclHubBackups",
    [int]    $KeepDays     = 30,
    [string] $IdentityFile = '',
    [switch] $InstallTask,
    [string] $TaskTime     = '02:00'
)

$ErrorActionPreference = 'Stop'

function Write-Ok   { param([string]$m) Write-Host "[ OK ] $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Info { param([string]$m) Write-Host "  -> $m"   -ForegroundColor Cyan }
function Stop-WithError { param([string]$m) Write-Host "[FAIL] $m" -ForegroundColor Red; exit 1 }

if (-not $InstallDir) { $InstallDir = "/home/$VmUser/software/hcl-learning-hub" }

foreach ($tool in @('ssh', 'scp')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Stop-WithError "$tool not found. Install the Windows OpenSSH Client: Settings > Apps > Optional Features."
    }
}

$sshArgs = @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new')
$scpArgs = @('-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new')
if ($IdentityFile) {
    if (-not (Test-Path -LiteralPath $IdentityFile)) { Stop-WithError "Identity file not found: $IdentityFile" }
    $sshArgs += @('-i', $IdentityFile)
    $scpArgs += @('-i', $IdentityFile)
}

$target = "$VmUser@$VmHost"

# ── Register the scheduled task and exit ─────────────────────────────────────
if ($InstallTask) {
    $self = $MyInvocation.MyCommand.Path
    $taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$self`" -VmHost `"$VmHost`" -VmUser `"$VmUser`" -Destination `"$Destination`" -KeepDays $KeepDays"
    if ($IdentityFile) { $taskArgs += " -IdentityFile `"$IdentityFile`"" }

    $action   = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArgs
    $trigger  = New-ScheduledTaskTrigger -Daily -At $TaskTime
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable
    Register-ScheduledTask -TaskName 'HCL Learning Hub Backup' -Action $action -Trigger $trigger `
        -Settings $settings -Description "Daily PostgreSQL backup from $VmHost" -Force | Out-Null

    Write-Ok "Scheduled task 'HCL Learning Hub Backup' registered for $TaskTime daily"
    Write-Info 'It runs as you, so your SSH key must work without a passphrase prompt.'
    Write-Info "Test now:  Start-ScheduledTask -TaskName 'HCL Learning Hub Backup'"
    exit 0
}

# ── 1. Verify SSH works without a password ───────────────────────────────────
Write-Info "Checking SSH access to $target..."
$probe = & ssh @sshArgs $target 'echo hcl-hub-ssh-ok' 2>&1
if ($LASTEXITCODE -ne 0 -or "$probe" -notmatch 'hcl-hub-ssh-ok') {
    Stop-WithError @"
Cannot connect to $target without a password.

BatchMode is on, so password prompts are refused - that is deliberate, because a
scheduled task could never answer one. Set up key authentication:

  ssh-keygen -t ed25519 -C "hcl-hub-backup"
  type `$env:USERPROFILE\.ssh\id_ed25519.pub | ssh $target "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

Detail: $probe
"@
}
Write-Ok 'SSH key authentication works'

# ── 2. Take the backup on the VM ─────────────────────────────────────────────
Write-Info 'Running pg_dump on the VM (deploy/sync.sh --backup-only)...'
$remote = & ssh @sshArgs $target "cd '$InstallDir' && bash deploy/sync.sh --backup-only" 2>&1
if ($LASTEXITCODE -ne 0) {
    Stop-WithError "Remote backup failed:`n$($remote -join "`n")"
}
Write-Ok 'Remote dump created'

# ── 3. Locate the newest dump ────────────────────────────────────────────────
$latest = (& ssh @sshArgs $target "ls -1t '$InstallDir'/backups/hcl-hub-*.dump 2>/dev/null | head -1" 2>&1 | Select-Object -First 1)
if ($LASTEXITCODE -ne 0 -or -not $latest -or "$latest".Trim() -eq '') {
    Stop-WithError "No dump found in $InstallDir/backups/"
}
$latest = "$latest".Trim()
$fileName = Split-Path -Leaf $latest
Write-Info "Newest dump: $fileName"

# ── 4. Copy it down ──────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$localPath = Join-Path $Destination $fileName

# Bracket the host for scp so IPv6 literals work too.
& scp @scpArgs "${target}:$latest" "$localPath" | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-WithError 'scp failed while downloading the dump' }

if (-not (Test-Path -LiteralPath $localPath)) { Stop-WithError 'Download produced no file' }
$info = Get-Item -LiteralPath $localPath
if ($info.Length -eq 0) {
    Remove-Item -LiteralPath $localPath -Force
    Stop-WithError 'Downloaded dump is empty - it has been deleted'
}

# A pg_dump custom archive must start with the magic string PGDMP.
$magicBytes = if ($PSVersionTable.PSVersion.Major -ge 6) {
    Get-Content -LiteralPath $localPath -AsByteStream -TotalCount 5
} else {
    Get-Content -LiteralPath $localPath -Encoding Byte -TotalCount 5
}
$magic = -join ($magicBytes | ForEach-Object { [char]$_ })
if ($magic -ne 'PGDMP') {
    Write-Warn "Downloaded file does not start with PGDMP (found '$magic') - verify it before relying on it"
} else {
    Write-Ok "Verified pg_dump archive: $fileName ($([math]::Round($info.Length / 1KB)) KB)"
}

# ── 5. Prune old local copies ────────────────────────────────────────────────
if ($KeepDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$KeepDays)
    $old = Get-ChildItem -Path $Destination -Filter 'hcl-hub-*.dump' -File |
           Where-Object { $_.LastWriteTime -lt $cutoff }
    if ($old) {
        $old | Remove-Item -Force
        Write-Ok "Pruned $($old.Count) local backup(s) older than $KeepDays days"
    }
}

Write-Host ""
Write-Ok "Backup saved to $localPath"
Write-Host ""
Write-Host "  Restore it onto the VM with:" -ForegroundColor White
Write-Host "    scp `"$localPath`" ${target}:/tmp/"
Write-Host "    ssh $target `"cd '$InstallDir' && bash deploy/sync.sh --restore /tmp/$fileName`""
Write-Host ""
