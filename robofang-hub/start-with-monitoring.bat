@echo off
set ROBOFANG_START_MONITORING=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
