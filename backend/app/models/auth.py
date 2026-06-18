import re

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    api_key: str


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    api_key: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("VALIDATION_ERROR")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("VALIDATION_ERROR")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("VALIDATION_ERROR")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    project_id: str


class MeResponse(BaseModel):
    user_id: str
    role: str
    project_id: str
    username: str
