param(
  [string]$ServerHost = $env:COMPUTERNAME,
  [string]$DatabaseUrl = '',
  [string]$Dump = '',
  [switch]$SkipDbRestore,
  [string]$UiPort = '5173',
  [string]$ApiPort = '4000',
  [string]$AdminPassword = '',
  [string]$JwtSecret = ''
)

$runtimePath = Join-Path $PSScriptRoot 'runtime.ps1'
. $runtimePath

$installDir = Get-InstallDir
Show-Banner 'Windows Install'
Assert-Command -CommandName 'git' -Hint 'Install Git for Windows.'
Assert-Command -CommandName 'powershell' -Hint 'PowerShell is required.'
Test-NodeVersion

if (-not $DatabaseUrl) {
  $existingEnv = Read-KeyValueFile (Join-Path $installDir 'server\.env')
  if ($existingEnv['DATABASE_URL']) {
    $DatabaseUrl = $existingEnv['DATABASE_URL']
    Write-Info 'Reusing DATABASE_URL from server/.env'
  }
}
if (-not $DatabaseUrl) {
  Fail-Step 'Provide -DatabaseUrl for Windows installation, or create server/.env first.'
}

$pgTools = Get-PgTooling
$database = Parse-DatabaseUrl $DatabaseUrl
if (-not $Dump -and (Test-Path -LiteralPath (Join-Path $installDir 'scripts\backup.dump'))) {
  $Dump = Join-Path $installDir 'scripts\backup.dump'
}
if (-not $AdminPassword) { $AdminPassword = [guid]::NewGuid().ToString('N').Substring(0, 18) }
if (-not $JwtSecret) { $JwtSecret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')) }

Show-Banner 'Step 1/5: Dependencies'
Invoke-Npm -Arguments @('install','--no-fund','--no-audit') -WorkingDirectory $installDir
Invoke-Npm -Arguments @('install','--prefix','server','--no-fund','--no-audit') -WorkingDirectory $installDir
Write-Ok 'npm dependencies installed'

Show-Banner 'Step 2/5: Configuration'
$frontendOrigin = "https://$ServerHost`:$UiPort"
$serverEnvPath = Join-Path $installDir 'server\.env'
$serverEnv = @(
  "DATABASE_URL=$DatabaseUrl",
  '',
  "PORT=$ApiPort",
  'NODE_ENV=development',
  "FRONTEND_ORIGIN=$frontendOrigin",
  '',
  'OKTA_ISSUER=',
  'OKTA_AUDIENCE=api://default',
  'OKTA_CLIENT_ID=',
  'OKTA_MANAGER_CLAIM=manager',
  'OKTA_MANAGER_ID_CLAIM=managerId',
  '',
  'ENABLE_LOCAL_ADMIN=true',
  'LOCAL_ADMIN_USERNAME=admin',
  "LOCAL_ADMIN_PASSWORD=$AdminPassword",
  "LOCAL_ADMIN_JWT_SECRET=$JwtSecret"
)
Set-Content -LiteralPath $serverEnvPath -Value ($serverEnv -join [Environment]::NewLine) -Encoding UTF8

$hubEnvPath = Join-Path $installDir 'deploy\hub.env'
$hubEnv = [ordered]@{
  APP_NAME = 'hcl-learning-hub'
  SERVER_FQDN = $ServerHost
  UI_PORT = $UiPort
  API_PORT = $ApiPort
  GIT_BRANCH = 'main'
}
Write-KeyValueFile -Path $hubEnvPath -Values $hubEnv

$credsPath = Join-Path $installDir '.deploy-credentials'
$creds = [ordered]@{
  INSTALL_DIR = $installDir
  SERVER_FQDN = $ServerHost
  ACCESS_URL = $frontendOrigin
  DATABASE_URL = $DatabaseUrl
  JWT_SECRET = $JwtSecret
  ADMIN_USERNAME = 'admin@local'
  ADMIN_PASSWORD = $AdminPassword
}
Write-KeyValueFile -Path $credsPath -Values $creds
Write-Ok 'server/.env, deploy/hub.env, and .deploy-credentials written'

Show-Banner 'Step 3/5: Certificates'
Push-Location $installDir
try {
  & node scripts/generate-certs.js
  if ($LASTEXITCODE -ne 0) { Fail-Step 'Certificate generation failed' }
} finally {
  Pop-Location
}
Write-Ok 'Certificates ready'

Show-Banner 'Step 4/5: Database'
Invoke-Npm -Arguments @('run','prisma:generate','--prefix','server') -WorkingDirectory $installDir
Invoke-Npm -Arguments @('run','prisma:deploy','--prefix','server') -WorkingDirectory $installDir
if (-not $SkipDbRestore -and $Dump) {
  if (-not (Test-Path -LiteralPath $Dump)) {
    Fail-Step "Dump file not found: $Dump"
  }
  if (-not (Test-Path -LiteralPath $pgTools.PgRestore)) {
    Write-WarnLine 'pg_restore.exe not found - skipping dump restore'
  } else {
    $restoreRc = Invoke-PgRestoreArchive -PgRestorePath $pgTools.PgRestore -Database $database -SourceFile $Dump
    if ($restoreRc -ne 0) { Write-WarnLine 'pg_restore reported an issue - review output above' }
  }
}
Invoke-Npm -Arguments @('run','seed:admin') -WorkingDirectory $installDir
Write-Ok 'Prisma and admin seed complete'

Show-Banner 'Step 5/5: Finish'
Write-Host ""
Write-Ok "Application URL : $frontendOrigin"
Write-Ok "Admin login     : admin@local / $AdminPassword"
Write-Ok "Start command   : deploy\\start.cmd"
Write-Ok "Stop command    : deploy\\stop.cmd"
Write-Ok "Sync command    : deploy\\sync.cmd"
Write-Host ""
