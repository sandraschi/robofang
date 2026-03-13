# Run the bridge in the foreground so you see the real error (no supervisor, no hub).
# Use this when start.bat fails and you need the Python traceback.
$RepoRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
$VenvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (Test-Path $VenvPython) { $Python = $VenvPython } else { $Python = "python" }

$env:PYTHONPATH = "$RepoRoot\src;$env:PYTHONPATH"
$env:PORT = "10871"
$env:ROBOFANG_FLEET_MANIFEST = "$RepoRoot\fleet_manifest.yaml"
$env:ROBOFANG_HANDS_DIR = "$RepoRoot\hands"

Set-Location $RepoRoot
Write-Host "Starting bridge on 10871 (Ctrl+C to stop). If it crashes, the traceback is below." -ForegroundColor Cyan
& $Python -m robofang.main
