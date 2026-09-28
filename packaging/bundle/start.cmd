@echo off
REM ============================================================
REM  HCL Software Learning Hub - Start (Windows)
REM  Double-click this file, or run it from an elevated prompt.
REM ============================================================
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start.ps1" %*
set RC=%ERRORLEVEL%
if not "%1"=="-Quiet" pause
exit /b %RC%
