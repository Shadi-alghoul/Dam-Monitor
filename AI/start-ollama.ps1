# ============================================================
# Ollama Startup Script - Custom Port (Windows PowerShell)
# ============================================================
#
# This script launches Ollama on a custom port (11435)
# to avoid conflicts with other services.
#
# Usage:
#   ./start-ollama.ps1
#
# If you get an execution policy error, run:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#

param(
    [int]$Port = 11435,
    [string]$Model = "env-classifier"
)

$OLLAMA_HOST = "0.0.0.0:$Port"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting Ollama on Custom Port" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "Model: $Model" -ForegroundColor Yellow
Write-Host "Host: $OLLAMA_HOST" -ForegroundColor Yellow
Write-Host "API URL: http://localhost:$Port" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
try {
    $ollamaVersion = ollama --version 2>$null
    Write-Host "[OK] Ollama found: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Ollama is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Install from: https://ollama.ai" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if model is already pulled
Write-Host ""
Write-Host "Checking for model: $Model" -ForegroundColor Yellow

$modelList = ollama list 2>$null
if ($modelList -like "*$Model*") {
    Write-Host "[OK] Model already available" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Model '$Model' not found locally" -ForegroundColor Yellow
    Write-Host "To create the custom model, run:" -ForegroundColor Yellow
    Write-Host "  ollama create env-classifier -f ./AI/Modelfile" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to continue anyway (model must be created separately)"
}

# Start Ollama on custom port
Write-Host ""
Write-Host "Starting Ollama server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$env:OLLAMA_HOST = $OLLAMA_HOST
& ollama serve
