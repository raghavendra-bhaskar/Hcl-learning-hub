@echo off
REM ============================================================
REM  HCL Software Learning Hub - Stop (Windows)
REM  Double-click this file, or run it from an elevated prompt.
REM ============================================================
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop.ps1" %*
set RC=%ERRORLEVEL%
pause
exit /b %RC%
