import os, io, base64, requests, aiofiles
from typing import List, Optional
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import init_db, Doctor, Patient, Chat, Message
from models import SessionLocal
from db import get_db, get_doctor_id
from auth import make_hash, verify_hash, make_token
from rag import retrieve_context
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

# ---------- Chats / Messages ----------
@app.post("/chats")
def create_chat(patient_id: str, title: str = "Consult", doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    c = Chat(doctor_id=doctor_id, patient_id=patient_id, title=title)
    db.add(c); db.commit()
    return {"id": c.id, "title": c.title}

@app.get("/chats")
def list_chats(doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    cs = db.query(Chat).filter_by(doctor_id=doctor_id).order_by(Chat.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "patient_id": c.patient_id} for c in cs]

@app.get("/messages")
def list_messages(chat_id: str, doctor_id: str = Depends(get_doctor_id), db: Session = Depends(get_db)):
    ms = db.query(Message).filter_by(chat_id=chat_id).order_by(Message.created_at.asc()).all()
    return [{"id": m.id, "role": m.role, "text": m.text, "media_url": m.media_url} for m in ms]

# ---------- Uploads ----------
@app.post("/upload")
async def upload(file: UploadFile = File(...), doctor_id: str = Depends(get_doctor_id)):
    path = f"storage/{doctor_id}_{file.filename}"
    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)
    return {"url": f"/{path}"}

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
    # 1) persist user message
    db.add(Message(chat_id=body.chat_id, role="user", text=body.prompt, media_url=body.image_url))
    db.commit()

    # 2) optional RAG
    ctx = retrieve_context(body.prompt, None)  # plug patient id if you want

    # 3) build payload for OpenAI-compatible API
    messages = []
    
    # Add system message if we have context
    citations = "\n".join([f"- {c['text'][:300]}" for c in ctx])
    system_content = f"{body.system}\n\nRelevant context:\n{citations}" if citations else body.system
    if system_content:
        messages.append({"role": "system", "content": system_content})
    
    # Add user message with text and optional image
    user_content = []
    user_content.append({"type": "text", "text": body.prompt})
    
    if body.image_url:
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
        
        # persist assistant message
        text = "".join(buf)
        if text.strip():  # Only save if we have content
            db.add(Message(chat_id=body.chat_id, role="assistant", text=text))
            db.commit()
        yield "event: end\ndata: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "model_endpoint": MODEL_ENDPOINT}

# ------------- Run -------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)