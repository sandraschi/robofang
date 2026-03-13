# start_all.ps1
# robofang - start supervisor + dashboard in one command.
# Run from the repo root:  .\start_all.ps1
#
# Bridge: Always started here as "python -m robofang.main" (real Sovereign Bridge).
# Do not call supervisor/start from this script; that would start a second bridge and conflict on :10871.

param(
    [switch]$StartBridge,
    [switch]$StopOnly
)

$Python = "C:\Users\sandr\AppData\Local\Programs\Python\Python313\python.exe"
$RepoRoot = $PSScriptRoot
$SrcDir = Join-Path $RepoRoot "src"

# -- Setup Environment ---------------------------------------------------------
$env:PYTHONPATH = "$SrcDir;$env:PYTHONPATH"
# Fleet installer: clone to repo/hands, manifest at repo root (so install works without env)
$env:ROBOFANG_FLEET_MANIFEST = Join-Path $RepoRoot "fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR     = Join-Path $RepoRoot "hands"

# -- Temp dir for logs ---------------------------------------------------------
$TempDir = "D:\Dev\repos\temp"
if (-not (Test-Path $TempDir)) { New-Item -ItemType Directory -Path $TempDir | Out-Null }

Write-Host ""
Write-Host "  robofang Launcher" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Repo:       $RepoRoot" -ForegroundColor DarkGray
Write-Host "  Python:     $Python" -ForegroundColor DarkGray
Write-Host "  Supervisor: http://localhost:10872" -ForegroundColor DarkGray
Write-Host "  Bridge:     http://localhost:10871" -ForegroundColor DarkGray
Write-Host "  Hub:        http://localhost:10870  (configure MCP, LLM, auth)" -ForegroundColor DarkGray
Write-Host ""

# -- 0. Clear ports ------------------------------------------------------------
Write-Host "[0/3] Clearing ports (10870, 10871, 10872) ..." -ForegroundColor Yellow

function Stop-PortApp($port) {
    try {
        $proc = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($proc) {
            $foundPids = $proc.OwningProcess | Select-Object -Unique
            foreach ($foundPid in $foundPids) {
                if ($foundPid -gt 4) {
                    Write-Host "    Killing process on port $port (PID: $foundPid) ..." -ForegroundColor DarkGray
                    Stop-Process -Id $foundPid -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
    catch { }
}

Stop-PortApp 10870
Stop-PortApp 10871
Stop-PortApp 10872

if ($StopOnly) {
    Write-Host "    Ports cleared. Exiting (-StopOnly set)." -ForegroundColor Green
    exit 0
}

# -- 1. Start supervisor -------------------------------------------------------
Write-Host "[1/3] Starting supervisor on :10872 ..." -ForegroundColor Yellow

$SupLog = "$TempDir\supervisor_$(Get-Date -Format 'HHmmss').log"
$SupProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.supervisor" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $SupLog `
    -RedirectStandardError  "$SupLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Supervisor PID: $($SupProc.Id)  (log: $SupLog)" -ForegroundColor DarkGray
Start-Sleep -Seconds 3

# Quick health check
try {
    $r = Invoke-WebRequest -Uri "http://localhost:10872/supervisor/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "    Supervisor: ONLINE" -ForegroundColor Green
}
catch {
    Write-Host "    Supervisor: did not respond in time - check $SupLog.err" -ForegroundColor Red
}

# -- 1.1 Start real Bridge on :10871 (robofang.main = Sovereign Bridge; no mock/placeholder)
Write-Host "[1.1/3] Starting RoboFang Bridge on :10871 (python -m robofang.main) ..." -ForegroundColor Yellow
$McpLog = "$TempDir\bridge_$(Get-Date -Format 'HHmmss').log"
$McpProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.main" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $McpLog `
    -RedirectStandardError  "$McpLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Bridge PID: $($McpProc.Id) (log: $McpLog)" -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# -- 2. Bridge already running from step 1.1 (real robofang.main). Do NOT call
#    supervisor/start here: that would start a second bridge process and conflict on :10871.
#    Use dashboard Status page to start/stop bridge via supervisor if you prefer supervisor-led.
if ($StartBridge) {
    Write-Host "[2/3] Bridge already running (step 1.1). Connectors auto-launch from bridge config." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}
else {
    Write-Host "[2/3] Bridge running on :10871 (started in step 1.1). Use dashboard Status for supervisor control." -ForegroundColor DarkGray
}

# -- 3. Start hub (config UI: MCP servers, LLM, auth) --------------------------
Write-Host "[3/3] Starting hub dev server ..." -ForegroundColor Yellow
$DashDir = Join-Path $RepoRoot "robofang-hub"
if (-not (Test-Path $DashDir)) {
    Write-Host "    Hub directory not found: $DashDir" -ForegroundColor Red
    exit 1
}

Set-Location $DashDir

# Use start.ps1 if it exists, otherwise npm run dev
$StartScript = Join-Path $DashDir "start.ps1"
if (Test-Path $StartScript) {
    Write-Host "    Using robofang-hub\start.ps1 ..." -ForegroundColor DarkGray
    & $StartScript
}
else {
    Write-Host "    Running: npm run dev" -ForegroundColor DarkGray
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -NoNewWindow
}
