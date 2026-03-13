@echo off
REM RoboFang: start supervisor, bridge, and hub. Same as robofang-hub\start.bat (run setup first if needed).
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start_all.ps1"
pause
