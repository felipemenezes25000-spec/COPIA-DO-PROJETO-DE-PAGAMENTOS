@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   TESTE COMPLETO - Inicia backend
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-transcription-test.ps1"
echo.
pause
