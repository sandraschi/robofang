# RoboFang Hub Start - Unified Redesign (V13.3)
# Ports from fleet schema: configs/fleet-stack-ports.json
$RepoRoot = Split-Path -Parent $PSScriptRoot
$PortsPath = Join-Path $RepoRoot "src\robofang\configs\fleet-stack-ports.json"
if (Test-Path $PortsPath) {
    $stack = Get-Content -Raw -Path $PortsPath | ConvertFrom-Json
    $WebPort = $stack.web_port
    $BridgePort = $stack.bridge_port
    $SupervisorPort = $stack.supervisor_port
} else {
    $WebPort = 10870
    $BridgePort = 10871
    $SupervisorPort = 10872
}
$VenvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (Test-Path $VenvPython) { $Python = $VenvPython } else { $Python = "python" }

# 0. Ensure deps so bridge can start (fixes missing e.g. tomli)
Write-Host "[0/4] Ensuring Python deps (pip install -e .) ..." -ForegroundColor Cyan
$pipResult = & $Python -m pip install -e $RepoRoot --quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  pip install failed:" -ForegroundColor Red
    $pipResult | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    exit 1
}
Write-Host "  Deps OK." -ForegroundColor DarkGray

# 1. Zombie kill: clear stack ports before bind. Inline + taskkill fallback.
$portsToClear = @($WebPort, $BridgePort, $SupervisorPort)
Write-Host "[1/4] Clearing ports ($WebPort, $BridgePort, $SupervisorPort) ..." -ForegroundColor Yellow
$pids = Get-NetTCPConnection -LocalPort $portsToClear -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
    try {
        Stop-Process -Id $p -Force -ErrorAction Stop
        Write-Host "    Terminated PID $p" -ForegroundColor DarkGray
    } catch {
        cmd /c "taskkill /F /PID $p 2>nul"
        if ($LASTEXITCODE -eq 0) { Write-Host "    Killed PID $p (taskkill)" -ForegroundColor DarkGray }
        else { Write-Warning "Failed to terminate PID $p : $_" }
    }
}
Start-Sleep -Seconds 1

# 2. Optional: start monitoring stack (Prometheus, Loki, Grafana). Set env ROBOFANG_START_MONITORING=1 to enable.
if ($env:ROBOFANG_START_MONITORING -eq "1") {
    Write-Host "[2a] Starting monitoring stack (stack name: monitoring) ..." -ForegroundColor Cyan
    Set-Location $RepoRoot
    docker compose -p monitoring -f infra/docker-compose.monitoring.yml up -d
    Set-Location $PSScriptRoot
    Write-Host "    Grafana: http://localhost:3001 (admin / robofang_admin). Loki job=robofang." -ForegroundColor DarkGray
}

# 3. Start Supervisor (Background). Supervisor auto-starts the bridge on $BridgePort.
Write-Host "[2/4] Starting Supervisor (and bridge) ..." -ForegroundColor Cyan
$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$env:PORT = "$BridgePort"
# Force Fleet Installer to use repo paths (fixes 'hands empty' when package root differs)
$env:ROBOFANG_FLEET_MANIFEST = "$RepoRoot\fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR = "$RepoRoot\hands"
$LogDir = Join-Path $RepoRoot "temp"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
$SupLog = Join-Path $LogDir "supervisor_hub_$(Get-Date -Format 'HHmmss').log"

$SupProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.supervisor" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $SupLog `
    -RedirectStandardError "$SupLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Supervisor PID: $($SupProc.Id) (bridge will listen on $BridgePort)" -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# 3. Wait for bridge to respond on $BridgePort (max 50s). Bridge startup is slow (orchestrator init).
Write-Host "[3/4] Waiting for bridge on $BridgePort (max 50s) ..." -ForegroundColor Cyan
$bridgeUp = $false
$lastError = $null
for ($i = 1; $i -le 50; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BridgePort/api/diagnostics/heartbeat" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $bridgeUp = $true; break }
    } catch {
        $lastError = $_.Exception.Message
    }
    if ($i % 5 -eq 0) { Write-Host "    ${i}s (last: $lastError) ..." -ForegroundColor DarkGray }
    Start-Sleep -Seconds 1
}
if (-not $bridgeUp) {
    Write-Host ""
    Write-Host "FAILED: Bridge did not respond. Last error: $lastError" -ForegroundColor Red
    Write-Host ""
    $bridgeLog = Join-Path $RepoRoot "temp\bridge_stdout.log"
    $supErr = "$SupLog.err"
    Write-Host "  Logs:" -ForegroundColor Yellow
    Write-Host "    Supervisor stderr: $supErr" -ForegroundColor White
    Write-Host "    Bridge stdout/crash: $bridgeLog" -ForegroundColor White
    Write-Host ""
    if (Test-Path $bridgeLog) {
        $lines = Get-Content $bridgeLog -ErrorAction SilentlyContinue
        $tail = if ($lines.Count -gt 50) { $lines[-50..-1] } else { $lines }
        Write-Host "  Bridge output (last 50 lines):" -ForegroundColor Yellow
        $tail | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
    if (Test-Path $supErr) {
        Write-Host "  Supervisor stderr (last 20 lines):" -ForegroundColor Yellow
        Get-Content $supErr -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
    exit 1
}

Write-Host "    Bridge is up." -ForegroundColor Green

# 4. Run Vite (hub) only when bridge is up. Explicit port so we never fall back to 8765 or Vite default.
Write-Host "[4/4] Starting RoboFang Hub on :$WebPort ..." -ForegroundColor Green
Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev -- --port $WebPort --host" `
    -WorkingDirectory $PSScriptRoot `
    -WindowStyle Normal
Write-Host "    Hub launched. Open http://localhost:$WebPort" -ForegroundColor Green
