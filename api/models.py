from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.types import BLOB
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os, uuid

Base = declarative_base()
DB_URL = os.getenv("DB_URL", "sqlite:///./medra.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def gen_id(): return str(uuid.uuid4())

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    password_hash = Column(String, nullable=True)  # Nullable for Google OAuth users
    google_id = Column(String, nullable=True)  # Google OAuth ID
    avatar_url = Column(String, nullable=True)  # Profile picture URL
    specialty = Column(String, nullable=True)  # Medical specialty
    license_number = Column(String, nullable=True)  # Medical license
    phone = Column(String, nullable=True)  # Phone number
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=gen_id)
    doctor_id = Column(String, ForeignKey("doctors.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    mrn = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Chat(Base):
    __tablename__ = "chats"
    id = Column(String, primary_key=True, default=gen_id)
    doctor_id = Column(String, ForeignKey("doctors.id", ondelete="CASCADE"))
    patient_id = Column(String, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)  # Allow null for general chats
    patient_name = Column(String, nullable=True)  # Store patient name for easy access
    title = Column(String)
    is_general = Column(String, default="false")  # "true" for general chats, "false" for patient-specific
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=gen_id)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"))
    doctor_id = Column(String, ForeignKey("doctors.id", ondelete="CASCADE"))  # Direct reference to doctor
    patient_id = Column(String, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    patient_name = Column(String, nullable=True)  # Store patient name for easy queries
    role = Column(String)   # 'user' | 'assistant' | 'system'
    text = Column(Text)
    media_url = Column(String)  # local /storage path
    media_type = Column(String, nullable=True)  # 'image', 'audio', etc.
    file_name = Column(String, nullable=True)  # original filename
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(engine)