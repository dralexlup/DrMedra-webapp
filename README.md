# DrMedra Medical Assistant

AI-powered medical assistant platform with real-time consultations, patient management, and intelligent medical insights.

## 🏥 Features

- 🤖 **AI-Powered Consultations**: Real-time streaming responses from medical AI models
- 👥 **Patient Management**: Comprehensive patient records and medical history
- 💬 **Chat Interface**: Intuitive chat-based consultations with multimedia support
- 🔐 **Secure Authentication**: JWT-based authentication with doctor accounts
- 📊 **Medical Context**: RAG (Retrieval-Augmented Generation) for relevant medical information
- 🏥 **Multi-Doctor Support**: Multiple healthcare providers with isolated patient data
- 📱 **Modern UI**: Clean, responsive interface built with Next.js 14
- 🔄 **Real-time Streaming**: Live AI responses with Server-Sent Events

## 🏗️ Architecture

### Backend (FastAPI)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: SQLAlchemy with SQLite for patient/chat data
- **AI Integration**: OpenAI-compatible API endpoint support (vLLM, OpenAI, etc.)
- **File Upload**: Image upload and storage for visual diagnostics
- **RAG System**: Context retrieval for enhanced medical responses

### Frontend (Next.js 14)
- **Framework**: React with TypeScript and App Router
- **Authentication**: Token-based auth with localStorage
- **Real-time UI**: Live streaming chat interface
- **API Client**: Type-safe API communication
- **Responsive Design**: Mobile-friendly medical interface

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ with pip
- Node.js 18+ with npm
- AI Model Endpoint (vLLM, OpenAI API, etc.)

### 1. Clone the Repository
```bash
git clone https://github.com/dralexlup/DrMedra-webapp.git
cd DrMedra-webapp
```

### 2. Backend Setup
```bash
cd api

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings:
# JWT_SECRET=your-secret-key
# MODEL_ENDPOINT=http://127.0.0.1:1234/v1/chat/completions
# PORT=8000

# Run the API server
python app.py
```

### 3. Frontend Setup
```bash
cd ../web

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local:
# NEXT_PUBLIC_API_BASE=http://localhost:8000

# Run the development server
npm run dev
```

### 4. AI Model Setup (vLLM Recommended)
```bash
# Install vLLM
pip install vllm

# Run with your medical model (example with Gemma)
vllm serve google/gemma-2-2b-it --host 127.0.0.1 --port 1234

# Or use any OpenAI-compatible endpoint
# Update MODEL_ENDPOINT in api/.env accordingly
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📖 Usage Guide

### Getting Started
1. **Register**: Create a doctor account at `/login`
2. **Add Patients**: Create patient records with medical information
3. **Start Consultation**: Begin a new chat session for a patient
4. **AI Chat**: Ask medical questions and receive real-time AI responses
5. **Upload Images**: Share medical images for visual analysis
6. **Review History**: Access previous consultation records

### Default Login (for testing)
- Email: `admin@medra.com`
- Password: `admin123`

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - Register new doctor
- `POST /auth/login` - Doctor login

### Patient Management
- `GET /patients` - List all patients for doctor
- `POST /patients` - Create new patient

### Consultations
- `POST /chats` - Start new consultation
- `GET /chats` - List consultations
- `GET /messages` - Get chat history
- `POST /stream` - Stream AI responses (SSE)
- `POST /upload` - Upload medical images

### System
- `GET /health` - Health check endpoint

## 🔧 Configuration

### Backend Environment Variables
```env
JWT_SECRET=your-secret-key-here
MODEL_ENDPOINT=http://127.0.0.1:1234/v1/chat/completions
PORT=8000
DB_URL=sqlite:///./medra.db  # Optional, defaults to SQLite
```

### Frontend Environment Variables
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## 🤖 Supported AI Models

### vLLM (Local Deployment)
```bash
# Medical models (examples)
vllm serve microsoft/DialoGPT-medium --host 127.0.0.1 --port 1234
vllm serve google/gemma-2-2b-it --host 127.0.0.1 --port 1234
vllm serve your-custom-medical-model --host 127.0.0.1 --port 1234
```

### OpenAI API
Update `MODEL_ENDPOINT` to `https://api.openai.com/v1/chat/completions` and add API key handling.

### Other OpenAI-Compatible APIs
- Ollama
- LocalAI
- Text Generation Inference
- Any OpenAI-compatible endpoint

## 🚢 Production Deployment

### Backend (FastAPI)
```bash
# Use production database
DB_URL=postgresql://user:password@localhost/medra_db

# Use production server
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:8000
```

### Frontend (Next.js)
```bash
# Build for production
npm run build
npm start

# Or deploy to Vercel/Netlify
```

### Docker Deployment (Optional)
```dockerfile
# Example Dockerfile for backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]
```

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ SQL injection protection
- ✅ CORS protection
- ✅ Input validation
- ✅ Secure file uploads
- ✅ Environment-based secrets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## ⚠️ Medical Disclaimer

This system is for educational and development purposes only. Always consult qualified healthcare professionals for medical advice. The AI responses should not replace professional medical diagnosis or treatment.

---

**Built with ❤️ for the medical community**