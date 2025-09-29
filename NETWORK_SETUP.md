# Network Configuration Guide

This guide explains how to configure the DrMedra webapp for different network setups and deployment scenarios.

## 🏠 Local Development (Same Machine)

**Scenario**: Both frontend and backend running on the same development machine.

**Frontend Configuration** (`web/.env.local`):
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

**Backend Configuration** (`api/.env`):
```env
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**URLs**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🌐 Network/LAN Setup

**Scenario**: Frontend and backend on different machines within the same network.

### Example: Backend on 192.168.2.102, Frontend on 192.168.2.105

**Frontend Configuration** (`web/.env.local`):
```env
NEXT_PUBLIC_API_BASE=http://192.168.2.102:8000
```

**Backend Configuration** (`api/.env`):
```env
PORT=8000
# Allow frontend machine to access the API
ALLOWED_ORIGINS=http://192.168.2.105:3000,http://localhost:3000
```

**URLs**:
- Frontend: http://192.168.2.105:3000
- Backend: http://192.168.2.102:8000
- API Docs: http://192.168.2.102:8000/docs

### Finding Your IP Address:
```bash
# Linux/macOS
ip addr show | grep inet
# or
ifconfig | grep inet

# Windows
ipconfig
```

---

## 🚀 Production Deployment

**Scenario**: Production deployment with domain names and HTTPS.

**Frontend Configuration** (`web/.env.local`):
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
```

**Backend Configuration** (`api/.env`):
```env
PORT=8000
ENVIRONMENT=production
PRODUCTION_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**URLs**:
- Frontend: https://yourdomain.com
- Backend: https://api.yourdomain.com
- API Docs: https://api.yourdomain.com/docs

---

## 🐳 Docker/Container Setup

**Scenario**: Using Docker containers or container orchestration.

### Docker Compose Example:

**Frontend Configuration** (`web/.env.local`):
```env
# Use service name from docker-compose.yml
NEXT_PUBLIC_API_BASE=http://api:8000
```

**Backend Configuration** (`api/.env`):
```env
PORT=8000
# Allow frontend container to access API
ALLOWED_ORIGINS=http://web:3000,http://localhost:3000
```

### Docker Network Discovery:
```yaml
# docker-compose.yml
services:
  api:
    # backend service
    ports:
      - "8000:8000"
  
  web:
    # frontend service
    environment:
      - NEXT_PUBLIC_API_BASE=http://api:8000
    ports:
      - "3000:3000"
```

---

## ☁️ Cloud Deployment Examples

### Vercel Frontend + Railway Backend:
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE=https://your-app.railway.app
```

### Netlify Frontend + Heroku Backend:
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE=https://your-app.herokuapp.com
```

---

## 🔧 Troubleshooting

### CORS Issues:
1. Check that `ALLOWED_ORIGINS` in backend `.env` includes your frontend URL
2. Test CORS: `curl http://your-backend-ip:8000/cors-test`
3. Check browser console for specific CORS errors

### Connection Issues:
1. Verify backend is accessible: `curl http://your-backend-ip:8000/health`
2. Check firewall settings on backend machine
3. Ensure port 8000 is open and not blocked

### Frontend Not Connecting:
1. Check `NEXT_PUBLIC_API_BASE` in `web/.env.local`
2. Restart frontend after changing environment variables
3. Clear browser cache and cookies
4. Check browser network tab for failed requests

### Environment Variables Not Loading:
1. Ensure file is named exactly `.env.local` (not `.env.local.txt`)
2. Restart the development server after changes
3. Verify no spaces around `=` in environment variables
4. Check that variables start with `NEXT_PUBLIC_` for frontend

---

## 📝 Quick Setup Commands

### For Network Setup (Backend on 192.168.2.102):

```bash
# Frontend machine
cd web
echo "NEXT_PUBLIC_API_BASE=http://192.168.2.102:8000" > .env.local
npm run dev

# Backend machine  
cd api
echo "ALLOWED_ORIGINS=http://192.168.2.105:3000,http://localhost:3000" >> .env
source .venv/bin/activate
python app.py
```

### Test the connection:
```bash
# From frontend machine, test backend
curl http://192.168.2.102:8000/health

# Should return: {"status":"healthy","model_endpoint":"..."}
```

---

## 🆘 Common Network Configurations

| Setup | Frontend URL | Backend URL | Frontend .env.local | Backend .env ALLOWED_ORIGINS |
|-------|-------------|-------------|---------------------|------------------------------|
| Same machine | localhost:3000 | localhost:8000 | `http://localhost:8000` | `http://localhost:3000` |
| Different machines | 192.168.1.100:3000 | 192.168.1.101:8000 | `http://192.168.1.101:8000` | `http://192.168.1.100:3000` |
| Docker | web:3000 | api:8000 | `http://api:8000` | `http://web:3000` |
| Production | yourdomain.com | api.yourdomain.com | `https://api.yourdomain.com` | `https://yourdomain.com` |

Remember: Always restart both frontend and backend services after changing environment variables!