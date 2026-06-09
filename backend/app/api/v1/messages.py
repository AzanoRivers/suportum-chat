"""
REST endpoint para historial de mensajes.

GET /api/v1/messages/{room_id}
  - Requiere JWT valido (Bearer token)
  - Filtra siempre por project_id extraido del JWT
  - Valida acceso al room igual que en Socket.IO
"""
import logging
from typing import List, Optional

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from app.core.guards import get_scoped_project
from app.database import get_db
from app.sockets.rooms import validate_room_access

logger = logging.getLogger("suportum")

router = APIRouter()


@router.get("/{room_id}")
async def get_messages(
    room_id: str,
    before: Optional[str] = None,
    limit: int = 50,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """
    Retorna el historial paginado de mensajes de un room.

    Params:
      - room_id : identificador del room (path)
      - before  : timestamp ISO; retorna mensajes anteriores a este valor (cursor de paginacion)
      - limit   : cantidad maxima de mensajes, maximo 100
    """
    limit = min(limit, 100)

    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    has_access = await validate_room_access(project_id, user_id, role, room_id, db)
    if not has_access:
        raise HTTPException(status_code=403, detail="FORBIDDEN_ROOM")

    messages = await _query_messages(project_id, room_id, db, before=before, limit=limit)

    return {"room_id": room_id, "messages": messages}


async def _query_messages(
    project_id: str,
    room_id: str,
    db: aiosqlite.Connection,
    before: Optional[str],
    limit: int,
) -> List[dict]:
    """
    Ejecuta la query de historial con o sin cursor de paginacion.
    Retorna lista en orden cronologico ascendente.
    """
    if before is not None:
        async with db.execute(
            "SELECT m.id, m.room_id, m.sender_id, u.username AS sender_username,"
            " m.content, m.content_type, m.created_at"
            " FROM messages m"
            " JOIN users u ON m.sender_id = u.id"
            " WHERE m.project_id = ? AND m.room_id = ? AND m.created_at < ?"
            " ORDER BY m.created_at DESC"
            " LIMIT ?",
            (project_id, room_id, before, limit),
        ) as cursor:
            rows = await cursor.fetchall()
    else:
        async with db.execute(
            "SELECT m.id, m.room_id, m.sender_id, u.username AS sender_username,"
            " m.content, m.content_type, m.created_at"
            " FROM messages m"
            " JOIN users u ON m.sender_id = u.id"
            " WHERE m.project_id = ? AND m.room_id = ?"
            " ORDER BY m.created_at DESC"
            " LIMIT ?",
            (project_id, room_id, limit),
        ) as cursor:
            rows = await cursor.fetchall()

    # Invertir para orden cronologico ascendente
    result = []
    for row in reversed(rows):
        result.append({
            "id": row[0],
            "room_id": row[1],
            "sender_id": row[2],
            "sender_username": row[3],
            "content": row[4],
            "content_type": row[5],
            "created_at": row[6],
        })
    return result
