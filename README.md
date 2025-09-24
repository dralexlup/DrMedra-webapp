# MedraN Medical Assistant WebApp

A streamlined medical consultation app with AI-powered chat, patient management, and real-time streaming responses.

## Architecture

```
medra-app/
├─ api/                    # FastAPI backend (Python 3.11+)
│  ├─ app.py              # Main FastAPI application with SSE streaming
│  ├─ models.py           # SQLAlchemy models (Doctor, Patient, Chat, Message)
│  ├─ auth.py             # JWT authentication
│  ├─ db.py               # Database dependencies
│  ├─ rag.py              # RAG integration stub (plug your implementation)
│  ├─ storage/            # Uploaded images
│  ├─ requirements.txt    # Python dependencies
│  └─ .env.example        # Environment configuration
├─ web/                   # Next.js 14 frontend
│  ├─ app/
│  │  ├─ login/page.tsx   # Authentication page
│  │  ├─ patients/page.tsx # Patient management
│  │  └─ chat/[chatId]/page.tsx # Real-time chat with AI
│  ├─ lib/api.ts          # API client with SSE streaming
│  ├─ package.json        # Node.js dependencies
│  ├─ next.config.mjs     # Next.js configuration
│  └─ .env.example        # Frontend environment
└─ README.md
```

## Features

- 🔐 **JWT Authentication** - Secure doctor/user management
- 👥 **Patient Management** - Add and organize patient records
- 💬 **Real-time AI Chat** - Stream responses from your AI model endpoint
- 📸 **Image Upload** - Support for medical images in consultations
- 🧠 **RAG Integration** - Ready to plug in your medical knowledge retrieval
- 📱 **Responsive UI** - Clean, minimal interface

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Your AI model running at `http://localhost:9000/generate` (or configure in `.env`)

### 1. Backend Setup

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env if your model endpoint differs from http://localhost:9000/generate
python app.py
```

Backend runs at: `http://localhost:8000`

### 2. Frontend Setup

```bash
cd web
npm install  # or pnpm i
cp .env.example .env
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Usage

1. **Open** `http://localhost:3000/login`
2. **Register** a new account or login
3. **Add patients** from the patients page
4. **Start a chat** with any patient
5. **Ask medical questions** - responses stream in real-time
6. **Upload images** for visual analysis (if your model supports it)

## API Endpoints

### Authentication
- `POST /auth/register` - Create doctor account
- `POST /auth/login` - Authenticate and get JWT token

### Patients
- `GET /patients` - List doctor's patients
- `POST /patients` - Add new patient

### Chats & Messages
- `POST /chats` - Create new chat session
- `GET /chats` - List doctor's chats
- `GET /messages?chat_id={id}` - Get chat messages
- `POST /stream` - **SSE streaming** - Send message and get AI response

### Uploads
- `POST /upload` - Upload images
- `GET /storage/{filename}` - Serve uploaded files

## AI Model Integration

The app expects your AI model to be running at the `MODEL_ENDPOINT` (default: `http://192.168.0.10:1234/v1/chat/completions`) and accept this OpenAI-compatible payload:

```json
{
  "model": "medra",
  "messages": [{"role": "system", "content": "You are a helpful medical assistant."}, {"role": "user", "content": "question"}],
  "temperature": 0.2,
  "max_tokens": 1024,
  "stream": true
}
```

The model should return **Server-Sent Events** (SSE) with OpenAI-compatible format:
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: [DONE]
```

## RAG Integration

Edit `api/rag.py` to implement your medical knowledge retrieval:

```python
def retrieve_context(query: str, patient_id: str | None = None):
    # Your implementation here
    # Return list of {text, source, url} dictionaries
    return [
        {
            "text": "Relevant medical information...",
            "source": "Medical Guidelines 2023", 
            "url": "https://example.com"
        }
    ]
```

## Configuration

### Backend (api/.env)
```env
JWT_SECRET=your-secret-key
MODEL_ENDPOINT=http://localhost:9000/generate
PORT=8000
DB_URL=sqlite:///./medra.db  # or PostgreSQL URL
```

### Frontend (web/.env)
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Database

Uses SQLite by default. For production, set `DB_URL` to PostgreSQL:
```env
DB_URL=postgresql://username:password@localhost/medra_medical
```

## Development

The app is designed to be **simple and extensible**:

- **Streaming**: Real-time AI responses via SSE
- **Modular**: Easy to add new endpoints or features  
- **Clean**: Minimal dependencies, clear separation of concerns
- **Flexible**: Works with any AI model that supports the expected API

## Production Considerations

- Set strong `JWT_SECRET`
- Use PostgreSQL instead of SQLite
- Add rate limiting and input validation
- Configure CORS for your domain
- Add HTTPS termination
- Monitor model endpoint health

---

**Ready to integrate with your MedraN model!** 🏥🤖