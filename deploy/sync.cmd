@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1" %*
exit /b %errorlevel%
