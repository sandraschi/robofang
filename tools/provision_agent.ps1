# OpenFang Agent Provisioning Script (Sandbox)
# This script runs inside the Windows Sandbox to prepare the environment.

Write-Host "--- OpenFang Agent Bootstrapping ---" -ForegroundColor Cyan

# 1. Set up Paths
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$RepoPath = "$DesktopPath\repos"
$OpenFangPath = "$RepoPath\openfang"

# 2. Install Essentials (if not present)
# Note: Sandbox is disposable, but we want fast startup.
Write-Host "Checking for Python..."
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Python via winget..."
    winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
}

# 3. Provision Environment
Write-Host "Installing core dependencies..."
pip install mcp --quiet

# 4. Map Federation Logic
if (Test-Path "$OpenFangPath\configs\federation_map.json") {
    Write-Host "Federation Map found. Agent is context-aware." -ForegroundColor Green
}
else {
    Write-Warning "Federation Map missing. Agent is operating in isolation."
}

# 5. Launch Heartbeat Monitor (Guest Side)
Write-Host "Starting Guest Heartbeat..."
# Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Write-Host 'Guest Heartbeat Active'"

Write-Host "--- Provisioning Complete. Agent Ready. ---" -ForegroundColor Green
