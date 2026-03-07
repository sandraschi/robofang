# OpenFang Agent Provisioning Script (Sandbox)
# This script runs inside the Windows Sandbox to prepare the environment.

Write-Host "--- OpenFang Agent Bootstrapping ---" -ForegroundColor Cyan

# 1. Set up Paths
$OpenFangPath = Split-Path -Parent $PSScriptRoot
$LogPath = "$OpenFangPath\exchange\sandbox\boot.log"

"--- Bootstrapping started at $(Get-Date) ---" | Out-File -FilePath $LogPath
"PSScriptRoot: $PSScriptRoot" | Out-File -FilePath $LogPath -Append
"OpenFangPath: $OpenFangPath" | Out-File -FilePath $LogPath -Append

# 2. Install Essentials (if not present)
# Note: Sandbox is disposable, but we want fast startup.
Write-Host "Checking for Python..."
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Python via winget..."
    winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
}

# 3. Provision Environment
Write-Host "Installing core dependencies..."
pip install mcp --quiet

# 4. Map Federation Logic
if (Test-Path "$OpenFangPath\configs\federation_map.json") {
    Write-Host "Federation Map found. Agent is context-aware." -ForegroundColor Green
}
else {
    Write-Warning "Federation Map missing. Agent is operating in isolation."
}

# 5. Execute Staged Task
Write-Host "Searching for staged tasks..." -ForegroundColor Cyan
$SandboxExchange = "$OpenFangPath\exchange\sandbox"

if (Test-Path $SandboxExchange) {
    $LatestTask = Get-ChildItem -Path $SandboxExchange -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($LatestTask) {
        $TaskDir = $LatestTask.FullName
        $ScriptPath = Join-Path $TaskDir "execute_me.py"
        
        if (Test-Path $ScriptPath) {
            Write-Host "Executing task: $($LatestTask.Name)" -ForegroundColor Yellow
            
            # Record start in task.json if present
            $ManifestPath = Join-Path $TaskDir "task.json"
            if (Test-Path $ManifestPath) {
                $Manifest = Get-Content $ManifestPath | ConvertFrom-Json
                $Manifest.status = "RUNNING"
                $Manifest | ConvertTo-Json | Set-Content $ManifestPath
            }

            # Run the script and capture output
            $StdoutPath = Join-Path $TaskDir "stdout.txt"
            $StderrPath = Join-Path $TaskDir "stderr.txt"
            
            & python $ScriptPath > $StdoutPath 2> $StderrPath

            Write-Host "Task Complete. Results staged." -ForegroundColor Green
            
            # Finalize manifest
            if (Test-Path $ManifestPath) {
                $Manifest = Get-Content $ManifestPath | ConvertFrom-Json
                $Manifest.status = "COMPLETED"
                $Manifest.completion_time = (Get-Date).ToString()
                $Manifest | ConvertTo-Json | Set-Content $ManifestPath
            }
        }
        else {
            Write-Warning "Task directory found but execute_me.py is missing."
        }
    }
    else {
        Write-Host "No pending tasks found in exchange."
    }
}
else {
    Write-Error "Exchange directory not found: $SandboxExchange"
}

Write-Host "--- Provisioning Complete. Agent Ready. ---" -ForegroundColor Green
