from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException
from jose import JWTError, ExpiredSignatureError, jwt

from app.config import settings

ALGORITHM = "HS256"

# bcrypt trunca silenciosamente en 72 bytes; lo hacemos explícito para evitar
# el ValueError que bcrypt 4.x lanza en passlib.detect_wrap_bug.
_BCRYPT_MAX = 72


def _to_bytes(plain: str) -> bytes:
    return plain.encode("utf-8")[:_BCRYPT_MAX]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_to_bytes(plain), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain), hashed.encode())
    except Exception:
        return False


def _build_token(payload: dict, expire_delta: timedelta) -> str:
    now = datetime.now(tz=timezone.utc)
    data = payload.copy()
    data["iat"] = now
    data["exp"] = now + expire_delta
    return jwt.encode(data, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(payload: dict, expire_minutes: int) -> str:
    return _build_token(payload, timedelta(minutes=expire_minutes))


def create_refresh_token(payload: dict) -> str:
    expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS
    return _build_token(payload, timedelta(days=expire_days))


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="AUTH_TOKEN_EXPIRED")
    except JWTError:
        raise HTTPException(status_code=401, detail="AUTH_TOKEN_INVALID")
