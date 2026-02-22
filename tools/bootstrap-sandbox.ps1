# bootstrap-sandbox.ps1 - OpenFang Burner Bootstrap
# Executes inside Windows Sandbox to warm up the environment

Write-Host "Initializing OpenFang Burner Environment..." -ForegroundColor Yellow

# 1. Install Essential Tooling
Write-Host "Installing Dev Tools via Winget..."
winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
winget install -e --id Git.Git --accept-package-agreements

# 2. Add Python to Path for this session
$env:Path += ";C:\Program Files\Python311;C:\Program Files\Python311\Scripts"

# 3. Setup MCP dependencies
Write-Host "Installing MCP dependencies..."
pip install mcp docling pydantic qdrant-client

# 4. Create Exchange Bridge
if (-not (Test-Path "C:\Users\WDAGUtilityAccount\Desktop\exchange")) {
    New-Item -ItemType Directory -Path "C:\Users\WDAGUtilityAccount\Desktop\exchange" -Force
}

Write-Host "OpenFang Burner Ready. Awaiting instructions." -ForegroundColor Green
