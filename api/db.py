from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from models import SessionLocal
from auth import read_token

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_doctor_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    payload = read_token(token)
    if not payload: raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]