@echo off
REM RoboFang: start supervisor, bridge, and hub. Open Hub to configure MCP, LLM, auth.
powershell -ExecutionPolicy Bypass -File "%~dp0start_all.ps1"
pause
