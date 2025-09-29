# 🚀 Quick Setup Guide - No Localhost Required!

This guide helps you set up DrMedra webapp for network access without hardcoded localhost limitations.

## 📋 Prerequisites

- Python 3.8+ with pip
- Node.js 18+ with npm  
- AI Model Server running (e.g., vLLM, OpenAI API, etc.)

## ⚡ Quick Start (5 minutes)

### 1. Clone and Setup
```bash
git clone https://github.com/dralexlup/DrMedra-webapp.git
cd DrMedra-webapp
```

### 2. Get Your Network IP
```bash
# On macOS/Linux
MY_IP=$(ifconfig en0 | grep "inet " | awk '{print $2}' | head -1)
echo "Your IP: $MY_IP"

# On Windows
ipconfig | findstr "IPv4"
```

### 3. Configure Backend (API)
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create configuration
cat > .env << EOF
JWT_SECRET=change-me-in-production
MODEL_ENDPOINT=http://127.0.0.1:1234/v1/chat/completions
PORT=8000
ENVIRONMENT=development
ALLOWED_ORIGINS=http://$MY_IP:3000,http://localhost:3000
EOF
```

### 4. Configure Frontend (Web)
```bash
cd ../web
npm install

# Create configuration  
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE=http://$MY_IP:8000
EOF
```

### 5. Start Servers
```bash
# Terminal 1: Start Backend
cd api
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start Frontend  
cd web
npm run dev
```

### 6. Access Application
- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000
- **API Health**: http://YOUR_IP:8000/healthz
- **API Docs**: http://YOUR_IP:8000/docs

## 🔧 Production Setup

For production deployment, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete production guide
- [NETWORK_SETUP.md](NETWORK_SETUP.md) - Advanced network configuration

## ✅ Key Features Fixed

- ❌ **No more hardcoded localhost** - fully configurable
- ✅ **Network accessibility** - works across different machines  
- ✅ **Streaming fixed** - AI responses stream properly
- ✅ **No 404 errors** - missing assets handled
- ✅ **Production ready** - proper environment configuration

## 🆘 Quick Troubleshooting

**Frontend can't connect to backend:**
```bash
# Check if backend is accessible
curl http://YOUR_IP:8000/healthz

# Should return: {"ok":true}
```

**CORS errors:**
- Make sure `ALLOWED_ORIGINS` in `api/.env` includes your frontend URL
- Restart both servers after changing environment files

**Model connection fails:**
- Update `MODEL_ENDPOINT` in `api/.env` to your actual AI model server
- Test model endpoint: `curl http://127.0.0.1:1234/v1/models`

---

🎯 **Result**: A fully functional medical AI assistant webapp that works across your network without localhost limitations!