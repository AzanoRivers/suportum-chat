"""
Helpers de upload de imagenes para Suportum.

Funciones sincronas (se invocan con asyncio.to_thread desde el endpoint async):
- detect_mime  : detecta MIME por magic bytes, sin dependencias externas
- compress_to_webp : comprime y redimensiona la imagen a WebP
- safe_upload_path : genera la ruta de destino con proteccion path traversal
"""
import io
import os
import uuid
from pathlib import Path
from typing import Tuple

from PIL import Image


# ---------------------------------------------------------------------------
# MIME detection por magic bytes
# ---------------------------------------------------------------------------

_MAGIC: Tuple[Tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"RIFF", "image/webp"),   # WebP: RIFF????WEBP (verificado abajo)
    (b"\x00\x00\x01\x00", "image/x-icon"),
)

ALLOWED_MIMES = frozenset({"image/jpeg", "image/png", "image/gif", "image/webp"})


def detect_mime(data: bytes) -> str:
    """
    Detecta el MIME type de los datos de imagen usando magic bytes.
    Retorna el MIME detectado o 'application/octet-stream' si no reconoce.
    """
    for magic, mime in _MAGIC:
        if data[:len(magic)] == magic:
            # Para WebP ademas verificar que los bytes 8-12 sean 'WEBP'
            if mime == "image/webp":
                if len(data) >= 12 and data[8:12] == b"WEBP":
                    return mime
                # No es WebP real, continuar con el siguiente magic
                continue
            return mime
    return "application/octet-stream"


# ---------------------------------------------------------------------------
# Compresion a WebP
# ---------------------------------------------------------------------------

def compress_to_webp(
    data: bytes,
    max_dimension: int,
    quality: int = 85,
) -> Tuple[bytes, int, int]:
    """
    Recibe bytes de imagen, redimensiona si supera max_dimension en alguna
    dimension y la convierte a WebP.

    Retorna (webp_bytes, width, height).

    Esta funcion es SINCRONA. Llamar con asyncio.to_thread desde contextos async.
    """
    with Image.open(io.BytesIO(data)) as img:
        # WebP soporta alpha — preservar canal de transparencia
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        width, height = img.size

        if width > max_dimension or height > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
            width, height = img.size

        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=4)
        return buf.getvalue(), width, height


# ---------------------------------------------------------------------------
# Ruta de destino segura
# ---------------------------------------------------------------------------

def safe_upload_path(
    upload_dir: str,
    project_id: str,
    room_id: str,
    year: str,
    month: str,
) -> Tuple[Path, str]:
    """
    Construye la ruta de destino para el archivo subido, con proteccion
    contra path traversal.

    - upload_dir  : directorio base (Settings.UPLOAD_DIR)
    - project_id  : id del proyecto (UUID)
    - room_id     : id del room; se sanitiza para uso en filesystem
    - year, month : strings "YYYY" y "MM" para organizar por fecha

    Retorna (path_absoluto_al_archivo, nombre_del_archivo).
    El nombre del archivo es un UUID v4 con extension .webp.
    """
    # Sanitizar project_id y room_id para el filesystem
    safe_project = _sanitize_segment(project_id)
    safe_room = _sanitize_segment(room_id)
    safe_year = _sanitize_segment(year)
    safe_month = _sanitize_segment(month)

    base = Path(upload_dir).resolve()
    target_dir = (base / safe_project / "chat" / safe_room / safe_year / safe_month).resolve()

    # Proteccion path traversal: el directorio target debe estar dentro de base
    if not str(target_dir).startswith(str(base)):
        raise ValueError("Path traversal detectado en safe_upload_path")

    target_dir.mkdir(parents=True, exist_ok=True)

    filename = str(uuid.uuid4()) + ".webp"
    file_path = target_dir / filename

    return file_path, filename


def safe_branding_path(
    upload_dir: str,
    project_id: str,
) -> Tuple[Path, str]:
    """
    Construye la ruta de destino para el logo de un proyecto, con proteccion
    contra path traversal.

    - upload_dir : directorio base (Settings.UPLOAD_DIR)
    - project_id : id del proyecto (UUID); se sanitiza

    Estructura: UPLOAD_DIR/{project_id}/branding/logo-{uuid}.webp

    Retorna (path_absoluto_al_archivo, nombre_del_archivo).
    """
    safe_project = _sanitize_segment(project_id)

    base = Path(upload_dir).resolve()
    target_dir = (base / safe_project / "branding").resolve()

    # Proteccion path traversal: el directorio target debe estar dentro de base
    if not str(target_dir).startswith(str(base)):
        raise ValueError("Path traversal detectado en safe_branding_path")

    target_dir.mkdir(parents=True, exist_ok=True)

    filename = "logo-" + uuid.uuid4().hex + ".webp"
    file_path = target_dir / filename

    return file_path, filename


def _sanitize_segment(segment: str) -> str:
    """
    Elimina caracteres peligrosos de un segmento de ruta de filesystem.
    Solo permite alfanumericos, guiones, guiones bajos y dos puntos.
    """
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:")
    return "".join(c for c in segment if c in allowed) or "unknown"
