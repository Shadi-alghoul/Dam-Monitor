# AI-Related Files Organization

All AI-related scripts and documentation have been organized into the **`AI/`** folder for a cleaner project structure.

## 📁 New Location

AI files are now located in:

```
dam-monitor-backend/
├── AI/                    ← All AI files here
│   ├── start-ollama.ps1
│   ├── start-ollama.bat
│   ├── start-ollama.sh
│   ├── verify-ollama.ps1
│   ├── docker-compose.yml
│   ├── QUICK_START.md
│   ├── OLLAMA_CUSTOM_PORT_SETUP.md
│   ├── AI_VALIDATION_SETUP.md
│   └── README.md          ← Start here!
├── backend/
├── frontend/
└── ...
```

## 🚀 Quick Start

Navigate to the AI folder and choose your setup method:

```powershell
# Windows PowerShell
cd AI
.\start-ollama.ps1

# Windows Command Prompt
cd AI
start-ollama.bat

# Linux/macOS
cd AI
chmod +x start-ollama.sh
./start-ollama.sh
```

Then start backend and frontend in separate terminals.

## 📖 Documentation

All documentation is now in the **`AI/README.md`** file.

**Quick reference:**

- [`AI/QUICK_START.md`](./AI/QUICK_START.md) - 5-minute setup
- [`AI/OLLAMA_CUSTOM_PORT_SETUP.md`](./AI/OLLAMA_CUSTOM_PORT_SETUP.md) - Complete guide
- [`AI/AI_VALIDATION_SETUP.md`](./AI/AI_VALIDATION_SETUP.md) - Technical details

## ✅ Changes Made

Old root files have been moved to `AI/`:

- `start-ollama.ps1` → `AI/start-ollama.ps1`
- `start-ollama.bat` → `AI/start-ollama.bat`
- `start-ollama.sh` → `AI/start-ollama.sh`
- `verify-ollama.ps1` → `AI/verify-ollama.ps1`
- `OLLAMA_CUSTOM_PORT_SETUP.md` → `AI/OLLAMA_CUSTOM_PORT_SETUP.md`
- `QUICK_START.md` → `AI/QUICK_START.md`
- `AI_VALIDATION_SETUP.md` → `AI/AI_VALIDATION_SETUP.md`
- `docker-compose.yml` → `AI/docker-compose.yml`

Backend configuration files remain unchanged:

- `backend/.env`
- `backend/src/main/resources/application.properties`
- `backend/src/main/java/.../AIValidationService.java`

## 🎯 Next Steps

1. Go to `AI/` folder
2. Read `AI/README.md`
3. Run appropriate startup script for your OS
4. Start backend and frontend

---

For detailed information, see [`AI/README.md`](./AI/README.md)
