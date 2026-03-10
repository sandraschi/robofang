# RoboFang Service Auditor
# SOTA 2026 Institutional Diagnostic Tool

$services = @(
    @{ Name = "RoboFang Nexus"; Port = 10867; Description = "Central Orchestrator" },
    @{ Name = "RoboFang Bridge"; Port = 10871; Description = "Moltbook/OSC/Plugin Bridge" },
    @{ Name = "RoboFang Dashboard"; Port = 10872; Description = "SOTA Web UI" },
    @{ Name = "Calibre MCP"; Port = 10720; Description = "Knowledge Hub Backend" },
    @{ Name = "Plex MCP"; Port = 10740; Description = "Knowledge Hub Backend" },
    @{ Name = "Immich MCP"; Port = 10839; Description = "Knowledge Hub Backend" },
    @{ Name = "Tapo MCP"; Port = 10716; Description = "Hardware Hub Backend" },
    @{ Name = "VRChat MCP"; Port = 10712; Description = "Robotics/VR Hub Backend" },
    @{ Name = "Home Assistant"; Port = 10835; Description = "Hardware Hub Backend" },
    @{ Name = "Docker MCP"; Port = 10807; Description = "Infrastructure Hub Backend" },
    @{ Name = "VirtualBox MCP"; Port = 10700; Description = "Infrastructure Hub Backend" }
)

Write-Host "`n=== RoboFang Alpha 0.1 Service Audit ===" -ForegroundColor Cyan
Write-Host "Institutional Standard: 10700-10872 Range`n" -ForegroundColor Gray

$results = foreach ($svc in $services) {
    $status = "OFFLINE"
    $color = "Red"
    
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("127.0.0.1", $svc.Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(200, $false)
        
        if ($wait -and $tcp.Connected) {
            $status = "ONLINE "
            $color = "Green"
        }
        $tcp.Close()
    }
    catch {
        # Silent fail for diagnostics
    }

    [PSCustomObject]@{
        Service     = $svc.Name
        Port        = $svc.Port
        Status      = $status
        Description = $svc.Description
        Color       = $color
    }
}

foreach ($res in $results) {
    Write-Host ("[{0}] {1,-20} port:{2,-5} - {3}" -f $res.Status, $res.Service, $res.Port, $res.Description) -ForegroundColor $res.Color
}

Write-Host "`nAudit Complete. Nexus connectivity target: 10867.`n" -ForegroundColor Cyan
