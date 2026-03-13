# One-shot setup: venv, pip install, .env, hub build. Idempotent. Run from repo root.
$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Set-Location $RepoRoot

# 1. Python venv
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[1/4] Creating .venv ..." -ForegroundColor Cyan
    python -m venv .venv
} else {
    Write-Host "[1/4] .venv exists." -ForegroundColor DarkGray
}
Write-Host "[2/4] Installing Python deps (pip install -e .) ..." -ForegroundColor Cyan
$venvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) { throw ".venv\Scripts\python.exe not found" }
# Ensure pip exists (some venvs are created without it)
& $venvPython -m ensurepip --upgrade 2>$null
& $venvPython -m pip install -e $RepoRoot --quiet
if (-not $?) { throw "pip install failed" }

# 2. .env from example if missing
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[3/4] Creating .env from .env.example ..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "[3/4] No .env.example; skipping .env." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[3/4] .env exists." -ForegroundColor DarkGray
}

# 3. Hub (Vite)
$HubDir = Join-Path $RepoRoot "robofang-hub"
if (Test-Path (Join-Path $HubDir "package.json")) {
    Write-Host "[4/4] Installing and building hub ..." -ForegroundColor Cyan
    Set-Location $HubDir
    npm install --silent
    if (-not $?) { Set-Location $RepoRoot; throw "npm install failed" }
    npm run build
    if (-not $?) { Set-Location $RepoRoot; throw "npm run build failed" }
    Set-Location $RepoRoot
} else {
    Write-Host "[4/4] robofang-hub not found; skipping." -ForegroundColor DarkGray
}

Write-Host "Setup done. Run .\start_all.ps1 to start." -ForegroundColor Green
