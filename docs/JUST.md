# Using `just` in RoboFang

[just](https://just.systems) is a command runner: one entry point for common tasks. The project uses a **justfile** at the repo root.

---

## Install just

- **Windows (scoop)**: `scoop install just`  
- **Windows (choco)**: `choco install just`  
- **macOS/Linux**: `cargo install just` or use your package manager.

---

## Usage

- **List all recipes**: `just` or `just --list`  
- **Run a recipe**: `just <recipe>` (e.g. `just test`, `just build`)

Default behavior (running `just` with no arguments) is to list available recipes.

---

## Recipes (justfile)

| Recipe | What it does |
|--------|----------------|
| **default** | Runs `just --list` (show this table). |
| **install** | `python -m pip install -e .` (editable install of RoboFang). |
| **build** | `python -m build` (wheel + sdist). |
| **test** | `pytest` |
| **lint** | `ruff check .` |
| **format** | `ruff format .` (rewrite files). |
| **format-check** | `ruff format --check` (CI: no rewrite). |
| **exe** | Build single Windows exe with PyInstaller (same as CI; needs `pip install pyinstaller`). |
| **release** | Prints the git tag/push commands to trigger the Release workflow (wheel, sdist, exe). |
| **run** | `python -m robofang.main` (run the bridge). |
| **hub** | Reminds to use `.\robofang-hub\start.bat` or `.\robofang-hub\start.ps1` on Windows. |

---

## Power-user flow

1. `just` — see what’s available.  
2. `just install` — ensure package is editable.  
3. `just test` / `just lint` — before committing.  
4. `just build` or `just exe` — when you need artifacts.  
5. `just release` — when cutting a release (then run the printed tag/push commands).

The Release workflow (see [RELEASING.md](RELEASING.md)) is triggered by pushing a tag; `just release` does not push, it only shows the steps.
