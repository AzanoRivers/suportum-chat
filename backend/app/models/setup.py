import re
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class SetupCreateRequest(BaseModel):
    name: str
    slug: Optional[str] = None   # si no se envía, el backend lo auto-genera
    admin_email: EmailStr
    admin_username: str
    admin_password: str
    language: str = "en"
    logo_data: Optional[str] = None  # data URI base64 con el logo del proyecto

    @field_validator("name")
    @classmethod
    def name_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 80:
            raise ValueError("VALIDATION_ERROR")
        return v

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2 or len(v) > 40:
            raise ValueError("VALIDATION_ERROR")
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("VALIDATION_ERROR")
        return v

    @field_validator("admin_username")
    @classmethod
    def username_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 30:
            raise ValueError("VALIDATION_ERROR")
        return v

    @field_validator("admin_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("VALIDATION_ERROR")
        return v

    @field_validator("language")
    @classmethod
    def language_choices(cls, v: str) -> str:
        if v not in ("en", "es"):
            raise ValueError("VALIDATION_ERROR")
        return v


class SetupCreateResponse(BaseModel):
    api_key: str
    project_id: str
    admin: dict


class SlugCheckResponse(BaseModel):
    available: bool


class SetupStatusResponse(BaseModel):
    done: bool
    api_key: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
