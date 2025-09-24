import os, datetime
from jose import jwt, JWTError
from passlib.hash import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALG = "HS256"
JWT_EXP_MIN = 60 * 24 * 30  # 30 days for persistent login

def make_hash(pw: str) -> str:
    return bcrypt.hash(pw)

def verify_hash(pw: str, hashed: str) -> bool:
    return bcrypt.verify(pw, hashed)

def make_token(doctor_id: str, email: str) -> str:
    now = datetime.datetime.utcnow()
    payload = {"sub": doctor_id, "email": email, "iat": now, "exp": now + datetime.timedelta(minutes=JWT_EXP_MIN)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def read_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError:
        return None