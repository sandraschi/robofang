# start-bridge-headless.ps1 - robofang bridge (:10871) for fleet-watchdog spawn.
# Mirrors run_bridge_console.ps1 env but stays attached (watchdog tracks the PID).
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$env:PORT = "10871"
$env:ROBOFANG_BRIDGE_HOST = "127.0.0.1"  # fleet consumers hit localhost:10871; don't bind tailnet
$env:ROBOFANG_FLEET_MANIFEST = "$RepoRoot\fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR = "$RepoRoot\hands"
Set-Location $RepoRoot
& "$RepoRoot\.venv\Scripts\python.exe" -m robofang.main
