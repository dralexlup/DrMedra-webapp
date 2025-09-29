#!/bin/bash

# DrMedra Network Setup Script
# This script helps configure the frontend to connect to a backend on a different IP address

echo "🌐 DrMedra Network Configuration Setup"
echo "======================================"
echo ""

# Get backend IP from user
read -p "Enter the backend server IP address (e.g., 192.168.2.102): " BACKEND_IP
read -p "Enter the backend port [default: 8000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

# Get frontend IP (optional, for CORS configuration)
read -p "Enter the frontend machine IP (for CORS, optional): " FRONTEND_IP
read -p "Enter the frontend port [default: 3000]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo ""
echo "Configuration Summary:"
echo "- Backend URL: http://$BACKEND_IP:$BACKEND_PORT"
echo "- Frontend URL: http://${FRONTEND_IP:-localhost}:$FRONTEND_PORT"
echo ""

# Configure frontend
echo "📱 Configuring frontend..."
cd web
echo "NEXT_PUBLIC_API_BASE=http://$BACKEND_IP:$BACKEND_PORT" > .env.local
echo "✅ Frontend configured: web/.env.local"

# Show backend configuration
echo ""
echo "🔧 Backend configuration needed:"
echo "Edit api/.env and add/update:"
echo ""
if [ -n "$FRONTEND_IP" ]; then
    echo "ALLOWED_ORIGINS=http://$FRONTEND_IP:$FRONTEND_PORT,http://localhost:3000"
else
    echo "ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000"
fi
echo ""

# Test connectivity
echo "🧪 Testing backend connectivity..."
if curl -s --connect-timeout 5 "http://$BACKEND_IP:$BACKEND_PORT/health" > /dev/null; then
    echo "✅ Backend is accessible at http://$BACKEND_IP:$BACKEND_PORT"
else
    echo "⚠️  Warning: Cannot reach backend at http://$BACKEND_IP:$BACKEND_PORT"
    echo "   Make sure:"
    echo "   - Backend is running on that IP and port"
    echo "   - Firewall allows connections to port $BACKEND_PORT"
    echo "   - You can ping $BACKEND_IP from this machine"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Make sure backend is running on $BACKEND_IP:$BACKEND_PORT"
echo "2. Update backend CORS configuration (see above)"
echo "3. Restart both frontend and backend services"
echo "4. Start frontend: npm run dev"
echo ""
echo "📖 For detailed setup guide, see: NETWORK_SETUP.md"
echo ""
echo "✅ Setup complete!"