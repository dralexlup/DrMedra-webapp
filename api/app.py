import os, io, base64, requests, aiofiles
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import init_db, Doctor, Patient, Chat, Message
from models import SessionLocal
from db import get_db, get_doctor_id
from auth import make_hash, verify_hash, make_token
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rag import retrieve_context, save_conversation_context
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

MODEL_ENDPOINT = os.getenv("MODEL_ENDPOINT", "http://127.0.0.1:1234/v1/chat/completions")
PORT = int(os.getenv("PORT", "8000"))
os.makedirs("storage", exist_ok=True)

app = FastAPI(title="Medra API")

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ---------- Auth ----------
class RegisterBody(BaseModel):
    email: str
    name: Optional[str] = None
    password: str

@app.post("/auth/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(Doctor).filter_by(email=body.email).first():
        raise HTTPException(409, "Email exists")
    doc = Doctor(email=body.email, name=body.name or body.email.split("@")[0], password_hash=make_hash(body.password))
    db.add(doc); db.commit()
    token = make_token(doc.id, doc.email)
    return {"token": token, "doctor_id": doc.id, "name": doc.name}

class LoginBody(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter_by(email=body.email).first()
    if not doc or not verify_hash(body.password, doc.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(doc.id, doc.email), "doctor_id": doc.id, "name": doc.name}

@app.post("/auth/refresh")
def refresh_token(doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    """Refresh JWT token for continued authentication"""
    doc = db.query(Doctor).filter_by(id=doctor_id).first()
    if not doc:
        raise HTTPException(401, "Invalid token")
    return {"token": make_token(doc.id, doc.email), "doctor_id": doc.id, "name": doc.name}

@app.get("/auth/me")
def get_current_user(doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    """Get current user info from token"""
    doc = db.query(Doctor).filter_by(id=doctor_id).first()
    if not doc:
        raise HTTPException(401, "Invalid token")
    return {
        "doctor_id": doc.id, 
        "name": doc.name, 
        "email": doc.email,
        "avatar_url": doc.avatar_url,
        "specialty": doc.specialty,
        "phone": doc.phone
    }

class GoogleAuthBody(BaseModel):
    token: str

@app.post("/auth/google")
def google_auth(body: GoogleAuthBody, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth token"""
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            body.token, 
            google_requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )
        
        # Extract user info
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        avatar_url = idinfo.get('picture')
        
        # Check if user exists
        doc = db.query(Doctor).filter_by(google_id=google_id).first()
        if not doc:
            # Check if email exists (for account linking)
            doc = db.query(Doctor).filter_by(email=email).first()
            if doc:
                # Link Google account to existing email account
                doc.google_id = google_id
                doc.avatar_url = avatar_url
            else:
                # Create new user
                doc = Doctor(
                    email=email,
                    name=name,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    password_hash=None  # No password for Google users
                )
                db.add(doc)
        else:
            # Update existing Google user info
            doc.name = name
            doc.avatar_url = avatar_url
        
        # Update last login
        doc.last_login = datetime.utcnow()
        db.commit()
        
        # Return JWT token
        token = make_token(doc.id, doc.email)
        return {
            "token": token, 
            "doctor_id": doc.id, 
            "name": doc.name, 
            "email": doc.email,
            "avatar_url": doc.avatar_url
        }
        
    except ValueError as e:
        raise HTTPException(401, f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Google authentication failed: {str(e)}")

# ---------- Patients ----------
class PatientBody(BaseModel):
    name: str
    mrn: Optional[str] = None
    notes: Optional[str] = None

@app.post("/patients")
def create_patient(body: PatientBody, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    p = Patient(doctor_id=doctor_id, name=body.name, mrn=body.mrn, notes=body.notes)
    db.add(p); db.commit()
    return {"id": p.id, "name": p.name, "mrn": p.mrn, "notes": p.notes}

@app.get("/patients")
def list_patients(doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    rows = db.query(Patient).filter_by(doctor_id=doctor_id).order_by(Patient.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "mrn": r.mrn, "notes": r.notes} for r in rows]

@app.get("/patients/{patient_id}")
def get_patient_profile(patient_id: str, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    """Get patient profile with conversations and uploaded files"""
    patient = db.query(Patient).filter_by(id=patient_id, doctor_id=doctor_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    
    # Get patient chats
    chats = db.query(Chat).filter_by(patient_id=patient_id, doctor_id=doctor_id).order_by(Chat.created_at.desc()).all()
    
    # Get patient messages with files
    messages = db.query(Message).filter_by(patient_id=patient_id, doctor_id=doctor_id).order_by(Message.created_at.desc()).all()
    
    # Get files uploaded for this patient
    files = [m for m in messages if m.media_url]
    
    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "mrn": patient.mrn,
            "notes": patient.notes,
            "created_at": patient.created_at.isoformat()
        },
        "chats": [{
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat()
        } for c in chats],
        "recent_messages": [{
            "id": m.id,
            "role": m.role,
            "text": m.text[:200] + "..." if len(m.text) > 200 else m.text,
            "chat_id": m.chat_id,
            "created_at": m.created_at.isoformat()
        } for m in messages[:10]],
        "files": [{
            "id": f.id,
            "media_url": f.media_url,
            "media_type": f.media_type,
            "file_name": f.file_name,
            "chat_id": f.chat_id,
            "created_at": f.created_at.isoformat()
        } for f in files]
    }

# ---------- Chats / Messages ----------
# Put specific routes before generic ones
@app.post("/chats/general")
def create_general_chat(title: str = "General Chat", doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    """Create a general chat not associated with any patient"""
    c = Chat(
        doctor_id=doctor_id, 
        patient_id=None, 
        patient_name=None,
        title=title,
        is_general="true"
    )
    db.add(c); db.commit()
    return {
        "id": c.id, 
        "title": c.title, 
        "patient_id": None,
        "patient_name": None,
        "is_general": True
    }

@app.post("/chats")
def create_chat(
    patient_id: Optional[str] = None, 
    title: str = "Consult", 
    is_general: bool = False,
    doctor_id: str = Depends(get_doctor_id), 
    db: Session = Depends(get_db)
):
    patient_name = None
    if patient_id and not is_general:
        # Get patient name for easy access
        patient = db.query(Patient).filter_by(id=patient_id).first()
        if patient:
            patient_name = patient.name
        else:
            raise HTTPException(404, "Patient not found")
    
    c = Chat(
        doctor_id=doctor_id, 
        patient_id=patient_id if not is_general else None, 
        patient_name=patient_name,
        title=title,
        is_general="true" if is_general else "false"
    )
    db.add(c); db.commit()
    return {
        "id": c.id, 
        "title": c.title, 
        "patient_id": c.patient_id,
        "patient_name": c.patient_name,
        "is_general": c.is_general == "true"
    }

@app.get("/chats/general")
def list_general_chats(doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    """Get all general chats (not patient-specific)"""
    cs = db.query(Chat).filter_by(doctor_id=doctor_id, is_general="true").order_by(Chat.created_at.desc()).all()
    return [{
        "id": c.id, 
        "title": c.title, 
        "is_general": True,
        "created_at": c.created_at.isoformat()
    } for c in cs]

@app.get("/chats")
def list_chats(patient_id: Optional[str] = None, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    query = db.query(Chat).filter_by(doctor_id=doctor_id)
    
    if patient_id:
        # Get chats for specific patient
        query = query.filter_by(patient_id=patient_id)
    
    cs = query.order_by(Chat.created_at.desc()).all()
    return [{
        "id": c.id, 
        "title": c.title, 
        "patient_id": c.patient_id,
        "patient_name": c.patient_name,
        "is_general": c.is_general == "true",
        "created_at": c.created_at.isoformat()
    } for c in cs]

@app.get("/messages")
def list_messages(chat_id: str, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    ms = db.query(Message).filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).all()
    return [{
        "id": m.id, 
        "role": m.role, 
        "text": m.text, 
        "media_url": m.media_url,
        "media_type": m.media_type,
        "file_name": m.file_name,
        "patient_name": m.patient_name,
        "created_at": m.created_at.isoformat()
    } for m in ms]

# ---------- Uploads ----------
@app.post("/upload")
async def upload(file: UploadFile = File(...), doctor_id: str = Depends(get_doctor_id)):
    import uuid
    import mimetypes
    
    # Generate unique filename
    file_extension = ""
    if file.filename:
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ""
    
    unique_filename = f"{doctor_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    path = f"storage/{unique_filename}"
    
    # Save file
    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    # Determine file type
    mime_type = mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    file_info = {
        "url": f"/{path}",
        "filename": file.filename,
        "size": len(content),
        "mime_type": mime_type,
        "is_audio": mime_type.startswith("audio/") or file_extension in ["webm", "wav", "mp3", "m4a"],
        "is_image": mime_type.startswith("image/")
    }
    
    return file_info

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), doctor_id: str = Depends(get_doctor_id)):
    """Placeholder for audio transcription - would integrate with Whisper or similar"""
    # In a real implementation, you would:
    # 1. Save the audio file
    # 2. Use OpenAI Whisper, Azure Speech, or similar to transcribe
    # 3. Return the transcribed text
    
    # For now, return a placeholder
    return {
        "text": "[Audio transcription would be implemented here with Whisper API or similar service]",
        "confidence": 0.95,
        "duration": 5.2
    }

# serve files
from fastapi.staticfiles import StaticFiles
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# ---------- Stream to model (SSE proxy) ----------
class GenerateBody(BaseModel):
    chat_id: str
    prompt: str
    image_url: Optional[str] = None
    system: Optional[str] = "You are a helpful medical assistant."
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 1024

@app.post("/stream")
def stream_generate(body: GenerateBody, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    # Get chat info for patient context
    chat = db.query(Chat).filter_by(id=body.chat_id, doctor_id=doctor_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")
    
    # 1) persist user message with patient info
    user_message = Message(
        chat_id=body.chat_id,
        doctor_id=doctor_id,
        patient_id=chat.patient_id,
        patient_name=chat.patient_name,
        role="user", 
        text=body.prompt, 
        media_url=body.image_url
    )
    
    # Set media type if we have a file
    if body.image_url:
        if any(ext in body.image_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            user_message.media_type = "image"
        elif any(ext in body.image_url.lower() for ext in ['.webm', '.wav', '.mp3', '.m4a']):
            user_message.media_type = "audio"
        else:
            user_message.media_type = "file"
    
    db.add(user_message)
    db.commit()

    # 2) Save user message to RAG context and retrieve relevant context
    save_conversation_context(
        doctor_id=doctor_id, 
        patient_id=chat.patient_id, 
        chat_id=body.chat_id,
        role="user", 
        text=body.prompt, 
        patient_name=chat.patient_name
    )
    
    # Retrieve relevant context
    ctx = retrieve_context(body.prompt, doctor_id, chat.patient_id)

    # 3) Get recent conversation history for context
    recent_messages = db.query(Message).filter_by(
        chat_id=body.chat_id
    ).order_by(Message.created_at.desc()).limit(10).all()
    
    # Reverse to get chronological order
    recent_messages = recent_messages[::-1]
    
    # 4) build payload for OpenAI-compatible API
    messages = []
    
    # Build enhanced system message with patient context
    system_parts = [body.system]
    
    # Add patient context if available
    if chat.patient_name:
        system_parts.append(f"\n\nYou are currently consulting with patient: {chat.patient_name}")
        if chat.patient_id:
            # You could add patient medical history here from the database
            patient = db.query(Patient).filter_by(id=chat.patient_id).first()
            if patient and patient.notes:
                system_parts.append(f"Patient notes: {patient.notes}")
    else:
        system_parts.append("\n\nThis is a general medical consultation.")
    
    # Add RAG context if available
    if ctx:
        citations = "\n".join([f"- {c['text'][:300]}" for c in ctx])
        system_parts.append(f"\n\nRelevant context from previous conversations:\n{citations}")
    
    system_content = "".join(system_parts)
    messages.append({"role": "system", "content": system_content})
    
    # Add recent conversation history (excluding the current message we just added)
    for msg in recent_messages[:-1]:  # Skip the last message which is the current user message
        if msg.text:  # Only include messages with text content
            messages.append({
                "role": msg.role,
                "content": msg.text[:1000]  # Limit message length to avoid token limits
            })
    
    # Add user message with text and optional image
    user_content = []
    user_content.append({"type": "text", "text": body.prompt})
    
    if body.image_url:
        # Check if it's an audio file
        is_audio = any(ext in body.image_url.lower() for ext in ['.webm', '.wav', '.mp3', '.m4a'])
        is_image = any(ext in body.image_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'])
        
        if is_audio:
            # For audio files, modify the text prompt to indicate audio processing is needed
            user_content[0]["text"] = f"{body.prompt}\n\n[Note: User has uploaded an audio file ({body.image_url}). Since I cannot directly process audio files, I should explain that they would need to transcribe the audio first, or suggest they describe what was said in the audio message.]"
        elif is_image:
            # fetch and base64 the image for the model
            try:
                r = requests.get(body.image_url, timeout=10)
                r.raise_for_status()
                b64 = base64.b64encode(r.content).decode("utf-8")
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                })
            except Exception as e:
                print(f"Failed to fetch image: {e}")
    
    # If only text, use simple string format
    if len(user_content) == 1:
        messages.append({"role": "user", "content": body.prompt})
    else:
        messages.append({"role": "user", "content": user_content})

    payload = {
        "model": "google/gemma-3n-e4b",  # Using available Gemma model
        "messages": messages,
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
        "stream": True
    }

    # 4) stream from model endpoint and tee to client + DB
    def gen():
        buf = []
        try:
            with requests.post(MODEL_ENDPOINT, json=payload, stream=True, timeout=600) as r:
                r.raise_for_status()
                for line in r.iter_lines(decode_unicode=True):
                    if not line.strip(): continue
                    
                    # Handle OpenAI-style SSE format
                    if line.startswith("data: "):
                        data = line[6:].strip()
                        
                        # Check for completion
                        if data == "[DONE]":
                            break
                        
                        try:
                            # Parse JSON response
                            import json
                            chunk = json.loads(data)
                            
                            # Extract content from choices
                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                choice = chunk["choices"][0]
                                if "delta" in choice and "content" in choice["delta"]:
                                    token = choice["delta"]["content"]
                                    if token:  # Only yield non-empty tokens
                                        buf.append(token)
                                        yield f"data: {token}\n\n"
                        except json.JSONDecodeError:
                            # Fallback: treat as plain text token
                            token = data
                            buf.append(token)
                            yield f"data: {token}\n\n"
                            
        except Exception as e:
            # If model endpoint fails, yield error message
            error_msg = f"Model endpoint error: {str(e)}"
            buf.append(error_msg)
            yield f"data: {error_msg}\n\n"
        
        # persist assistant message with patient info
        text = "".join(buf)
        if text.strip():  # Only save if we have content
            assistant_message = Message(
                chat_id=body.chat_id,
                doctor_id=doctor_id,
                patient_id=chat.patient_id,
                patient_name=chat.patient_name,
                role="assistant", 
                text=text
            )
            db.add(assistant_message)
            db.commit()
            
            # Save assistant response to RAG context
            save_conversation_context(
                doctor_id=doctor_id, 
                patient_id=chat.patient_id, 
                chat_id=body.chat_id,
                role="assistant", 
                text=text, 
                patient_name=chat.patient_name
            )
        yield "event: end\ndata: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

# Test endpoint for debugging
@app.get("/test")
def test_endpoint():
    return {"message": "Test endpoint working"}

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "model_endpoint": MODEL_ENDPOINT}

# ------------- Run -------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)