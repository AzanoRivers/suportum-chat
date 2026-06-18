import os
import tempfile
from typing import Any, Dict, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings

# Directorio base en el temp del sistema operativo.
# Windows: C:\Users\<user>\AppData\Local\Temp\suportum
# Linux VPS: /tmp/suportum
_TEMP_BASE = os.path.join(tempfile.gettempdir(), "suportum")
_DEFAULT_DB = os.path.join(_TEMP_BASE, "data", "suportum.db")
_DEFAULT_UPLOADS = os.path.join(_TEMP_BASE, "uploads")


class Settings(BaseSettings):
    PROJECT_NAME: str = "suportum-api"
    API_VERSION: str = "1.0.0"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 1
    DATABASE_URL: str = _DEFAULT_DB
    CORS_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    PORT: int = 8001
    UPLOAD_DIR: str = _DEFAULT_UPLOADS
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_IMAGE_DIMENSION_PX: int = 1920
    MAX_LOGO_SIZE_MB: int = 2
    MAX_LOGO_DIMENSION_PX: int = 512
    SOCKET_MSG_RATE_MAX: int = 30
    SOCKET_MSG_RATE_WINDOW: int = 60
    LOG_LEVEL: str = "INFO"
    MESSAGE_RETENTION_DAYS: int = 60

    # AWS SES — todos opcionales; el servicio de email se deshabilita si no están presentes
    AWS_SES_ACCESS_KEY_ID: Optional[str] = None
    AWS_SES_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SES_FROM_EMAIL: Optional[str] = None
    AWS_SES_REGION: str = "us-east-1"

    @model_validator(mode="before")
    @classmethod
    def resolve_empty_paths(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        # Pydantic-settings reads DATABASE_URL= as "" (empty string).
        # Fall back to the tempfile-based default when the value is blank.
        if not values.get("DATABASE_URL"):
            values["DATABASE_URL"] = _DEFAULT_DB
        if not values.get("UPLOAD_DIR"):
            values["UPLOAD_DIR"] = _DEFAULT_UPLOADS
        # Convertir strings vacíos de SES a None para que ses_enabled() funcione correctamente
        for key in ("AWS_SES_ACCESS_KEY_ID", "AWS_SES_SECRET_ACCESS_KEY", "AWS_SES_FROM_EMAIL"):
            if not values.get(key):
                values[key] = None
        return values

    class Config:
        env_file = ".env"


settings = Settings()
