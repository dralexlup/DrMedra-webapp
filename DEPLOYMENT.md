# 🚀 Production Deployment Guide for Medra

This guide helps you deploy Medra to production environments while avoiding common localhost configuration issues.

## 🔧 Pre-Deployment Checklist

### 1. Environment Configuration

#### API Configuration (`api/.env`)
```bash
# Copy the production template
cp api/.env.production api/.env
```

**Required Changes:**
- [ ] `JWT_SECRET` - Use a secure, random 32+ character string
- [ ] `MODEL_ENDPOINT` - Set to your production AI model endpoint
- [ ] `ALLOWED_ORIGINS` - Add your frontend domain(s)
- [ ] `PRODUCTION_ORIGINS` - Add your frontend domain(s)
- [ ] `GOOGLE_CLIENT_ID` - Use production Google OAuth credentials
- [ ] `ENVIRONMENT=production`

#### Frontend Configuration (`web/.env.local`)
```bash
# Copy the production template
cp web/.env.production web/.env.local
```

**Required Changes:**
- [ ] `NEXT_PUBLIC_API_BASE` - Set to your production API domain
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Use production Google OAuth credentials

### 2. Security Checklist

- [ ] **JWT Secret**: Generate secure random string (32+ chars)
- [ ] **Database**: Use production database (PostgreSQL recommended)
- [ ] **HTTPS**: Enable SSL/TLS certificates
- [ ] **Firewall**: Configure appropriate network security
- [ ] **CORS**: Restrict to your actual domains only
- [ ] **Environment Variables**: Never commit production secrets to version control

### 3. Infrastructure Requirements

#### Minimum Requirements
- [ ] **CPU**: 2+ cores
- [ ] **RAM**: 4GB+ (more for local AI models)
- [ ] **Storage**: 20GB+ SSD
- [ ] **Network**: Stable internet connection

#### Recommended for Production
- [ ] **Load Balancer**: For high availability
- [ ] **Database**: External PostgreSQL instance
- [ ] **File Storage**: Object storage (S3, etc.)
- [ ] **Monitoring**: Error tracking and metrics
- [ ] **Backups**: Automated database backups

## 🌐 Domain Configuration

### 1. DNS Setup
- [ ] Point your API subdomain to your backend server
- [ ] Point your main domain to your frontend
- [ ] Configure SSL certificates for both domains

Example:
- Frontend: `https://medra.yourdomain.com`
- API: `https://api.medra.yourdomain.com`

### 2. Environment Variables
```bash
# Backend (api/.env)
ALLOWED_ORIGINS=https://medra.yourdomain.com
PRODUCTION_ORIGINS=https://medra.yourdomain.com
ENVIRONMENT=production

# Frontend (web/.env.local)
NEXT_PUBLIC_API_BASE=https://api.medra.yourdomain.com
```

## 🐳 Docker Deployment (Recommended)

### 1. Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY api/ .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY web/package*.json ./
RUN npm ci --only=production

COPY web/ .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: 
      context: .
      dockerfile: api/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - MODEL_ENDPOINT=https://your-ai-provider.com/v1/chat/completions
      - ALLOWED_ORIGINS=https://yourdomain.com
      - ENVIRONMENT=production
    env_file:
      - api/.env

  web:
    build:
      context: .
      dockerfile: web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
    depends_on:
      - api
```

## 🔍 Common Deployment Issues

### Issue 1: CORS Errors
**Problem**: Frontend can't connect to API
**Solution**: 
- Check `ALLOWED_ORIGINS` in backend
- Ensure frontend URL matches exactly
- Include both HTTP and HTTPS if needed

### Issue 2: API Connection Refused
**Problem**: "Connection refused" or "Network error"
**Solution**:
- Verify `NEXT_PUBLIC_API_BASE` points to correct API URL
- Check if API server is actually running
- Verify firewall allows connections on API port

### Issue 3: Authentication Issues
**Problem**: Login fails or tokens don't work
**Solution**:
- Check `JWT_SECRET` is set and consistent
- Verify `GOOGLE_CLIENT_ID` for OAuth
- Check token expiration settings

### Issue 4: AI Model Connection
**Problem**: AI responses fail
**Solution**:
- Verify `MODEL_ENDPOINT` is accessible
- Check API keys for external AI services
- Test model endpoint manually with curl

## 📊 Monitoring & Maintenance

### 1. Health Checks
- [ ] API health endpoint: `GET /health`
- [ ] Frontend availability
- [ ] Database connectivity
- [ ] AI model responsiveness

### 2. Logs to Monitor
- [ ] API request/response logs
- [ ] Authentication failures
- [ ] Database connection issues
- [ ] CORS errors
- [ ] AI model failures

### 3. Regular Maintenance
- [ ] Update dependencies regularly
- [ ] Monitor disk space usage
- [ ] Backup database regularly
- [ ] Review security logs
- [ ] Update SSL certificates

## 🆘 Troubleshooting Commands

```bash
# Check if API is responding
curl -X GET https://api.yourdomain.com/health

# Test CORS configuration
curl -X OPTIONS -H "Origin: https://yourdomain.com" \
  https://api.yourdomain.com/patients

# Check frontend build
cd web && npm run build

# View API logs (if using Docker)
docker logs medra-api

# Test database connection
python -c "from models import init_db; init_db(); print('DB OK')"
```

## 🎯 Performance Optimization

### Backend Optimizations
- [ ] Use production ASGI server (uvicorn with workers)
- [ ] Enable database connection pooling
- [ ] Implement API response caching
- [ ] Optimize database queries

### Frontend Optimizations
- [ ] Enable Next.js static generation where possible
- [ ] Implement proper caching headers
- [ ] Optimize images and assets
- [ ] Use CDN for static assets

### Example Production Commands
```bash
# Backend with multiple workers
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend production build
npm run build && npm start
```

---

## 📞 Support

If you encounter issues during deployment:

1. Check this deployment guide first
2. Review the main [README.md](README.md) for basic setup
3. See [NETWORK_SETUP.md](NETWORK_SETUP.md) for network configuration
4. Check GitHub issues for similar problems

**Remember**: Never commit production environment files to version control!