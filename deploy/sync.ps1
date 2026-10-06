param(
  [string]$Restore = '',
  [string]$Version = '',
  [switch]$NoRestart,
  [switch]$BackupOnly,
  [switch]$CodeOnly,
  [switch]$NoBackup
)

$runtimePath = Join-Path $PSScriptRoot 'runtime.ps1'
. $runtimePath

function Get-DatabaseUrlFromConfig {
  param([hashtable]$Config, [string]$InstallDir)
  if ($Config['DATABASE_URL']) { return $Config['DATABASE_URL'] }
  $serverEnv = Read-KeyValueFile (Join-Path $InstallDir 'server\.env')
  if ($serverEnv['DATABASE_URL']) { return $serverEnv['DATABASE_URL'] }
  if ($Config['DB_USER'] -and $Config['DB_PASSWORD'] -and $Config['DB_HOST'] -and $Config['DB_PORT'] -and $Config['DB_NAME']) {
    return "postgresql://$($Config['DB_USER']):$($Config['DB_PASSWORD'])@$($Config['DB_HOST']):$($Config['DB_PORT'])/$($Config['DB_NAME'])"
  }
  return ''
}

function Resolve-RestoreFile {
  param([string]$Requested, [string]$InstallDir)
  $dirs = @(
    (Join-Path $InstallDir 'backups'),
    (Join-Path $InstallDir 'scripts'),
    $env:TEMP
  )
  if ($Requested -and (Test-Path -LiteralPath $Requested)) {
    return (Resolve-Path -LiteralPath $Requested).Path
  }
  if ($Requested -and $Requested -ne 'latest') {
    foreach ($dir in $dirs) {
      $candidate = Join-Path $dir $Requested
      if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
    }
  }
  $latest = Get-ChildItem -Path ($dirs | ForEach-Object { Join-Path $_ '*.dump' }) -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($latest) { return $latest.FullName }
  return ''
}

$config = Get-HubConfig
$installDir = $config['INSTALL_DIR']
$appName = $config['APP_NAME']
$databaseUrl = Get-DatabaseUrlFromConfig -Config $config -InstallDir $installDir
$database = Parse-DatabaseUrl $databaseUrl
$pgTools = Get-PgTooling
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $installDir 'backups'
$backupFile = Join-Path $backupDir "hcl-hub-$timestamp.dump"
$latestBackupFile = Join-Path $backupDir 'latest.dump'

if ($CodeOnly -and ($BackupOnly -or $Restore)) { Fail-Step '--code-only cannot be combined with --backup-only or --restore' }
if ($BackupOnly -and $NoBackup) { Fail-Step '--backup-only cannot be combined with --no-backup' }
if (-not (Test-Path -LiteralPath $installDir)) { Fail-Step "Install directory not found: $installDir" }
Assert-Command -CommandName 'git' -Hint 'Install Git for Windows.'
Test-NodeVersion
Ensure-Directory $backupDir

