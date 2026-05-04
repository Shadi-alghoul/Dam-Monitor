#!/bin/bash

# ============================================================
# Ollama Startup Script - Custom Port (Linux/macOS)
# ============================================================
#
# This script launches Ollama on a custom port (11435)
# to avoid conflicts with other services.
#
# Usage:
#   chmod +x start-ollama.sh
#   ./start-ollama.sh
#

set -e

OLLAMA_PORT=11435
OLLAMA_MODEL="env-classifier"
OLLAMA_HOST="0.0.0.0:${OLLAMA_PORT}"

echo "=========================================="
echo "🚀 Starting Ollama on Custom Port"
echo "=========================================="
echo "Port: $OLLAMA_PORT"
echo "Model: $OLLAMA_MODEL"
echo "Host: $OLLAMA_HOST"
echo "API URL: http://localhost:${OLLAMA_PORT}"
echo "=========================================="
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed or not in PATH"
    echo "Install from: https://ollama.ai"
    exit 1
fi

# Check if model is already pulled
echo "📦 Checking for model: $OLLAMA_MODEL"
if ! ollama list | grep -q "$OLLAMA_MODEL"; then
    echo "⚠️  Model '$OLLAMA_MODEL' not found locally"
    echo "Note: Run 'ollama create env-classifier -f ./AI/Modelfile' to build the custom model"
    echo ""
    read -p "Press Enter to continue anyway (model must be created separately)"
fi

# Start Ollama on custom port
echo ""
echo "✨ Starting Ollama server..."
echo "Press Ctrl+C to stop"
echo ""

OLLAMA_HOST="$OLLAMA_HOST" ollama serve
