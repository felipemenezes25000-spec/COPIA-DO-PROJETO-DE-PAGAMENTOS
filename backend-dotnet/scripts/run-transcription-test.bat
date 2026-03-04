@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Executando teste de transcricao...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-transcription-test.ps1" -SkipBackendStart
echo.
pause
