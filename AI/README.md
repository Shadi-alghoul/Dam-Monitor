# 🤖 AI - Environmental Report Validation

This folder contains all AI-related scripts, documentation, and Docker configuration for the Dam Monitor project's AI-powered environmental report validation system.

## 📁 What's Inside

### Scripts

- **`start-ollama.ps1`** - PowerShell script to launch Ollama on custom port 11435 (Windows - Recommended)
- **`start-ollama.bat`** - Batch script for Windows Command Prompt
- **`start-ollama.sh`** - Bash script for Linux/macOS
- **`verify-ollama.ps1`** - PowerShell script to verify Ollama connection and configuration

### Documentation

- **`QUICK_START.md`** - Fast setup guide (3 steps to get running)
- **`OLLAMA_CUSTOM_PORT_SETUP.md`** - Complete setup guide with troubleshooting
- **`AI_VALIDATION_SETUP.md`** - Technical deep-dive into the validation system
- **`docker-compose.yml`** - Docker configuration for Ollama + PostgreSQL

## 🚀 Quick Start

### Start Ollama (Choose your OS)

**Windows PowerShell:**

```powershell
.\start-ollama.ps1
```

**Windows Command Prompt:**

```cmd
start-ollama.bat
```

**Linux/macOS:**

```bash
chmod +x start-ollama.sh
./start-ollama.sh
```

### Start Backend (in new terminal)

```bash
cd backend
mvn spring-boot:run
```

### Start Frontend (in another terminal)

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and submit a report → AI validates it ✅

## 📖 Documentation

**New to the system?** Start with:

1. [`QUICK_START.md`](QUICK_START.md) - 5 minute overview

**Setting everything up?** Read: 2. [`OLLAMA_CUSTOM_PORT_SETUP.md`](OLLAMA_CUSTOM_PORT_SETUP.md) - Complete guide with troubleshooting

**Want to understand how it works?** Dive into: 3. [`AI_VALIDATION_SETUP.md`](AI_VALIDATION_SETUP.md) - Architecture and implementation details

## 🔧 Configuration

### Port: 11435

- Custom Ollama port (avoids conflicts with default 11434)
- Configured in `backend/.env`
- Can be overridden with `OLLAMA_BASE_URL` environment variable

### Model: gemma3:12b

- Environmental issue classifier
- ~7B parameters, ~4GB RAM required
- Auto-pulls on first run

### Backend Integration

- AIValidationService validates images before saving
- Results stored in database (approved/rejected + reason)
- Frontend shows approval status to user

## ✅ Verify Setup

```powershell
.\verify-ollama.ps1
```

This checks:

- ✓ Ollama is running
- ✓ Model is available
- ✓ Port is accessible
- ✓ Configuration is correct

## 🐳 Docker Alternative

If you prefer Docker:

```bash
docker-compose up -d
```

Starts:

- PostgreSQL on port 5432
- Ollama on port 11435
- Auto-pulls gemma3:12b model

## 📋 File Structure

```
AI/
├── start-ollama.ps1              # PowerShell startup (Windows)
├── start-ollama.bat              # Batch startup (Windows)
├── start-ollama.sh               # Bash startup (Linux/macOS)
├── verify-ollama.ps1             # Connection verification
├── docker-compose.yml            # Docker configuration
├── QUICK_START.md                # 5-minute setup guide
├── OLLAMA_CUSTOM_PORT_SETUP.md   # Complete setup with troubleshooting
├── AI_VALIDATION_SETUP.md        # Technical documentation
└── README.md                      # This file
```

## 🔍 Troubleshooting

| Problem                    | Solution                                                  |
| -------------------------- | --------------------------------------------------------- |
| Port 11435 in use          | `.\start-ollama.ps1 -Port 11436`                          |
| Model not found            | `ollama pull gemma3:12b`                                  |
| Backend can't reach Ollama | `$env:OLLAMA_BASE_URL` should be `http://localhost:11435` |
| Connection refused         | Run `.\start-ollama.ps1`                                  |
| Reports being rejected     | Check backend logs for validation messages                |

## 📚 Related Backend Files

Modified for AI validation:

- `backend/.env` - Environment variables
- `backend/src/main/resources/application.properties` - Spring config
- `backend/src/main/java/.../AIValidationService.java` - Core validation service
- `backend/src/main/java/.../EnvironmentalReport.java` - Model with AI fields
- `backend/src/main/java/.../EnvironmentalReportService.java` - Service integration
- `backend/src/main/java/.../ReportController.java` - API response DTO

Modified for Frontend:

- `frontend/src/types.ts` - Types with AI fields
- `frontend/src/pages/ReportPage.tsx` - Submission UI with approval feedback

## 🌐 Environment Variables

```powershell
# Windows PowerShell
$env:OLLAMA_BASE_URL = "http://localhost:11435"
$env:OLLAMA_MODEL = "gemma3:12b"
```

```bash
# Linux/macOS
export OLLAMA_BASE_URL="http://localhost:11435"
export OLLAMA_MODEL="gemma3:12b"
```

## 📞 Support

For issues:

1. Check [`QUICK_START.md`](QUICK_START.md) Troubleshooting section
2. Run `verify-ollama.ps1` to diagnose
3. Check backend logs for detailed error messages
4. See [`OLLAMA_CUSTOM_PORT_SETUP.md`](OLLAMA_CUSTOM_PORT_SETUP.md) for advanced troubleshooting

## 🎯 System Architecture

```
User Browser
    ↓
Frontend (React)
    ↓ Submits image
Backend (Spring Boot)
    ↓ Validates image
AIValidationService
    ↓ Sends to AI
Ollama (Port 11435)
    ↓ Analyzes
gemma3:12b Model
    ↓ Returns result
Backend saves + response
    ↓ Shows result
Frontend displays approval/rejection
```

## 🚀 Performance Tips

- First validation takes ~5-30s (model loads to RAM)
- Subsequent validations are faster
- ~4GB RAM recommended for smooth operation
- GPU acceleration available for faster inference

## 📅 Last Updated

May 4, 2026

---

**Ready to go?** Run `.\start-ollama.ps1` and check the backend logs! 🎉
