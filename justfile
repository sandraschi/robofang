# RoboFang task runner (just – https://just.systems)
# Usage: just [recipe]   or   just --list

default:
  just --list

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
