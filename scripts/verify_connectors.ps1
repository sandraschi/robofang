# SOTA Service Heartbeat Verification Script
# v1.0.0 (2026-02-27)

$services = @(
    @{ name = "Calibre"; url = "http://localhost:10701/health"; critical = $true },
    @{ name = "Plex"; url = "http://localhost:10711/health"; critical = $true },
    @{ name = "HomeAssistant"; url = "http://localhost:10721/health"; critical = $true },
    @{ name = "Tapo"; url = "http://localhost:10731/health"; critical = $true },
    @{ name = "Netatmo"; url = "http://localhost:10741/health"; critical = $true },
    @{ name = "Ring"; url = "http://localhost:10751/health"; critical = $true },
    @{ name = "Notion"; url = "http://localhost:10761/health"; critical = $true }
)

Write-Host "--- RoboFang Dashboard: Connector Verification ---" -ForegroundColor Cyan

$allPass = $true
foreach ($svc in $services) {
    Write-Host "Checking $($svc.name)... " -NoNewline
    try {
        $resp = Invoke-WebRequest -Uri $svc.url -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host "OK" -ForegroundColor Green
        }
        else {
            Write-Host "FAILED ($($resp.StatusCode))" -ForegroundColor Red
            if ($svc.critical) { $allPass = $false }
        }
    }
    catch {
        Write-Host "UNREACHABLE" -ForegroundColor Yellow
        if ($svc.critical) { $allPass = $false }
    }
}

if ($allPass) {
    Write-Host "`n[SUCCESS] All critical connectors are ready for v13.0 production." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n[WARNING] Some connectors are offline or unreachable." -ForegroundColor Red
    exit 1
}
