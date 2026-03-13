# Windows Sandbox setup

1. **Place these files in this folder** (they are gitignored; get them from [winget-cli Releases](https://github.com/microsoft/winget-cli/releases) Assets):
   - `DesktopAppInstaller_Dependencies.zip`
   - `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle`

2. **Run Sandbox**: double-click `RoboFangSandbox.wsb`. The script runs on logon and installs dependencies, winget, Python/Git/Node/just, clones robofang, and runs `pip install -e .`.

3. If winget is not in PATH after install, open a new PowerShell in Sandbox and run `C:\Assets\Setup-RoboFangSandbox.ps1` again (it will skip already-installed steps).
