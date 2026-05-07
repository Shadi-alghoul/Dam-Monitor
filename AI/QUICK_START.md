# 🚀 Quick Start - Ollama Custom Port Setup

## TL;DR - Get Running in 3 Steps

### Step 1: Start Ollama on Port 11435

**Windows (PowerShell):**

```powershell
cd D:\Downloads\dam-monitor-backend\AI
.\start-ollama.ps1
```

**Windows (Command Prompt):**

```cmd
cd D:\Downloads\dam-monitor-backend\AI
start-ollama.bat
```

**macOS/Linux:**

```bash
cd ~/path/to/dam-monitor-backend/AI
chmod +x start-ollama.sh
./start-ollama.sh
```

### Step 2: Start Backend

In a new terminal:

```bash
cd backend
mvn spring-boot:run
```

### Step 3: Start Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Done! ✅

---

## Configuration

### What's Set Up

- ✅ **Ollama Port**: 11435 (custom, avoids conflicts)
- ✅ **Model**: gemma3:12b (environmental classifier)
- ✅ **Backend Config**: `backend/.env` and `application.properties`
- ✅ **Environment Variable**: `OLLAMA_BASE_URL=http://localhost:11435`

### Files That Changed

```
backend/
  .env  ← Added OLLAMA_BASE_URL, OLLAMA_MODEL
  src/main/resources/
    application.properties  ← Updated ollama defaults
  src/main/java/.../
    AIValidationService.java  ← Added logging

AI/
  start-ollama.ps1  ← PowerShell startup
  start-ollama.bat  ← Batch startup
  start-ollama.sh   ← Bash startup
  verify-ollama.ps1 ← Verification tool
```

---

## Verify It's Working

### Option 1: Automatic Check

```powershell
cd AI
.\verify-ollama.ps1
```

### Option 2: Manual Check

```bash
# Check Ollama is running
ollama list

# Check backend logs show this on startup:
# "=== AI Validation Service Initialized ==="
# "Ollama Base URL: http://localhost:11435"
# "Ollama Model: gemma3:12b"

# Submit a report in the web app - should validate with AI
```

---

## Troubleshooting

| Issue                         | Solution                                               |
| ----------------------------- | ------------------------------------------------------ |
| **"Connection refused"**      | Run `cd AI && .\start-ollama.ps1`                      |
| **"Port already in use"**     | Change port in `AI/start-ollama.ps1`                   |
| **"Model not found"**         | Run `ollama pull gemma3:12b`                           |
| **Backend can't find Ollama** | Check `$env:OLLAMA_BASE_URL` matches port              |
| **Reports not validating**    | Check backend logs, run `cd AI && .\verify-ollama.ps1` |

---

## Port Details

```
Default Ollama Port:     11434
Custom Port Used:        11435
Backend Config:          http://localhost:11435
Environment Variable:    OLLAMA_BASE_URL
Application Property:    ollama.base-url
```

---

## Environment Variables

### Windows (Current Session Only)

```powershell
$env:OLLAMA_BASE_URL = "http://localhost:11435"
$env:OLLAMA_MODEL = "gemma3:12b"
```

### Windows (Permanent)

1. Settings → System → Advanced system settings
2. Environment Variables → New User variable
3. `OLLAMA_BASE_URL` = `http://localhost:11435`
4. Restart terminal/IDE

### Linux/macOS

```bash
export OLLAMA_BASE_URL="http://localhost:11435"
export OLLAMA_MODEL="gemma3:12b"
```

---

## Docker Alternative

If you prefer Docker:

```bash
# Start all services (PostgreSQL + Ollama)
docker-compose up -d

# Services available at:
# - Ollama: localhost:11435
# - Database: localhost:5432
# - Backend: localhost:8080
# - Frontend: localhost:5173

# Stop all
docker-compose down
```

---

## Common Commands

```powershell
# Check what's running
ollama list

# Pull model (if not auto-pulled)
ollama pull gemma3:12b

# Show model info
ollama show gemma3:12b

# Test API connectivity
curl http://localhost:11435/api/tags

# Stop Ollama
Ctrl+C (in running terminal)

# Restart
cd AI && .\start-ollama.ps1
```

---

## Log Locations

**Backend Logs** (shows Ollama config + validation results):

```
Searching for: "Ollama" or "validation" in terminal output
```

**Key Log Messages**:

- ✅ `=== AI Validation Service Initialized ===` → Startup OK
- ✅ `✓ Image APPROVED` → Report passed AI check
- ✗ `✗ Image REJECTED: [reason]` → Report failed AI check
- ❌ `Cannot connect to Ollama` → Connection problem

---

## Next Steps

1. ✅ Run `cd AI && .\start-ollama.ps1`
2. ✅ Start backend: `mvn spring-boot:run`
3. ✅ Start frontend: `npm run dev`
4. ✅ Open http://localhost:5173
5. ✅ Submit report with image → Should validate with AI
6. ✅ Check backend logs for validation result

---

## Need More Help?

See detailed docs in the `AI/` folder:

- 📖 `OLLAMA_CUSTOM_PORT_SETUP.md` - Complete setup guide
- 📖 `AI_VALIDATION_SETUP.md` - How AI validation works
