# Setup-RoboFangSandbox.ps1 - runs INSIDE Windows Sandbox
# Auto-installs winget (via App Installer bundle), Python, Git, Node.js, just, then clones robofang and installs it.

Write-Host "=== RoboFang Sandbox setup starting ===" -ForegroundColor Cyan

$assetRoot = "C:\Assets"  # inside Sandbox, mapped from repo's infra\sandbox
if (-not (Test-Path $assetRoot)) {
    Write-Host "Assets folder not found at $assetRoot. This path exists only INSIDE Sandbox when launched via RoboFangSandbox.wsb." -ForegroundColor Red
    return
}

Set-Location $assetRoot

# 1) Install App Installer (winget) from bundle in this folder
$bundle = Get-ChildItem -File | Where-Object {
    $_.Name -like "*.msixbundle" -or $_.Name -like "Microsoft.DesktopAppInstaller_*"
} | Select-Object -First 1

if (-not $bundle) {
    Write-Host "No App Installer bundle (*.msixbundle) found in $assetRoot" -ForegroundColor Red
    Write-Host "Download one from https://github.com/microsoft/winget-cli/releases and place it here." -ForegroundColor DarkYellow
    return
}

Write-Host "Installing App Installer from $($bundle.Name)..." -ForegroundColor Yellow
Add-AppxPackage -Path $bundle.FullName

# 2) Install base tools via winget: Python, Git, Node, just
Write-Host "Installing Python, Git, Node.js LTS, and just via winget..." -ForegroundColor Yellow

winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
winget install -e --id Casey.Just --accept-package-agreements --accept-source-agreements

# 3) Clone robofang and run editable install (keep everything under C:\Assets)
$codeRoot = Join-Path $assetRoot "code"
New-Item -ItemType Directory -Path $codeRoot -Force | Out-Null
Set-Location $codeRoot

$repoUrl = "https://github.com/sandraschi/robofang"
$repoName = "robofang"

Write-Host "Cloning $repoUrl ..." -ForegroundColor Yellow
git clone $repoUrl
Set-Location (Join-Path $codeRoot $repoName)

Write-Host "Running editable install (python -m pip install -e .)..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install -e .

Write-Host ""
Write-Host "RoboFang is installed inside this Sandbox." -ForegroundColor Green
Write-Host "To start the hub in this session:" -ForegroundColor Cyan
Write-Host "  cd C:\Assets\code\$repoName"
Write-Host "  .\robofang-hub\start.bat"
Write-Host ""
Write-Host "=== RoboFang Sandbox setup complete ===" -ForegroundColor Green

