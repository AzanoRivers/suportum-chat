"""
Socket.IO event handlers para Suportum.

Todos los handlers usan namespace="*" para soportar un namespace por proyecto
(el namespace equivale al api_key del proyecto: /<api_key>).

El objeto sio se importa desde app.sockets.server para que python-socketio
registre los handlers en la misma instancia que monta el ASGI app.
"""
import logging
import uuid
from typing import Optional

from app.sockets.server import sio
from app.core.auth import decode_token
from app.core.project import get_project_by_api_key
from app.core.rate_limit import check_rate_limit
from app.config import settings
from app.database import get_db
from app.sockets.rooms import validate_room_access

logger = logging.getLogger("suportum")

# Mapping namespace -> {user_id: sid} para poder buscar el sid de un usuario
# activo al abrir una sala directa. Se actualiza en connect y disconnect.
from typing import Dict
_connected: Dict[str, Dict[str, str]] = {}


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

async def _emit_error(sid: str, code: str, namespace: str) -> None:
    """Emite un error de Socket.IO sin campo message (R2)."""
    await sio.emit("error", {"code": code}, to=sid, namespace=namespace)


# ---------------------------------------------------------------------------
# connect
# ---------------------------------------------------------------------------

@sio.on("connect", namespace="*")
async def on_connect(sid: str, environ: dict, auth: Optional[dict], namespace: str) -> bool:
    """
    Valida el token JWT y el api_key del namespace.
    Retorna False para rechazar la conexion.
    """
    if not auth or not isinstance(auth, dict) or "token" not in auth:
        await _emit_error(sid, "AUTH_MISSING_TOKEN", namespace)
        return False

    api_key = namespace.lstrip("/")

    db = await get_db()

    project = await get_project_by_api_key(api_key, db)
    if project is None:
        await _emit_error(sid, "PROJECT_NOT_FOUND", namespace)
        return False

    try:
        payload = decode_token(auth["token"])
    except Exception:
        await _emit_error(sid, "AUTH_TOKEN_INVALID", namespace)
        return False

    if payload.get("project_id") != project["id"]:
        await _emit_error(sid, "FORBIDDEN", namespace)
        return False

    user_id: str = payload.get("sub", "")
    role: str = payload.get("role", "client")

    await sio.save_session(
        sid,
        {
            "user_id": user_id,
            "project_id": project["id"],
            "role": role,
            "namespace": namespace,
            "rooms": ["general"],
        },
        namespace=namespace,
    )

    # Registrar sid del usuario para poder buscarlo en direct:open
    if namespace not in _connected:
        _connected[namespace] = {}
    _connected[namespace][user_id] = sid

    await sio.enter_room(sid, "general", namespace=namespace)

    logger.info(
        "Socket connected: sid=%s user=%s project=%s role=%s",
        sid, user_id, project["id"], role,
    )
    return True


# ---------------------------------------------------------------------------
# disconnect
# ---------------------------------------------------------------------------

@sio.on("disconnect", namespace="*")
async def on_disconnect(sid: str, namespace: str) -> None:
    """
    Al desconectar, envia typing stop a todos los rooms donde el usuario estaba activo.
    """
    try:
        session = await sio.get_session(sid, namespace=namespace)
    except Exception:
        return

    if not session:
        return

    user_id: str = session.get("user_id", "")
    active_rooms = session.get("rooms", [])

    # Limpiar el mapping de sid activo
    ns_map = _connected.get(namespace, {})
    if ns_map.get(user_id) == sid:
        ns_map.pop(user_id, None)

    db = await get_db()

    username = await _fetch_username(user_id, session.get("project_id", ""), db)

    for room_id in active_rooms:
        try:
            await sio.emit(
                "typing",
                {"room_id": room_id, "username": username, "active": False},
                room=room_id,
                skip_sid=sid,
                namespace=namespace,
            )
        except Exception:
            logger.exception("Error emitting typing stop on disconnect for room %s", room_id)

    logger.info("Socket disconnected: sid=%s user=%s", sid, user_id)


# ---------------------------------------------------------------------------
# room:join
# ---------------------------------------------------------------------------

