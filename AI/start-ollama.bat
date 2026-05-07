@echo off
REM ============================================================
REM Ollama Startup Script - Custom Port (Windows Batch)
REM ============================================================
REM
REM This script launches Ollama on a custom port (11435)
REM to avoid conflicts with other services.
REM
REM Usage:
REM   start-ollama.bat
REM

setlocal enabledelayedexpansion

set OLLAMA_PORT=11435
set OLLAMA_MODEL=env-classifier
set OLLAMA_HOST=0.0.0.0:%OLLAMA_PORT%

echo.
echo ==========================================
echo 🚀 Starting Ollama on Custom Port
echo ==========================================
echo Port: %OLLAMA_PORT%
echo Model: %OLLAMA_MODEL%
echo Host: %OLLAMA_HOST%
echo API URL: http://localhost:%OLLAMA_PORT%
echo ==========================================
echo.

REM Check if Ollama is installed
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed or not in PATH
    echo Install from: https://ollama.ai
    pause
    exit /b 1
)

REM Check if model is already pulled
echo 📦 Checking for model: %OLLAMA_MODEL%
ollama list | findstr %OLLAMA_MODEL% >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Model %OLLAMA_MODEL% not found
    echo [NOTE] Run: ollama create env-classifier -f ./AI/Modelfile
    pause
)

REM Start Ollama on custom port
echo.
echo ✨ Starting Ollama server...
echo Press Ctrl+C to stop
echo.

set OLLAMA_HOST=%OLLAMA_HOST%
ollama serve

pause
