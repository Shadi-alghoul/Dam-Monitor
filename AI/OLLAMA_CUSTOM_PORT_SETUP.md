# 🚀 Ollama Custom Port Setup Guide

## Overview

This guide shows how to launch Ollama on a custom port (**11435**) and integrate it with your Dam Monitor backend for AI-powered image validation.

## Why Custom Port?

- **Avoid Conflicts**: Default port 11434 may be used by other services
- **Multiple Instances**: Run multiple Ollama instances on different ports
- **Production Ready**: Easier port management in deployment environments

## Quick Start (Windows)

### Option 1: PowerShell Script (Recommended)

```powershell
# Navigate to AI folder
cd D:\Downloads\dam-monitor-backend\AI

# Run the startup script
.\start-ollama.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start-ollama.ps1
```

### Option 2: Batch Script

```cmd
cd D:\Downloads\dam-monitor-backend\AI
start-ollama.bat
```

### Option 3: Manual Command

```powershell
# Set environment variable for custom port
$env:OLLAMA_HOST = "0.0.0.0:11435"

# Pull model (first time only)
ollama pull gemma3:12b

# Start Ollama server
ollama serve
```

## Linux/macOS Setup

```bash
cd ~/path/to/dam-monitor-backend/AI

# Make script executable
chmod +x start-ollama.sh

# Run the startup script
./start-ollama.sh
```

## Backend Configuration

### 1. Environment Variables (`.env` file)

```properties
# Ollama AI Model Configuration
OLLAMA_BASE_URL=http://localhost:11435
OLLAMA_MODEL=gemma3:12b
```

### 2. Application Properties

File: `backend/src/main/resources/application.properties`

```properties
# Ollama AI Model Configuration (for image validation)
# Default port: 11435 (custom port to avoid conflicts)
# Default model: gemma3:12b (environmental issue classification)
ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11435}
ollama.model=${OLLAMA_MODEL:gemma3:12b}
```

**How it works:**

- Uses environment variable `OLLAMA_BASE_URL` if set
- Falls back to `http://localhost:11435` if not set
- Can override at runtime via environment variables

### 3. Spring Configuration in AIValidationService

The backend automatically reads these properties:

```java
@Service
public class AIValidationService {
    private final String ollamaBaseUrl;
    private final String ollamaModel;

    public AIValidationService(
            ObjectMapper objectMapper,
            @Value("${ollama.base-url:http://localhost:11435}") String ollamaBaseUrl,
            @Value("${ollama.model:gemma3:12b}") String ollamaModel) {
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.ollamaModel = ollamaModel;
    }
}
```

## Verification

### 1. Check Ollama is Running

```powershell
# Run verification script
.\verify-ollama.ps1

# Or manual check
curl http://localhost:11435/api/tags

# Expected response:
# {"models":[{"name":"gemma3:12b",...}]}
```

### 2. Check Backend Configuration

```bash
# Backend will log configuration on startup:
# Ollama configuration: base-url=http://localhost:11435, model=gemma3:12b
```

### 3. Test Full Workflow

1. Start Ollama:

   ```powershell
   .\start-ollama.ps1
   ```

2. Start Backend:

   ```bash
   cd backend
   mvn spring-boot:run
   ```

3. Start Frontend:

   ```bash
   cd frontend
   npm run dev
   ```

4. Submit a report with an image
   - Should validate with AI and return approval/rejection status

## Port Configuration Details

| Setting                  | Value                  | Purpose                           |
| ------------------------ | ---------------------- | --------------------------------- |
| **Ollama Port**          | 11435                  | API endpoint for image validation |
| **Backend → Ollama**     | http://localhost:11435 | Connection URL                    |
| **Environment Variable** | `OLLAMA_BASE_URL`      | Override default port             |
| **Application Property** | `ollama.base-url`      | Spring configuration key          |
| **Default Model**        | gemma3:12b             | Environmental issue classifier    |

## Environment Variables

### Windows PowerShell

```powershell
# Set for current session only
$env:OLLAMA_BASE_URL = "http://localhost:11435"
$env:OLLAMA_MODEL = "gemma3:12b"

# Verify
$env:OLLAMA_BASE_URL
```

### Windows Command Prompt

```cmd
# Set for current session
set OLLAMA_BASE_URL=http://localhost:11435
set OLLAMA_MODEL=gemma3:12b

# Verify
echo %OLLAMA_BASE_URL%
```

### Linux/macOS Bash

```bash
# Set for current session
export OLLAMA_BASE_URL="http://localhost:11435"
export OLLAMA_MODEL="gemma3:12b"

# Verify
echo $OLLAMA_BASE_URL
```

### Permanent Setup (Windows)

