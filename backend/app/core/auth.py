from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext

from app.config import settings

ALGORITHM = "HS256"

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


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
