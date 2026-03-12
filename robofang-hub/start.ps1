# RoboFang Hub Start - Unified Redesign (V13.3)
$WebPort = 10870
$SupervisorPort = 10872
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = "python" # Assuming standard python in path, user has 3.13

# 1. Clear ports
Write-Host "[1/3] Clearing ports ($WebPort, $SupervisorPort) ..." -ForegroundColor Yellow
$pids = Get-NetTCPConnection -LocalPort $WebPort, $SupervisorPort -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
    Write-Host "    Terminating PID $p ..." -ForegroundColor DarkGray
    try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch { }
}

# 2. Start Supervisor (Background)
Write-Host "[2/3] Starting Supervisor on :$SupervisorPort ..." -ForegroundColor Cyan
$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$SupLog = "D:\Dev\repos\temp\supervisor_hub_$(Get-Date -Format 'HHmmss').log"

$SupProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.supervisor" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $SupLog `
    -RedirectStandardError "$SupLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Supervisor PID: $($SupProc.Id)" -ForegroundColor DarkGray
Start-Sleep -Seconds 2

# 3. Run Vite
Write-Host "[3/3] Starting RoboFang Hub on :$WebPort ..." -ForegroundColor Green
npm run dev