@sio.on("room:join", namespace="*")
async def on_room_join(sid: str, data: dict, namespace: str) -> None:
    session = await sio.get_session(sid, namespace=namespace)
    if not session:
        await _emit_error(sid, "AUTH_MISSING_TOKEN", namespace)
        return

    room_id: Optional[str] = data.get("room_id") if isinstance(data, dict) else None
    if not room_id:
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    user_id: str = session["user_id"]
    project_id: str = session["project_id"]
    role: str = session["role"]

    db = await get_db()

    has_access = await validate_room_access(project_id, user_id, role, room_id, db)
    if not has_access:
        await _emit_error(sid, "FORBIDDEN_ROOM", namespace)
        return

    await sio.enter_room(sid, room_id, namespace=namespace)

    active_rooms = session.get("rooms", [])
    if room_id not in active_rooms:
        active_rooms.append(room_id)
        session["rooms"] = active_rooms
        await sio.save_session(sid, session, namespace=namespace)

    # Historial: ultimos 50 mensajes, enviados solo al sid que hizo join (R5)
    messages = await _fetch_history(project_id, room_id, db, limit=50)
    await sio.emit(
        "message:history",
        {"room_id": room_id, "messages": messages},
        to=sid,
        namespace=namespace,
    )

    logger.info(
        "room:join user=%s project=%s room=%s",
        user_id, project_id, room_id,
    )


# ---------------------------------------------------------------------------
# room:leave
# ---------------------------------------------------------------------------

@sio.on("room:leave", namespace="*")
async def on_room_leave(sid: str, data: dict, namespace: str) -> None:
    session = await sio.get_session(sid, namespace=namespace)
    if not session:
        return

    room_id: Optional[str] = data.get("room_id") if isinstance(data, dict) else None
    if not room_id:
        return

    await sio.leave_room(sid, room_id, namespace=namespace)

    active_rooms = session.get("rooms", [])
    if room_id in active_rooms:
        active_rooms.remove(room_id)
        session["rooms"] = active_rooms
        await sio.save_session(sid, session, namespace=namespace)

    logger.info(
        "room:leave user=%s room=%s",
        session.get("user_id", "-"), room_id,
    )


# ---------------------------------------------------------------------------
# message:send
# ---------------------------------------------------------------------------

@sio.on("message:send", namespace="*")
async def on_message_send(sid: str, data: dict, namespace: str) -> None:
    session = await sio.get_session(sid, namespace=namespace)
    if not session:
        await _emit_error(sid, "AUTH_MISSING_TOKEN", namespace)
        return

    user_id: str = session["user_id"]
    project_id: str = session["project_id"]
    role: str = session["role"]

    if not check_rate_limit("msg:" + user_id, settings.SOCKET_MSG_RATE_MAX, settings.SOCKET_MSG_RATE_WINDOW):
        await _emit_error(sid, "RATE_LIMITED", namespace)
        return

    if not isinstance(data, dict):
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    room_id: Optional[str] = data.get("room_id")
    content: str = data.get("content", "")
    content_type: str = data.get("content_type", "text")

    if not room_id:
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    if content_type not in ("text", "image", "text+image"):
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    if len(content) > 4000:
        await _emit_error(sid, "MESSAGE_TOO_LONG", namespace)
        return

    db = await get_db()

    has_access = await validate_room_access(project_id, user_id, role, room_id, db)
    if not has_access:
        await _emit_error(sid, "FORBIDDEN_ROOM", namespace)
        return

    msg_id = str(uuid.uuid4())

    await db.execute(
        "INSERT INTO messages (id, project_id, room_id, sender_id, content, content_type)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, project_id, room_id, user_id, content, content_type),
    )
    await db.commit()

    username = await _fetch_username(user_id, project_id, db)

    # Traer created_at desde la DB para devolver el timestamp real
    async with db.execute(
        "SELECT created_at FROM messages WHERE id = ?",
        (msg_id,),
    ) as cursor:
        row = await cursor.fetchone()
    created_at: str = row[0] if row else ""

    await sio.emit(
        "message:new",
        {
            "id": msg_id,
            "room_id": room_id,
            "sender_id": user_id,
            "sender_username": username,
            "content": content,
            "content_type": content_type,
            "created_at": created_at,
        },
        room=room_id,
        namespace=namespace,
    )

    logger.info(
        "message:send user=%s project=%s room=%s msg=%s type=%s",
        user_id, project_id, room_id, msg_id, content_type,
    )


