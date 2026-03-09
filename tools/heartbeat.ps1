# heartbeat.ps1 - robofang Federated Fleet Surveiller
# Native PowerShell Syntax Mandatory

$pulsePath = "$PSScriptRoot/../configs/pulse.json"
$fleetRoot = "d:/dev/repos"
$targetPorts = 10700..10800 # robofang standard port range

function Get-SystemPulse {
    $pulse = @{
        timestamp         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        fleet_status      = @{}
        docker_status     = @{}
        virtualbox_status = @{}
        registry_status   = @{}
    }

    # 1. Check Docker Containers
    try {
        $containers = docker ps --format '{{.Names}}|{{.Status}}'
        foreach ($c in $containers) {
            $parts = $c.Split('|')
            $pulse.docker_status[$parts[0]] = $parts[1]
        }
    }
    catch {
        $pulse.docker_status["error"] = "Docker daemon unreachable"
    }

    # 2. Check VirtualBox
    try {
        $vms = VBoxManage list runningvms
        foreach ($vm in $vms) {
            if ($vm -match '"(.+)"') { $pulse.virtualbox_status[$matches[1]] = "running" }
        }
    }
    catch {
        $pulse.virtualbox_status["error"] = "VBoxManage not in PATH"
    }

    # 3. Scan d:/dev/repos for existence of MCP servers in registry
    # We use Get-ChildItem to verify the directories are present
    $mcpFolders = Get-ChildItem -Path $fleetRoot -Directory -Filter "*-mcp*"
    foreach ($folder in $mcpFolders) {
        $pulse.registry_status[$folder.Name] = "PRESENT"
    }

    # 4. Port Scanning (Standard Range)
    foreach ($port in $targetPorts) {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet
        if ($connection) {
            $pulse.fleet_status["$port"] = "ONLINE"
        }
    }

    return $pulse | ConvertTo-Json -Depth 10
}

Write-Host "robofang Federated Heartbeat started. Monitoring fleet at $fleetRoot..." -ForegroundColor Cyan
while ($true) {
    try {
        $currentPulse = Get-SystemPulse
        $currentPulse | Out-File -FilePath $pulsePath -Encoding utf8
    }
    catch {
        Write-Error "Heartbeat cycle failed: $_"
    }
    Start-Sleep -Seconds 30
}
