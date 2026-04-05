set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Display the SOTA Industrial Dashboard
default:
    @powershell -NoLogo -Command " \
        $lines = Get-Content '{{justfile()}}'; \
        Write-Host ' [SOTA] Industrial Operations Dashboard v1.3.1' -ForegroundColor White -BackgroundColor Cyan; \
        Write-Host '' ; \
        $currentCategory = ''; \
        foreach ($line in $lines) { \
            if ($line -match '^# ── ([^─]+) ─') { \
                $currentCategory = $matches[1].Trim(); \
                Write-Host \"`n  $currentCategory\" -ForegroundColor Cyan; \
                Write-Host '  ' + ('─' * 45) -ForegroundColor Gray; \
            } elseif ($line -match '^# ([^─].+)') { \
                $desc = $matches[1].Trim(); \
                $idx = [array]::IndexOf($lines, $line); \
                if ($idx -lt $lines.Count - 1) { \
                    $nextLine = $lines[$idx + 1]; \
                    if ($nextLine -match '^([a-z0-9-]+):') { \
                        $recipe = $matches[1]; \
                        $pad = ' ' * [math]::Max(2, (18 - $recipe.Length)); \
                        Write-Host \"    $recipe\" -ForegroundColor White -NoNewline; \
                        Write-Host \"$pad$desc\" -ForegroundColor Gray; \
                    } \
                } \
            } \
        } \
        Write-Host \"`n  [System State: PROD/HARDENED]\" -ForegroundColor DarkGray; \
        Write-Host ''"

# ── Quality ───────────────────────────────────────────────────────────────────

# Execute Ruff SOTA v13.1 linting
lint:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check .

# Execute Ruff SOTA v13.1 fix and formatting
fix:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check . --fix --unsafe-fixes
    uv run ruff format .

# ── Hardening ─────────────────────────────────────────────────────────────────

# Execute Bandit security audit
check-sec:
    Set-Location '{{justfile_directory()}}'
    uv run bandit -r src/

# Execute safety audit of dependencies
audit-deps:
    Set-Location '{{justfile_directory()}}'
    uv run safety check

# RoboFang task runner (just – https://just.systems)
# Usage: just [recipe]   or   just --list

# Repo statistics (Markdown, tools, FastMCP, MCP tools)
stats:
  python tools/repo_stats.py

# Install package editable
install:
  python -m pip install -e .

# Build wheel + sdist
build:
  python -m build

# Run tests
test:
  pytest

# Lint
lint:
  ruff check .

# Format
format:
  ruff format .

# Check format only (CI)
format-check:
  ruff format --check

# Build single Windows exe locally (PyInstaller). CI builds on windows-latest.
add_data_sep := if os() == "windows" { ";" } else { ":" }
exe:
  pip install pyinstaller
  pyinstaller --onefile --name robofang-bridge --add-data "src/robofang/configs{{add_data_sep}}robofang/configs" src/robofang/main.py

# Release: tag and push to trigger the Release workflow (wheel, sdist, exe).
release:
  @echo "Create and push an annotated tag to trigger the Release workflow, e.g.:"
  @echo "  git tag -a v0.1.0-alpha.1 -m \"Release v0.1.0-alpha.1\""
  @echo "  git push origin v0.1.0-alpha.1"
  @echo "Then open Actions → Release and the new GitHub Release (with .exe attached)."

# Run the bridge (FastAPI + MCP)
run:
  python -m robofang.main

# Start the hub (Vite + bridge + supervisor). Windows: use robofang-hub\\start.ps1 or start.bat
hub:
  @echo "On Windows run: .\\robofang-hub\\start.bat  or  .\\robofang-hub\\start.ps1"
