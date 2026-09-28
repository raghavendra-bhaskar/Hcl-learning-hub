@echo off
REM ============================================================
REM  HCL Software Learning Hub - Offline Installer (Windows)
REM
REM  Use this when you have the .zip bundle but not the compiled
REM  hcl-learning-hub-setup.exe. Self-elevates to Administrator.
REM ============================================================
setlocal

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Requesting administrator privileges...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
        "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1" %*
set RC=%ERRORLEVEL%
pause
exit /b %RC%
