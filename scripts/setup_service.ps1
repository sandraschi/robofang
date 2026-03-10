# scripts/setup_service.ps1
# Configures RoboFang Supervisor as a Windows Service using NSSM.

param(
    [string]$NssmPath = "nssm",
    [string]$ServiceName = "RoboFangSupervisor",
    [switch]$Remove
)

$RepoRoot = $PSScriptRoot | Split-Path -Parent
$Python = "C:\Users\sandr\AppData\Local\Programs\Python\Python313\python.exe"
$SrcDir = Join-Path $RepoRoot "src"

# Check for Admin rights
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

if ($Remove) {
    Write-Host "Removing service $ServiceName..." -ForegroundColor Yellow
    & $NssmPath stop $ServiceName
    & $NssmPath remove $ServiceName confirm
    Write-Host "Service removed." -ForegroundColor Green
    exit 0
}

# Verify Python path
if (-not (Test-Path $Python)) {
    Write-Error "Python not found at $Python. Please update the path in this script."
    exit 1
}

Write-Host "Installing RoboFang Supervisor as Windows Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Root: $RepoRoot" -ForegroundColor DarkGray

# 1. Install service
& $NssmPath install $ServiceName $Python "-m robofang.supervisor"
& $NssmPath set $ServiceName AppDirectory $RepoRoot

# 2. Set Environment
$EnvString = "PYTHONPATH=$SrcDir"
& $NssmPath set $ServiceName AppEnvironmentExtra $EnvString

# 3. Configure Restart/Logs
& $NssmPath set $ServiceName AppStdout "$RepoRoot\logs\supervisor_service.log"
& $NssmPath set $ServiceName AppStderr "$RepoRoot\logs\supervisor_service.err"
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateOnline 1
& $NssmPath set $ServiceName AppRotateSeconds 86400
& $NssmPath set $ServiceName AppRotateBytes 10485760

# 4. Start it
Write-Host "Starting service..." -ForegroundColor Yellow
& $NssmPath start $ServiceName

Write-Host "Done. RoboFang Supervisor is now running as a background service." -ForegroundColor Green
Write-Host "Check status: nssm status $ServiceName" -ForegroundColor DarkGray
