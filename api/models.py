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
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    patient_id = Column(String, ForeignKey("patients.id", ondelete="SET NULL"))
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=gen_id)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"))
    role = Column(String)   # 'user' | 'assistant' | 'system'
    text = Column(Text)
    media_url = Column(String)  # local /storage path
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(engine)