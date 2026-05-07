# ============================================================
# Verify Ollama Connection - Custom Port (Windows PowerShell)
# ============================================================
#
# This script verifies that Ollama is running and accessible
# on the custom port from your backend.
#
# Usage:
#   ./verify-ollama.ps1
#

param(
    [string]$OllamaUrl = "http://localhost:11435"
)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🔍 Verifying Ollama Connection" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "URL: $OllamaUrl" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test basic connectivity
Write-Host "1️⃣  Testing basic connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$OllamaUrl/api/tags" -ErrorAction Stop
    Write-Host "✓ Connected to Ollama" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to connect to Ollama at $OllamaUrl" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Ollama is running (use start-ollama.ps1)"
    Write-Host "  2. Port 11435 is correct"
    Write-Host "  3. No firewall is blocking the connection"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# List available models
Write-Host "2️⃣  Available models:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -ErrorAction Stop
    if ($response.models -and $response.models.Count -gt 0) {
        foreach ($model in $response.models) {
            Write-Host "  ✓ $($model.name) - $($model.details.parameter_size)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  No models found. Run: ollama pull gemma3:12b" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error fetching models: $_" -ForegroundColor Red
}

Write-Host ""

# Test image validation endpoint
Write-Host "3️⃣  Testing AI validation capability..." -ForegroundColor Yellow
Write-Host "  (This would require sending an actual image)" -ForegroundColor Gray
Write-Host ""

# Environment check
Write-Host "4️⃣  Environment Configuration:" -ForegroundColor Yellow
Write-Host "  OLLAMA_BASE_URL: $env:OLLAMA_BASE_URL" -ForegroundColor Cyan
Write-Host "  OLLAMA_MODEL: $env:OLLAMA_MODEL" -ForegroundColor Cyan
Write-Host ""

Write-Host "✨ Ollama is ready for environmental report validation!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
