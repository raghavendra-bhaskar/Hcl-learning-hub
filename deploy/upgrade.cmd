@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0upgrade.ps1" %*
exit /b %errorlevel%