1. Right-click **This PC** → **Properties**
2. Click **Advanced system settings**
3. Click **Environment Variables**
4. Under **User variables**, click **New**
5. Add:
   - Variable name: `OLLAMA_BASE_URL`
   - Variable value: `http://localhost:11435`
6. Restart your terminal/IDE

## Troubleshooting

### ❌ "Connection refused" Error

**Problem**: Backend can't connect to Ollama

**Solution**:

```powershell
# 1. Check Ollama is running
ollama list

# 2. Check port is accessible
Test-NetConnection -ComputerName localhost -Port 11435

# 3. Restart Ollama on correct port
$env:OLLAMA_HOST = "0.0.0.0:11435"
ollama serve
```

### ❌ "Address already in use" Error

**Problem**: Port 11435 is already in use

**Solution**:

```powershell
# Find process using port 11435
Get-NetTCPConnection -LocalPort 11435 | Select-Object OwningProcess
tasklist /FI "PID eq <PROCESS_ID>"

# Kill process or use different port
.\start-ollama.ps1 -Port 11436
```

### ❌ "Model not found" Error

**Problem**: gemma3:12b not downloaded

**Solution**:

```bash
# Pull the model
ollama pull gemma3:12b

# Verify it's installed
ollama list
```

### ❌ Reports Being Rejected with "Validation Error"

**Problem**: AI validation failing

**Solution**:

1. Check Ollama is running: `ollama list`
2. Check port configuration: `$env:OLLAMA_BASE_URL`
3. Check model is loaded: `ollama show gemma3:12b`
4. Check backend logs for connection errors
5. Run: `.\verify-ollama.ps1`

### ⚠️ Slow Image Validation (30+ seconds)

**Problem**: Validation takes too long

**Causes**:

- Model is still loading on first request
- System RAM is low (model needs ~4GB)
- CPU-only inference (slow without GPU)

**Solution**:

- First request will be slower (model loads into memory)
- Subsequent requests are faster
- Consider GPU acceleration if available

## Production Deployment

### Docker Setup

```dockerfile
FROM ollama/ollama:latest

# Expose custom port
EXPOSE 11435

# Set environment for custom port
ENV OLLAMA_HOST=0.0.0.0:11435

# Pull model on startup
RUN ollama pull gemma3:12b

CMD ["ollama", "serve"]
```

### Run with Docker

```bash
docker run -d \
  --name ollama \
  -p 11435:11435 \
  -v ollama:/root/.ollama \
  ollama/ollama:latest
```

### Backend Configuration for Docker

Update `application.properties`:

```properties
ollama.base-url=http://ollama:11435
```

Update `.env`:

```
OLLAMA_BASE_URL=http://ollama:11435
```

## Security Considerations

1. **Firewall**: Ollama should not be exposed to the internet

   ```powershell
   # Only listen on localhost (default in backend)
   $env:OLLAMA_HOST = "127.0.0.1:11435"
   ```

2. **Network**: Keep Ollama and Backend on same network
3. **API Timeout**: Backend has 60-second timeout for validation

## Performance Tips

| Optimization           | Benefit                    |
| ---------------------- | -------------------------- |
| GPU Acceleration       | 5-10x faster inference     |
| SSD Storage            | Faster model loading       |
| 4GB+ RAM               | Smooth operation           |
| Keep-Alive Connections | Faster subsequent requests |

## Files Modified

- ✅ `backend/.env` - Added OLLAMA_BASE_URL, OLLAMA_MODEL
- ✅ `backend/src/main/resources/application.properties` - Updated defaults
- ✅ `backend/src/main/java/.../AIValidationService.java` - Reads configuration
- ✅ `AI/start-ollama.ps1` - PowerShell startup script
- ✅ `AI/start-ollama.bat` - Batch startup script
- ✅ `AI/start-ollama.sh` - Bash startup script
- ✅ `AI/verify-ollama.ps1` - Verification script

## Testing

### Test Script (Full Workflow)

```powershell
# 1. Start Ollama on port 11435
cd AI
.\start-ollama.ps1

# 2. In new terminal: Start backend
cd backend
mvn spring-boot:run

# 3. In another terminal: Start frontend
cd frontend
npm run dev

# 4. Open http://localhost:5173 and submit a report

# 5. Verify in backend logs:
# "Sending image to Ollama for validation"
# "Image approved by AI"
```

## Summary

✅ **Custom Port**: 11435  
✅ **Model**: gemma3:12b  
✅ **Configuration**: Via .env and application.properties  
✅ **Startup**: Use provided scripts  
✅ **Verification**: Run verify-ollama.ps1

Your backend is now fully integrated with Ollama for AI-powered environmental report validation!
