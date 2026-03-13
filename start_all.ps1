# Start RoboFang Hub. Auto-runs setup on first run, then starts supervisor + bridge + Vite.
# Call from repo root (e.g. .\start.bat or .\start_all.ps1). Same result as robofang-hub\start.bat after setup.
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot
$HubScript = Join-Path $RepoRoot "robofang-hub\start.ps1"
$SetupScript = Join-Path $RepoRoot "setup.ps1"
$VenvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$HubReady = Test-Path (Join-Path $RepoRoot "robofang-hub\node_modules")

if (-not (Test-Path $HubScript)) {
    Write-Error "Not found: $HubScript. Run from repo root."
    exit 1
}
if (-not (Test-Path $VenvPython)) {
    Write-Host "First run: running setup.ps1 ..." -ForegroundColor Cyan
    & $SetupScript
    if (-not $?) { exit 1 }
} elseif (-not $HubReady) {
    Write-Host "Hub not built: running setup.ps1 ..." -ForegroundColor Cyan
    & $SetupScript
    if (-not $?) { exit 1 }
}
& $HubScript
