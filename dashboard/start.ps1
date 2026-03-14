# Webapp Start - Standardized SOTA (Supervisor-Led V13.3)
# Ports from fleet schema: src/robofang/configs/fleet-stack-ports.json
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
$Python = "C:\Users\sandr\AppData\Local\Programs\Python\Python313\python.exe"

# 1. Zombie kill: clear stack ports before bind. taskkill fallback.
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

# 2. Setup
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) { 
    Write-Host "    Installing frontend dependencies ..." -ForegroundColor DarkGray
    npm install 
}

# 3. Start the Supervisor (Background)
Write-Host "[2/4] Starting Supervisor on :$SupervisorPort ..." -ForegroundColor Cyan
$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$SupLog = "D:\Dev\repos\temp\supervisor_dash_$(Get-Date -Format 'HHmmss').log"

$SupProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.supervisor" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $SupLog `
    -RedirectStandardError "$SupLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Supervisor PID: $($SupProc.Id)" -ForegroundColor DarkGray
Start-Sleep -Seconds 3

# 4. Start the Bridge via Supervisor (supervisor listens on $SupervisorPort)
Write-Host "[3/4] Triggering Bridge start ..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:$SupervisorPort/supervisor/start" -Method POST -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue | Out-Null
    Write-Host "    Bridge: SIGNALED" -ForegroundColor Green
}
catch {
    Write-Host "    Bridge: Supervisor did not respond. Check $SupLog.err" -ForegroundColor Red
}

# 5. Run Vite frontend
Write-Host "[4/4] Starting Vite frontend on :$WebPort ..." -ForegroundColor Green
npm run dev -- --port $WebPort --host