Push-Location $installDir
try {
  if (-not $CodeOnly) {
    if ($NoBackup) {
      Show-Banner 'Sync - step 1/7: Safety backup skipped'
      Write-WarnLine '--no-backup given - proceeding without a fresh Windows safety backup'
    } else {
      Show-Banner 'Sync - step 1/7: Back up the current database'
      $rc = Invoke-PgDump -PgDumpPath $pgTools.PgDump -Database $database -TargetFile $backupFile
      if ($rc -ne 0) {
        Fail-Step 'pg_dump failed. Check PostgreSQL tooling and credentials.'
      }
      Copy-Item -LiteralPath $backupFile -Destination $latestBackupFile -Force
      Write-Ok "Backup written: $backupFile"
    }
  } else {
    Show-Banner 'Code-only sync: database backup, migration and restore are skipped'
  }

  if ($BackupOnly) {
    Write-Ok '--backup-only: done. The Hub was not touched.'
    exit 0
  }

  Show-Banner 'Sync - step 2/7: Stop the Hub'
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stop.ps1')
  if ($LASTEXITCODE -ne 0) { Write-WarnLine 'stop.ps1 reported an issue - continuing' }

  Show-Banner 'Sync - step 3/7: Pull the latest code'
  $branch = if ($config['GIT_BRANCH']) { $config['GIT_BRANCH'] } else { 'main' }
  if ((git status --porcelain --untracked-files=no)) {
    Write-WarnLine 'Local modifications detected - stashing them'
    git stash push -m "sync.ps1 auto-stash $timestamp" | Out-Null
  }
  $before = (git rev-parse --short HEAD).Trim()
  git fetch origin $branch
  if ($LASTEXITCODE -ne 0) { Fail-Step 'git fetch failed' }
  git checkout $branch | Out-Null
  git pull --ff-only origin $branch
  if ($LASTEXITCODE -ne 0) { Fail-Step 'git pull failed - resolve manually, then rerun' }
  $after = (git rev-parse --short HEAD).Trim()
  if ($before -eq $after) { Write-Ok "Already up to date ($after)" } else { Write-Ok "Updated $before -> $after" }

  Show-Banner 'Sync - step 4/7: Dependencies'
  Invoke-Npm -Arguments @('install','--no-fund','--no-audit') -WorkingDirectory $installDir
  Invoke-Npm -Arguments @('install','--prefix','server','--no-fund','--no-audit') -WorkingDirectory $installDir
  Write-Ok 'Dependencies up to date'

  Show-Banner 'Sync - step 5/7: Prisma client and migrations'
  Invoke-Npm -Arguments @('run','prisma:generate','--prefix','server') -WorkingDirectory $installDir
  if (-not $CodeOnly) {
    Invoke-Npm -Arguments @('run','prisma:deploy','--prefix','server') -WorkingDirectory $installDir
  } else {
    Write-Info '--code-only: database migrations skipped'
  }
  Write-Ok 'Prisma step complete'

  Show-Banner 'Sync - step 6/7: Optional restore'
  if ($CodeOnly) {
    Write-Info '--code-only: database restore skipped'
  } elseif ($Restore) {
    $restoreFile = Resolve-RestoreFile -Requested $Restore -InstallDir $installDir
    if (-not $restoreFile) { Fail-Step "Restore file not found: $Restore" }
    Write-Info "Restoring $restoreFile (this overwrites current data)..."
    $magicBytes = Get-Content -LiteralPath $restoreFile -AsByteStream -TotalCount 5
    $magic = -join ($magicBytes | ForEach-Object { [char]$_ })
    if ($magic -eq 'PGDMP') {
      $restoreRc = Invoke-PgRestoreArchive -PgRestorePath $pgTools.PgRestore -Database $database -SourceFile $restoreFile
    } else {
      $restoreRc = Invoke-PsqlRestore -PsqlPath $pgTools.Psql -Database $database -SourceFile $restoreFile
    }
    if ($restoreRc -eq 0) { Write-Ok 'Restore complete' } else { Write-WarnLine "Restore exited $restoreRc - review output above" }
  } else {
    Write-Info 'No --restore given - keeping the current data'
  }

  Show-Banner 'Sync - step 7/7: Restart'
  if ($NoRestart) {
    Write-WarnLine '--no-restart given. Start manually: deploy\start.cmd'
    exit 0
  }
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start.ps1')
  if ($LASTEXITCODE -ne 0) { Fail-Step 'start.ps1 failed' }

  Write-Host ''
  if ($CodeOnly) {
    Write-Ok 'Code-only sync complete. No database backup or migration was run.'
  } elseif ($Version) {
    Write-Ok "Sync complete. Version: $Version"
  } else {
    Write-Ok 'Sync complete.'
  }
  if (-not $NoBackup -and -not $CodeOnly) { Write-Ok "Pre-sync backup: $backupFile" }
} finally {
  Pop-Location
}
