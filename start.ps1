Param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 10871
$WebPort = 10870

# Port zombie clearing
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $WebPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Starting robofang bridge on port $BackendPort..." -ForegroundColor Cyan

# Start backend
$BackendJob = Start-Job -Name "robofang-bridge" -ScriptBlock { param($Root, $Port) Set-Location $Root; uv run python -m robofang.main } -ArgumentList $ScriptRoot, $BackendPort

# Readiness poll (60s timeout)
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/system/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}
    Start-Sleep 1
}
if (-not $ready) { Write-Warning "Backend not reachable after 60s — check logs." }

if (-not $BackendOnly -and $ready) {
    $HubDir = Join-Path $ScriptRoot "robofang-hub"
    if (Test-Path "$HubDir\package.json") {
        $Job = Start-Job -Name "robofang-hub" -ScriptBlock { param($Root, $Port) Set-Location $Root; npx vite --port $Port --host } -ArgumentList $HubDir, $WebPort
        $hubReady = $false
        for ($i = 0; $i -lt 30; $i++) {
            try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue; if ($r.StatusCode -eq 200) { $hubReady = $true; break } } catch {}
            Start-Sleep 1
        }
        if ($hubReady -and -not $NoBrowser) { Start-Process "http://127.0.0.1:$WebPort" }
    }
}

while ($true) {
    if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") { Receive-Job $BackendJob; break }
    Start-Sleep 2
}
