"""
Endpoint de upload de imagenes para Suportum.

POST /api/v1/upload/{room_id}
  - Requiere JWT valido (Bearer token)
  - Valida acceso al room
  - Limite de tamano configurado en Settings.MAX_IMAGE_SIZE_MB
  - Convierte la imagen a WebP con limite de dimension Settings.MAX_IMAGE_DIMENSION_PX
  - Guarda el archivo en disco y registra en DB (messages + attachments)
  - Emite message:new via Socket.IO al room usando el namespace del proyecto
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request

from app.config import settings
from app.core.guards import get_scoped_project
from app.core.upload import detect_mime, compress_to_webp, safe_upload_path, ALLOWED_MIMES
from app.database import get_db
from app.sockets.rooms import validate_room_access
from app.sockets.server import sio

logger = logging.getLogger("suportum")

router = APIRouter()


@router.post("/{room_id}")
async def upload_image(
    room_id: str,
    request: Request,
    file: UploadFile = File(...),
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """
    Sube una imagen al room indicado.

    Flujo:
    1. Validar acceso al room
    2. Leer archivo con limite de tamano
    3. Validar MIME por magic bytes
    4. Comprimir a WebP con asyncio.to_thread
    5. Guardar en disco
    6. INSERT en messages y attachments
    7. Obtener api_key del proyecto y emitir message:new via Socket.IO
    """
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    # 1. Validar acceso al room
    has_access = await validate_room_access(project_id, user_id, role, room_id, db)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "FORBIDDEN_ROOM"}},
        )

    # 2. Leer archivo con limite de tamano
    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    data = await file.read(max_bytes + 1)

    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail={"error": {"code": "UPLOAD_TOO_LARGE"}},
        )

    if not data:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "IMAGE_EMPTY"}},
        )

    # 3. Validar MIME por magic bytes
    detected_mime = detect_mime(data)
    if detected_mime not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=415,
            detail={"error": {"code": "UPLOAD_TYPE_NOT_SUPPORTED"}},
        )

    # 4. Comprimir a WebP (sincrono, llamado con asyncio.to_thread)
    try:
        webp_bytes, img_width, img_height = await asyncio.to_thread(
            compress_to_webp,
            data,
            settings.MAX_IMAGE_DIMENSION_PX,
        )
    except Exception:
        logger.exception("Error al comprimir imagen para room %s", room_id)
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "UPLOAD_CORRUPT"}},
        )

    # 5. Guardar en disco
    now = datetime.now(timezone.utc)
    year_str = now.strftime("%Y")
    month_str = now.strftime("%m")

    try:
        file_path, filename = safe_upload_path(
            settings.UPLOAD_DIR,
            project_id,
            room_id,
            year_str,
            month_str,
        )
        file_path.write_bytes(webp_bytes)
    except Exception:
        logger.exception("Error al guardar imagen en disco para room %s", room_id)
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "IMAGE_SAVE_ERROR"}},
        )

    # URL publica relativa al servidor
    original_name = file.filename or "upload.webp"
    url = "/uploads/{}/chat/{}/{}/{}/{}".format(
        project_id, room_id, year_str, month_str, filename
    )
    size_bytes = len(webp_bytes)

    # 6. INSERT en messages y attachments
    msg_id = str(uuid.uuid4())
    attachment_id = str(uuid.uuid4())

    try:
        await db.execute(
            "INSERT INTO messages (id, project_id, room_id, sender_id, content, content_type)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (msg_id, project_id, room_id, user_id, "", "image"),
        )
        await db.execute(
            "INSERT INTO attachments"
            " (id, project_id, message_id, room_id, filename, original_name,"
            "  size_bytes, width, height, url)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                attachment_id,
                project_id,
                msg_id,
                room_id,
                filename,
                original_name,
                size_bytes,
                img_width,
                img_height,
                url,
            ),
        )
        await db.commit()
    except Exception:
        logger.exception("Error al persistir mensaje/attachment para room %s", room_id)
        # Limpiar el archivo guardado si la DB falla
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "DB_ERROR"}},
        )

    # Recuperar created_at real desde la DB
    async with db.execute(
        "SELECT created_at FROM messages WHERE id = ?",
        (msg_id,),
    ) as cursor:
        row = await cursor.fetchone()
    created_at: str = row[0] if row else now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Recuperar username del sender
    sender_username = await _fetch_username(user_id, project_id, db)

    # 7. Obtener api_key del proyecto para el namespace de Socket.IO
    async with db.execute(
        "SELECT api_key FROM projects WHERE id = ?",
        (project_id,),
    ) as cursor:
        proj_row = await cursor.fetchone()

    if proj_row is not None:
        api_key: Optional[str] = proj_row[0]
    else:
        api_key = None

    # Emitir message:new via Socket.IO al room usando el namespace del proyecto
    if api_key:
        namespace = "/" + api_key
        try:
            await sio.emit(
                "message:new",
                {
                    "id": msg_id,
                    "room_id": room_id,
                    "sender_id": user_id,
                    "sender_username": sender_username,
                    "content": "",
                    "content_type": "image",
                    "created_at": created_at,
                    "attachment": {
                        "id": attachment_id,
                        "url": url,
                        "filename": filename,
                        "original_name": original_name,
                        "size_bytes": size_bytes,
                        "width": img_width,
                        "height": img_height,
                    },
                },
                room=room_id,
                namespace=namespace,
            )
        except Exception:
            logger.exception(
                "Error al emitir message:new para room %s namespace %s",
                room_id,
                namespace,
            )
            # No fallar la respuesta HTTP por un error de emision Socket.IO

    return {
        "message_id": msg_id,
        "attachment": {
            "url": url,
            "width": img_width,
            "height": img_height,
            "size_bytes": size_bytes,
        },
    }


async def _fetch_username(user_id: str, project_id: str, db: aiosqlite.Connection) -> str:
    """Retorna el username del usuario o string vacio si no se encuentra."""
    try:
        async with db.execute(
            "SELECT username FROM users WHERE id = ? AND project_id = ?",
            (user_id, project_id),
        ) as cursor:
            row = await cursor.fetchone()
        return row[0] if row else ""
    except Exception:
        logger.exception("Error fetching username for user %s", user_id)
        return ""
