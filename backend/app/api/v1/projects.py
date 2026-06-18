"""
Endpoints de gestion del proyecto para Suportum.

GET    /projects/me            -> datos del proyecto (admin)
PATCH  /projects/me            -> actualiza name y/o settings (admin)
POST   /projects/me/rotate-key -> rota el api_key (admin)
POST   /projects/me/logo       -> sube logo (admin)
DELETE /projects/me/logo       -> elimina logo (admin)
"""
import asyncio
import base64
import json
import logging
import re
import uuid
from typing import Any, Dict, Optional

import aiosqlite
from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.core.errors import error_response
from app.core.guards import require_admin
from app.core.upload import (
    ALLOWED_MIMES,
    compress_to_webp,
    detect_mime,
    safe_branding_path,
)
from app.core.utils import now_iso
from app.database import get_db

logger = logging.getLogger("suportum")

router = APIRouter()

_PROJECT_FIELDS = "id, name, api_key, slug, settings, plan, is_active, created_at, updated_at"

_LOGO_DATA_URI_RE = re.compile(
    r"^data:image/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$"
)


class ProjectPatchBody(BaseModel):
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


def _row_to_project(row) -> dict:
    d = dict(row)
    try:
        d["settings"] = json.loads(d.get("settings") or "{}")
    except (ValueError, TypeError):
        d["settings"] = {}
    d["is_active"] = bool(d.get("is_active", 1))
    return d


def _get_logo_url_from_settings(settings_raw: Optional[str]) -> Optional[str]:
    """Extrae logo_url del JSON de settings, o None si no hay."""
    if not settings_raw:
        return None
    try:
        parsed = json.loads(settings_raw)
    except (ValueError, TypeError):
        return None
    value = parsed.get("logo_url")
    if isinstance(value, str) and value:
        return value
    return None


def _delete_logo_file(logo_url: str) -> None:
    """Elimina el archivo de disco del logo si existe. No rompe en caso de error."""
    # logo_url es del tipo /uploads/{project_id}/branding/logo-xxx.webp
    if not logo_url.startswith("/uploads/"):
        return
    relative = logo_url[len("/uploads/"):]
    if not relative:
        return
    # Construir path absoluto y validar que este dentro de UPLOAD_DIR
    base = __import__("pathlib").Path(settings.UPLOAD_DIR).resolve()
    target = (base / relative).resolve()
    try:
        if str(target).startswith(str(base)) and target.is_file():
            target.unlink()
    except Exception:
        logger.warning("No se pudo eliminar el logo en disco: %s", target)


def _set_logo_url(
    existing_settings_raw: Optional[str],
    new_logo_url: Optional[str],
) -> str:
    """Merge del campo logo_url en settings, preservando el resto del JSON."""
    if existing_settings_raw:
        try:
            parsed = json.loads(existing_settings_raw)
        except (ValueError, TypeError):
            parsed = {}
    else:
        parsed = {}
    if new_logo_url is None:
        parsed.pop("logo_url", None)
    else:
        parsed["logo_url"] = new_logo_url
    return json.dumps(parsed)


