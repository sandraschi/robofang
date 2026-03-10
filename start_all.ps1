# start_all.ps1
# robofang - start supervisor + dashboard in one command.
# Run from the repo root:  .\start_all.ps1

param(
    [switch]$StartBridge,
    [switch]$StopOnly
)

$Python = "C:\Users\sandr\AppData\Local\Programs\Python\Python313\python.exe"
$RepoRoot = $PSScriptRoot
$SrcDir = Join-Path $RepoRoot "src"

# -- Setup Environment ---------------------------------------------------------
$env:PYTHONPATH = "$SrcDir;$env:PYTHONPATH"

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
Write-Host "  Dashboard:  http://localhost:10870" -ForegroundColor DarkGray
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

# -- 1.1 Start MCP Substrate (Sidecar) -----------------------------------------
Write-Host "[1.1/3] Starting MCP Substrate on :10867 ..." -ForegroundColor Yellow
$McpLog = "$TempDir\mcp_substrate_$(Get-Date -Format 'HHmmss').log"
$McpProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.mcp_server", "sse" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $McpLog `
    -RedirectStandardError  "$McpLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    MCP Substrate PID: $($McpProc.Id) (log: $McpLog)" -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# -- 2. Optionally start bridge via supervisor ---------------------------------
if ($StartBridge) {
    Write-Host "[2/3] Starting bridge via supervisor ..." -ForegroundColor Yellow
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:10872/supervisor/start" `
            -Method POST -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-Host "    Bridge start response: $($r.Content)" -ForegroundColor DarkGray
        
        Write-Host "    Executing Base Connector Wave (Plex, HA, Tasmota, Netatmo) ..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        # Use the Bridge's start_connectors logic if the bridge exposes an endpoint, 
        # or simply rely on the bridge's internal 'start connectors on boot' if we enabled that.
        # Since we want explicit feedback, we call the connector-start via bridge if available,
        # or just wait. For now, the bridge starts them if configured.
    }
    catch {
        Write-Host "    Failed to start bridge: $_" -ForegroundColor Red
    }
    Start-Sleep -Seconds 4
}
else {
    Write-Host "[2/3] Bridge not started (use dashboard Status page or -StartBridge flag)" -ForegroundColor DarkGray
}

# -- 3. Start dashboard --------------------------------------------------------
Write-Host "[3/3] Starting dashboard dev server ..." -ForegroundColor Yellow
$DashDir = Join-Path $RepoRoot "dashboard"
if (-not (Test-Path $DashDir)) {
    Write-Host "    Dashboard directory not found: $DashDir" -ForegroundColor Red
    exit 1
}

Set-Location $DashDir

# Use start.ps1 if it exists, otherwise npm run dev
$StartScript = Join-Path $DashDir "start.ps1"
if (Test-Path $StartScript) {
    Write-Host "    Using dashboard\start.ps1 ..." -ForegroundColor DarkGray
    & $StartScript
}
else {
    Write-Host "    Running: npm run dev" -ForegroundColor DarkGray
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -NoNewWindow
}
