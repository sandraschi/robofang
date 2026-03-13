# Setup-RoboFangSandbox.ps1 - runs INSIDE Windows Sandbox
# Requires in C:\Assets (mapped from repo infra\sandbox):
#   - DesktopAppInstaller_Dependencies.zip (from winget-cli release Assets)
#   - Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle
# Then: installs deps, winget, Python/Git/Node/just, clones robofang, pip install -e .

Write-Host "=== RoboFang Sandbox setup starting ===" -ForegroundColor Cyan

$assetRoot = "C:\Assets"
if (-not (Test-Path $assetRoot)) {
    Write-Host "Assets folder not found at $assetRoot. Run only inside Sandbox via RoboFangSandbox.wsb." -ForegroundColor Red
    exit 1
}

Set-Location $assetRoot

# 1) Install dependencies from zip (Windows App Runtime etc.)
$depsZip = Get-ChildItem -File | Where-Object { $_.Name -eq "DesktopAppInstaller_Dependencies.zip" } | Select-Object -First 1
if ($depsZip) {
    Write-Host "Extracting and installing dependencies from $($depsZip.Name)..." -ForegroundColor Yellow
    $depsDir = Join-Path $assetRoot "deps"
    if (Test-Path $depsDir) { Remove-Item -Recurse -Force $depsDir }
    Expand-Archive -Path $depsZip.FullName -DestinationPath $depsDir -Force
    $msixList = Get-ChildItem -Path $depsDir -Filter "*.msix" -Recurse | Sort-Object Name
    foreach ($msix in $msixList) {
        Write-Host "  Installing $($msix.Name)..." -ForegroundColor DarkGray
        try {
            Add-AppxPackage -Path $msix.FullName
        } catch {
            Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "DesktopAppInstaller_Dependencies.zip not found in $assetRoot." -ForegroundColor Yellow
}

# 2) Install App Installer (winget) bundle
$bundle = Get-ChildItem -File | Where-Object {
    $_.Name -like "*.msixbundle" -or $_.Name -like "Microsoft.DesktopAppInstaller_*"
} | Select-Object -First 1

if (-not $bundle) {
    Write-Host "No App Installer bundle (*.msixbundle) in $assetRoot." -ForegroundColor Red
    Write-Host "Download from https://github.com/microsoft/winget-cli/releases (Assets)." -ForegroundColor DarkYellow
    exit 1
}

Write-Host "Installing App Installer from $($bundle.Name)..." -ForegroundColor Yellow
try {
    Add-AppxPackage -Path $bundle.FullName
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3) Ensure winget is available (may need new process)
$wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
if (-not $wingetCmd) {
    Write-Host "winget not in PATH. Refreshing environment..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
}
if (-not $wingetCmd) {
    Write-Host "winget still not found. Open a NEW PowerShell in Sandbox and run this script again." -ForegroundColor Red
    exit 1
}

# 4) Install Python, Git, Node LTS, just
Write-Host "Installing Python, Git, Node.js LTS, just via winget..." -ForegroundColor Yellow
$wingetArgs = @("install", "-e", "--id", "Python.Python.3.12", "--accept-package-agreements", "--accept-source-agreements")
& winget @wingetArgs
if ($LASTEXITCODE -ne 0) { Write-Host "winget Python failed." -ForegroundColor Red; exit 1 }

$wingetArgs = @("install", "-e", "--id", "Git.Git", "--accept-package-agreements", "--accept-source-agreements")
& winget @wingetArgs
if ($LASTEXITCODE -ne 0) { Write-Host "winget Git failed." -ForegroundColor Red; exit 1 }

$wingetArgs = @("install", "-e", "--id", "OpenJS.NodeJS.LTS", "--accept-package-agreements", "--accept-source-agreements")
& winget @wingetArgs
if ($LASTEXITCODE -ne 0) { Write-Host "winget Node failed." -ForegroundColor Red; exit 1 }

$wingetArgs = @("install", "-e", "--id", "Casey.Just", "--accept-package-agreements", "--accept-source-agreements")
& winget @wingetArgs
if ($LASTEXITCODE -ne 0) { Write-Host "winget Just failed." -ForegroundColor Red; exit 1 }

# Refresh PATH for this session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# 5) Clone robofang and pip install -e .
$codeRoot = Join-Path $assetRoot "code"
New-Item -ItemType Directory -Path $codeRoot -Force | Out-Null
Set-Location $codeRoot

$repoUrl = "https://github.com/sandraschi/robofang"
$repoName = "robofang"

Write-Host "Cloning $repoUrl ..." -ForegroundColor Yellow
& git clone $repoUrl
if ($LASTEXITCODE -ne 0) { Write-Host "git clone failed." -ForegroundColor Red; exit 1 }

Set-Location (Join-Path $codeRoot $repoName)

Write-Host "Running pip install -e . ..." -ForegroundColor Yellow
& python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { Write-Host "pip upgrade failed." -ForegroundColor Red; exit 1 }
& python -m pip install -e .
if ($LASTEXITCODE -ne 0) { Write-Host "pip install -e . failed." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "RoboFang is installed." -ForegroundColor Green
Write-Host "To start the hub:" -ForegroundColor Cyan
Write-Host "  cd C:\Assets\code\$repoName"
Write-Host "  .\robofang-hub\start.bat"
Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
