param(
  [string]$WorkspaceRoot = 'D:\Windsurf',
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$patchesDir = Join-Path $RepoRoot 'patches'
$archivesDir = Join-Path $patchesDir 'version-archives'
$manifestPath = Join-Path $archivesDir 'manifest.json'
$currentRepoPath = [System.IO.Path]::GetFullPath($RepoRoot)
$currentReleasePath = Join-Path $RepoRoot 'releases\current-release.env'
$rootPackagePath = Join-Path $RepoRoot 'package.json'
$currentPackage = Get-Content -LiteralPath $rootPackagePath -Raw | ConvertFrom-Json
$latestTrackedMajor = [int]($currentPackage.version.ToString().Split('.')[0])
$deployedCurrentMajor = 6
if (Test-Path -LiteralPath $currentReleasePath) {
  $releaseMatch = Select-String -LiteralPath $currentReleasePath -Pattern '^PRODUCT_VERSION=(.+)$' | Select-Object -First 1
  if ($releaseMatch) {
    $releaseValue = $releaseMatch.Matches[0].Groups[1].Value.Trim()
    if ($releaseValue) {
      $deployedCurrentMajor = [int]($releaseValue.Split('.')[0])
    }
  }
}
$historicalMajors = @(3..$deployedCurrentMajor) | Select-Object -Unique
$preserveNotes = @{}

foreach ($major in 3..$latestTrackedMajor) {
  $versionFile = Join-Path $patchesDir ("version-{0}.json" -f $major)
  if (Test-Path -LiteralPath $versionFile) {
    try {
      $existing = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
      if ($existing.notes) { $preserveNotes[$major] = @($existing.notes) }
    } catch {}
  }
}

New-Item -ItemType Directory -Path $archivesDir -Force | Out-Null

$candidateDirs = Get-ChildItem -LiteralPath $WorkspaceRoot -Directory |
  Where-Object { $_.Name -like 'AI-Quest*' } |
  Sort-Object LastWriteTime, Name

if (-not $candidateDirs.Count) {
  throw "No AI-Quest snapshot folders were found under $WorkspaceRoot"
}

function Get-PackageVersionValue {
  param([string]$FilePath)
  if (-not (Test-Path -LiteralPath $FilePath)) { return '' }
  try {
    $json = Get-Content -LiteralPath $FilePath -Raw | ConvertFrom-Json
    return [string]$json.version
  } catch {
    return ''
  }
}

function Copy-SnapshotToStage {
  param(
    [string]$Source,
    [string]$Stage
  )
  if (Test-Path -LiteralPath $Stage) {
    Remove-Item -LiteralPath $Stage -Recurse -Force
  }
  New-Item -ItemType Directory -Path $Stage -Force | Out-Null
  $sourcePath = Join-Path $Source '*'
  Copy-Item -Path $sourcePath -Destination $Stage -Recurse -Force -Exclude 'node_modules', '.git', 'dist', 'build', 'coverage', 'logs', 'backups', 'releases', '*.dump', '*.zip' -ErrorAction SilentlyContinue
  $nestedArchives = Join-Path $Stage 'patches\version-archives'
  if (Test-Path -LiteralPath $nestedArchives) {
    Remove-Item -LiteralPath $nestedArchives -Recurse -Force
  }
}

$historicalDirs = @($candidateDirs | Where-Object { [System.IO.Path]::GetFullPath($_.FullName) -ne $currentRepoPath })
$currentDir = $candidateDirs | Where-Object { [System.IO.Path]::GetFullPath($_.FullName) -eq $currentRepoPath } | Select-Object -First 1
if (-not $currentDir) {
  $currentDir = Get-Item -LiteralPath $currentRepoPath
}

$minorCounters = @{}
foreach ($major in $historicalMajors) { $minorCounters[$major] = 0 }
$historicalCount = $historicalDirs.Count
$historicalRecords = @()

for ($index = 0; $index -lt $historicalCount; $index += 1) {
  $dir = $historicalDirs[$index]
  $bucket = if ($historicalCount -gt 0) {
    [Math]::Min([int][Math]::Floor(($index * $historicalMajors.Count) / $historicalCount), $historicalMajors.Count - 1)
  } else {
    0
  }
  $major = $historicalMajors[$bucket]
  $minor = $minorCounters[$major]
  $minorCounters[$major] = $minor + 1
  $versionLabel = "{0}.{1}" -f $major, $minor
  $historicalRecords += [PSCustomObject]@{
    Directory = $dir
    Version = $versionLabel
    Major = $major
    Minor = $minor
  }
}

$currentVersionLabel = "{0}.0" -f $latestTrackedMajor
$currentRecord = [PSCustomObject]@{
  Directory = $currentDir
  Version = $currentVersionLabel
  Major = $latestTrackedMajor
  Minor = 0
}

$allRecords = @($historicalRecords + $currentRecord)
$manifestEntries = @()
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('ai-quest-version-archives-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

try {
  foreach ($record in $allRecords) {
    $dir = $record.Directory
    $versionLabel = [string]$record.Version
    $zipName = "version-{0}.zip" -f ($versionLabel -replace '\.', '-')
    $zipPath = Join-Path $archivesDir $zipName
    $stagePath = Join-Path $tempRoot ($zipName -replace '\.zip$', '')
    Copy-SnapshotToStage -Source $dir.FullName -Stage $stagePath
    if (Test-Path -LiteralPath $zipPath) {
      Remove-Item -LiteralPath $zipPath -Force
    }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagePath, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    Remove-Item -LiteralPath $stagePath -Recurse -Force
    $packageVersion = Get-PackageVersionValue -FilePath (Join-Path $dir.FullName 'package.json')
    $serverPackageVersion = Get-PackageVersionValue -FilePath (Join-Path $dir.FullName 'server\package.json')
    $modifiedAt = $dir.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ss')
    $manifestEntries += [PSCustomObject]@{
      version = $versionLabel
      majorVersion = $record.Major
      minorVersion = $record.Minor
      archiveFile = "patches/version-archives/$zipName"
      sourceDirectory = $dir.FullName
      modifiedAt = $modifiedAt
      folderName = $dir.Name
      packageVersion = $packageVersion
      serverPackageVersion = $serverPackageVersion
      notes = @(
        "Archive imported from snapshot folder '$($dir.Name)'.",
        "Snapshot modified at $modifiedAt."
      )
    }
  }
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

$manifest = [PSCustomObject]@{
  generatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
  workspaceRoot = $WorkspaceRoot
  repoRoot = $RepoRoot
  currentVersion = $currentVersionLabel
  entries = @($manifestEntries | Sort-Object { [int]($_.majorVersion) }, { [int]($_.minorVersion) })
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$archiveGroups = $manifest.entries | Group-Object majorVersion
foreach ($group in $archiveGroups) {
  $major = [int]$group.Name
  $versionFile = Join-Path $patchesDir ("version-{0}.json" -f $major)
  $existing = if (Test-Path -LiteralPath $versionFile) {
    Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
  } else {
    [PSCustomObject]@{
      version = [string]$major
      displayVersion = "${major}.0.0"
      defaultNextPatch = "${major}.1"
      status = if ($major -eq $deployedCurrentMajor) { 'current' } elseif ($major -eq $latestTrackedMajor) { 'next-upgrade' } elseif ($major -lt $deployedCurrentMajor) { 'archived' } else { 'next-upgrade' }
      recordedReleaseMetadata = $false
      releaseMetadataSource = 'version archive manifest'
      releaseFile = ''
      notes = @()
    }
  }
  $ordered = @($group.Group | Sort-Object { [int]($_.minorVersion) })
  $first = $ordered[0]
  $last = $ordered[-1]
  $minorVersions = @()
  foreach ($entry in $ordered) {
    $minorVersions += [PSCustomObject]@{
      version = [string]$entry.version
      releaseFile = if ($existing.releaseFile -and $entry.minorVersion -eq 0 -and $major -ge 5 -and $major -le $deployedCurrentMajor) { [string]$existing.releaseFile } else { '' }
      archiveFile = [string]$entry.archiveFile
      archiveSourceDirectory = [string]$entry.sourceDirectory
      archiveModifiedAt = [string]$entry.modifiedAt
      notes = @($entry.notes)
    }
  }
  $defaultNextPatch = if ($major -eq $deployedCurrentMajor) {
    "{0}.{1}" -f $major, ([int]$last.minorVersion + 1)
  } else {
    [string]$existing.defaultNextPatch
  }
  $notes = if ($preserveNotes.ContainsKey($major)) {
    @($preserveNotes[$major])
  } else {
    @(
      "Archive-backed version history generated from snapshot folders under $WorkspaceRoot.",
      "Latest imported snapshot for major $major is '$($last.folderName)'."
    )
  }
  $resolvedVersion = if ($existing.version) { [string]$existing.version } else { [string]$major }
  $resolvedDisplayVersion = if ($existing.displayVersion) { [string]$existing.displayVersion } else { "${major}.0.0" }
  $resolvedReleaseMetadataSource = if ($existing.releaseMetadataSource) { [string]$existing.releaseMetadataSource } else { '' }
  $resolvedReleaseFile = if ($existing.releaseFile) { [string]$existing.releaseFile } else { '' }
  $updated = [ordered]@{
    version = $resolvedVersion
    displayVersion = $resolvedDisplayVersion
    defaultNextPatch = $defaultNextPatch
    status = if ($major -eq $deployedCurrentMajor) { 'current' } elseif ($major -eq ($deployedCurrentMajor - 1)) { 'previous' } elseif ($major -lt $deployedCurrentMajor) { 'archived' } else { 'next-upgrade' }
    recordedReleaseMetadata = [bool]($existing.recordedReleaseMetadata)
    releaseMetadataSource = $resolvedReleaseMetadataSource
    releaseFile = $resolvedReleaseFile
    archiveFile = [string]$first.archiveFile
    archiveSourceDirectory = [string]$first.sourceDirectory
    archiveModifiedAt = [string]$first.modifiedAt
    minorVersions = $minorVersions
    notes = $notes
  }
  $updated | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $versionFile -Encoding UTF8
}

$indexPath = Join-Path $patchesDir 'index.json'
$index = Get-Content -LiteralPath $indexPath -Raw | ConvertFrom-Json
$index.currentVersion = [string]$deployedCurrentMajor
$index.nextUpgradeVersion = [string]$latestTrackedMajor
$updatedVersions = @()
foreach ($entry in $index.availableVersions) {
  $major = [int]$entry.version
  $matchingManifest = $manifest.entries | Where-Object { [int]$_.majorVersion -eq $major } | Sort-Object { [int]$_.minorVersion }
  if ($matchingManifest.Count -gt 0) {
    $nextPatch = if ($major -eq $deployedCurrentMajor) {
      "{0}.{1}" -f $major, ([int]$matchingManifest[-1].minorVersion + 1)
    } else {
      [string]$entry.defaultNextPatch
    }
    $status = if ($major -eq $deployedCurrentMajor) { 'current' } elseif ($major -eq ($deployedCurrentMajor - 1)) { 'previous' } elseif ($major -lt $deployedCurrentMajor) { 'archived' } else { 'next-upgrade' }
    $updatedVersions += [PSCustomObject]@{
      version = [string]$entry.version
      displayVersion = [string]$entry.displayVersion
      defaultNextPatch = $nextPatch
      status = $status
      metadataFile = [string]$entry.metadataFile
    }
  } else {
    $updatedVersions += $entry
  }
}
$index.availableVersions = $updatedVersions
$index | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $indexPath -Encoding UTF8

Write-Output ("Created {0} version archives in {1}" -f $manifest.entries.Count, $archivesDir)