@router.get("/me")
async def get_project_me(
    scoped: dict = require_admin,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    async with db.execute(
        f"SELECT {_PROJECT_FIELDS} FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return error_response("NOT_FOUND", 404)
    return _row_to_project(row)


@router.patch("/me")
async def update_project_me(
    body: ProjectPatchBody,
    scoped: dict = require_admin,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]

    # Cargar datos actuales (necesitamos settings para merge)
    async with db.execute(
        f"SELECT {_PROJECT_FIELDS} FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return error_response("NOT_FOUND", 404)

    project = dict(row)

    # Construir campos a actualizar (nombres hardcodeados, no de inputs del usuario)
    update_fields = {}

    if body.name is not None:
        stripped = body.name.strip()
        if stripped:
            update_fields["name"] = stripped

    if body.settings is not None:
        try:
            existing = json.loads(project.get("settings") or "{}")
        except (ValueError, TypeError):
            existing = {}
        merged = {**existing, **body.settings}
        update_fields["settings"] = json.dumps(merged)

    update_fields["updated_at"] = now_iso()

    # SET clause: column names son strings literales del codigo, no del usuario
    set_clause = ", ".join(f"{col} = ?" for col in update_fields)
    params = list(update_fields.values()) + [project_id]
    await db.execute(
        f"UPDATE projects SET {set_clause} WHERE id = ?",
        params,
    )
    await db.commit()

    # Retornar estado actualizado
    async with db.execute(
        f"SELECT {_PROJECT_FIELDS} FROM projects WHERE id = ?",
        (project_id,),
    ) as cursor:
        updated_row = await cursor.fetchone()
    return _row_to_project(updated_row)


@router.post("/me/rotate-key")
async def rotate_project_key(
    scoped: dict = require_admin,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    new_key = f"sproj_{uuid.uuid4().hex}"
    await db.execute(
        "UPDATE projects SET api_key = ?, updated_at = ? WHERE id = ?",
        (new_key, now_iso(), project_id),
    )
    await db.commit()
    return {
        "api_key": new_key,
        "warning": "Actualiza apiKey en todos los sitios donde instalaste el widget.",
    }


@router.post("/me/logo")
async def upload_project_logo(
    file: UploadFile = File(...),
    scoped: dict = require_admin,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """
    Sube un logo para el proyecto. Valida MIME por magic bytes, tamano
    maximo (MAX_LOGO_SIZE_MB) y dimensiones maximas (MAX_LOGO_DIMENSION_PX).
    Comprime a WebP y guarda en UPLOAD_DIR/{project_id}/branding/logo-{uuid}.webp.
    """
    project_id: str = scoped["project"]["id"]

    # 1. Leer archivo con limite de tamano
    max_bytes = settings.MAX_LOGO_SIZE_MB * 1024 * 1024
    data = await file.read(max_bytes + 1)

    if len(data) > max_bytes:
        return error_response("UPLOAD_TOO_LARGE", 413)

    if not data:
        return error_response("UPLOAD_CORRUPT", 422)

    # 2. Validar MIME por magic bytes
    detected_mime = detect_mime(data)
    if detected_mime not in ALLOWED_MIMES:
        return error_response("UPLOAD_TYPE_NOT_SUPPORTED", 415)

    # 3. Comprimir a WebP (sincrono, llamado con asyncio.to_thread)
    try:
        webp_bytes, img_width, img_height = await asyncio.to_thread(
            compress_to_webp,
            data,
            settings.MAX_LOGO_DIMENSION_PX,
        )
    except Exception:
        logger.exception("Error al comprimir logo para proyecto %s", project_id)
        return error_response("UPLOAD_CORRUPT", 422)

    # 4. Generar path seguro y guardar archivo
    try:
        file_path, filename = safe_branding_path(settings.UPLOAD_DIR, project_id)
        file_path.write_bytes(webp_bytes)
    except Exception:
        logger.exception("Error al guardar logo en disco para proyecto %s", project_id)
        return error_response("IMAGE_SAVE_ERROR", 500)

    # 5. Cargar settings actuales y eliminar logo anterior si existe
    async with db.execute(
        "SELECT settings FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        # Rollback: eliminar el archivo recien guardado
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass
        return error_response("NOT_FOUND", 404)

    existing_settings_raw: Optional[str] = row["settings"]
    old_logo_url = _get_logo_url_from_settings(existing_settings_raw)
    if old_logo_url:
        _delete_logo_file(old_logo_url)

    # 6. Construir nueva URL publica y mergear en settings
    public_url = f"/uploads/{project_id}/branding/{filename}"
    new_settings_json = _set_logo_url(existing_settings_raw, public_url)

    await db.execute(
        "UPDATE projects SET settings = ?, updated_at = ? WHERE id = ?",
        (new_settings_json, now_iso(), project_id),
    )
    await db.commit()

    return {"logo_url": public_url}


@router.delete("/me/logo")
async def delete_project_logo(
    scoped: dict = require_admin,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """Elimina el logo actual del proyecto y limpia el archivo del disco."""
    project_id: str = scoped["project"]["id"]

    async with db.execute(
        "SELECT settings FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        row = await cursor.fetchone()
    if row is None:
        return error_response("NOT_FOUND", 404)

    existing_settings_raw: Optional[str] = row["settings"]
    current_logo_url = _get_logo_url_from_settings(existing_settings_raw)
    if not current_logo_url:
        return error_response("LOGO_NOT_FOUND", 404)

    # Eliminar archivo del disco (try/except dentro de helper, no rompe)
    _delete_logo_file(current_logo_url)

    # Limpiar campo en settings
    new_settings_json = _set_logo_url(existing_settings_raw, None)
    await db.execute(
        "UPDATE projects SET settings = ?, updated_at = ? WHERE id = ?",
        (new_settings_json, now_iso(), project_id),
    )
    await db.commit()

    return {"logo_url": None}


# ---------------------------------------------------------------------------
# Helper publico: procesar logo_data base64 (usado por setup.py)
# ---------------------------------------------------------------------------

async def process_logo_data_uri(
    logo_data: str,
    project_id: str,
) -> Optional[str]:
    """
    Procesa un logo en formato data URI base64 y lo guarda en branding/.
    Retorna la URL publica o None si el formato es invalido.

    Errores:
    - 413 si los bytes decodificados > MAX_LOGO_SIZE_MB
    - 415 si MIME no permitido
    - 422 si base64 invalido, MIME por magic bytes falla, o no se puede comprimir
    - 500 si falla el guardado en disco

    Levanta HTTPException con el codigo correspondiente.
    """
    from fastapi import HTTPException

    match = _LOGO_DATA_URI_RE.match(logo_data)
    if not match:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "UPLOAD_TYPE_NOT_SUPPORTED"}},
        )

    base64_payload = match.group(2)
    try:
        raw_bytes = base64.b64decode(base64_payload, validate=True)
    except Exception:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "UPLOAD_CORRUPT"}},
        )

    max_bytes = settings.MAX_LOGO_SIZE_MB * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={"error": {"code": "UPLOAD_TOO_LARGE"}},
        )

    detected_mime = detect_mime(raw_bytes)
    if detected_mime not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=415,
            detail={"error": {"code": "UPLOAD_TYPE_NOT_SUPPORTED"}},
        )

    try:
        webp_bytes, _w, _h = await asyncio.to_thread(
            compress_to_webp,
            raw_bytes,
            settings.MAX_LOGO_DIMENSION_PX,
        )
    except Exception:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "UPLOAD_CORRUPT"}},
        )

    try:
        file_path, filename = safe_branding_path(settings.UPLOAD_DIR, project_id)
        file_path.write_bytes(webp_bytes)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "IMAGE_SAVE_ERROR"}},
        )

    return f"/uploads/{project_id}/branding/{filename}"