# ---------------------------------------------------------------------------
# typing:start / typing:stop
# ---------------------------------------------------------------------------

@sio.on("typing:start", namespace="*")
async def on_typing_start(sid: str, data: dict, namespace: str) -> None:
    await _handle_typing(sid, data, namespace, active=True)


@sio.on("typing:stop", namespace="*")
async def on_typing_stop(sid: str, data: dict, namespace: str) -> None:
    await _handle_typing(sid, data, namespace, active=False)


async def _handle_typing(sid: str, data: dict, namespace: str, active: bool) -> None:
    session = await sio.get_session(sid, namespace=namespace)
    if not session:
        return

    room_id: Optional[str] = data.get("room_id") if isinstance(data, dict) else None
    if not room_id:
        return

    user_id: str = session["user_id"]
    project_id: str = session["project_id"]
    db = await get_db()
    username = await _fetch_username(user_id, project_id, db)

    await sio.emit(
        "typing",
        {"room_id": room_id, "username": username, "active": active},
        room=room_id,
        skip_sid=sid,  # R6: no emitir al propio sender
        namespace=namespace,
    )


# ---------------------------------------------------------------------------
# direct:open
# ---------------------------------------------------------------------------

@sio.on("direct:open", namespace="*")
async def on_direct_open(sid: str, data: dict, namespace: str) -> None:
    session = await sio.get_session(sid, namespace=namespace)
    if not session:
        await _emit_error(sid, "AUTH_MISSING_TOKEN", namespace)
        return

    role: str = session["role"]
    if role == "client":
        await _emit_error(sid, "FORBIDDEN", namespace)
        return

    if not isinstance(data, dict):
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    target_user_id: Optional[str] = data.get("target_user_id")
    if not target_user_id:
        await _emit_error(sid, "VALIDATION_ERROR", namespace)
        return

    user_id: str = session["user_id"]

    # Room canonico: min/max para evitar duplicados independientemente del orden
    a = min(user_id, target_user_id)
    b = max(user_id, target_user_id)
    room_id = "direct:" + a + ":" + b

    # Unir al iniciador
    await sio.enter_room(sid, room_id, namespace=namespace)
    active_rooms = session.get("rooms", [])
    if room_id not in active_rooms:
        active_rooms.append(room_id)
        session["rooms"] = active_rooms
        await sio.save_session(sid, session, namespace=namespace)

    # Unir al target si esta conectado en este namespace
    target_sid: Optional[str] = _connected.get(namespace, {}).get(target_user_id)
    if target_sid and target_sid != sid:
        await sio.enter_room(target_sid, room_id, namespace=namespace)
        try:
            target_session = await sio.get_session(target_sid, namespace=namespace)
            if target_session:
                target_rooms = target_session.get("rooms", [])
                if room_id not in target_rooms:
                    target_rooms.append(room_id)
                    target_session["rooms"] = target_rooms
                    await sio.save_session(target_sid, target_session, namespace=namespace)
        except Exception:
            logger.exception("Error updating target session in direct:open")

    payload = {
        "room_id": room_id,
        "participants": [user_id, target_user_id],
    }

    # Emitir a todo el room: ahora incluye al target si estaba conectado
    await sio.emit("room:opened", payload, room=room_id, namespace=namespace)

    logger.info(
        "direct:open initiator=%s target=%s room=%s",
        user_id, target_user_id, room_id,
    )


# ---------------------------------------------------------------------------
# Helpers de base de datos
# ---------------------------------------------------------------------------

async def _fetch_username(user_id: str, project_id: str, db: object) -> str:
    """Retorna el username del usuario o un string vacio si no se encuentra."""
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


async def _fetch_history(
    project_id: str,
    room_id: str,
    db: object,
    limit: int = 50,
) -> list:
    """
    Retorna los ultimos N mensajes del room en orden cronologico ascendente.
    La query trae DESC para aplicar LIMIT, luego se invierte.
    """
    try:
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
    except Exception:
        logger.exception("Error fetching history for room %s", room_id)
        return []
