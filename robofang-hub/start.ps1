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

# 2. Start Supervisor (Background). Supervisor auto-starts the bridge on 10871.
Write-Host "[2/4] Starting Supervisor (and bridge) ..." -ForegroundColor Cyan
$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$env:PORT = "10871"
# Force Fleet Installer to use repo paths (fixes 'hands empty' when package root differs)
$env:ROBOFANG_FLEET_MANIFEST = "$RepoRoot\fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR = "$RepoRoot\hands"
$SupLog = "D:\Dev\repos\temp\supervisor_hub_$(Get-Date -Format 'HHmmss').log"
if (-not (Test-Path "D:\Dev\repos\temp")) { New-Item -ItemType Directory -Force -Path "D:\Dev\repos\temp" | Out-Null }

$SupProc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "robofang.supervisor" `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $SupLog `
    -RedirectStandardError "$SupLog.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "    Supervisor PID: $($SupProc.Id) (bridge will listen on 10871)" -ForegroundColor DarkGray
Start-Sleep -Seconds 3

# 3. Optional: ensure bridge is up (supervisor already auto-starts it)
Write-Host "[3/4] Checking bridge on 10871 ..." -ForegroundColor Cyan
$bridgeUp = $false
for ($i = 0; $i -lt 5; $i++) {
    try {
        $conn = Get-NetTCPConnection -LocalPort 10871 -State Listen -ErrorAction SilentlyContinue
        if ($conn) { $bridgeUp = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}
if ($bridgeUp) { Write-Host "    Bridge is listening." -ForegroundColor Green } else { Write-Host "    Bridge may still be starting; hub will proxy /api to 10871." -ForegroundColor Yellow }

# 4. Run Vite (hub). Vite proxies /api to bridge 10871.
Write-Host "[4/4] Starting RoboFang Hub on :$WebPort ..." -ForegroundColor Green
npm run dev
