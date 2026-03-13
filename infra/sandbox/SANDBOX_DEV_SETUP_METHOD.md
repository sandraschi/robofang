# Windows Sandbox: auto-install complete dev setup (method for virtualisation-mcp)

Reusable pattern for MCP sandbox tools: get a clean Windows Sandbox to a full dev environment without manual steps.

## Order of operations

1. **Map host folder into Sandbox** (e.g. `.wsb` `MappedFolder` → `C:\Assets`) so the guest can see installer assets.

2. **Install App Installer (winget) and its dependencies**
   - From [winget-cli Releases](https://github.com/microsoft/winget-cli/releases) Assets:
     - `DesktopAppInstaller_Dependencies.zip` — contains Windows App Runtime etc. (required; without it `Add-AppxPackage` on the bundle fails with 0x80073CF3).
     - `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle` — winget CLI.
   - In script: expand the zip, `Add-AppxPackage` every `*.msix` under the expanded folder (e.g. sort by name so runtimes before main app), then `Add-AppxPackage` the `.msixbundle`.
   - Exit on first failure; do not continue to winget if App Installer did not install.

3. **Refresh PATH** (or advise user to open a new PowerShell) so `winget` is available.

4. **Install dev stack via winget** (examples):
   - `Python.Python.3.12`
   - `Git.Git`
   - `OpenJS.NodeJS.LTS`
   - `Casey.Just`
   Use `winget install -e --id <ID> --accept-package-agreements --accept-source-agreements`. Check `$LASTEXITCODE` after each and exit on failure.

5. **Refresh PATH again** so `python`, `git`, `node`, `just` are available in the same session.

6. **Repo / project setup**: clone, `pip install -e .` (or npm install, etc.). Only report success after these succeed.

## Design notes for MCP tools

- **Idempotency**: Skip steps already done (e.g. if winget exists, skip App Installer; if repo dir exists, optionally skip clone or do pull).
- **Configurable stack**: Parameterise winget package IDs and repo URL so one script can drive “Python + Git + Node + just” or a smaller set.
- **Assets location**: Script assumes assets are in a known path (e.g. `C:\Assets`). MCP can generate the `.wsb` with the right `MappedFolder` and tell the user to place the two installer files there (or download them via MCP if the tool has network access).
- **No success message until the end**: Only output “Dev setup complete” (or equivalent) after the last step succeeds; fail fast with clear errors before that.

This repo’s implementation: `Setup-RoboFangSandbox.ps1` and `RoboFangSandbox.wsb`.
