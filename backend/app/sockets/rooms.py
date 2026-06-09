import logging
from typing import Optional

import aiosqlite

logger = logging.getLogger("suportum")


async def validate_room_access(
    project_id: str,
    user_id: str,
    role: str,
    room_id: str,
    db: aiosqlite.Connection,
) -> bool:
    """
    Determina si un usuario tiene acceso a un room dado su rol.

    Reglas:
    - "general"           : cualquier rol del proyecto
    - "direct:{a}:{b}"   : user_id es a o b, o role in (agent, admin)
    - "ticket:{tid}"     : ticket existe en project_id y (client_id == user_id o role in agent/admin)
    - "orders:board"     : solo role in (agent, admin)
    - cualquier otro     : False
    """
    if room_id == "general":
        return True

    if room_id.startswith("direct:"):
        parts = room_id.split(":")
        if len(parts) != 3:
            return False
        participant_a = parts[1]
        participant_b = parts[2]
        if user_id in (participant_a, participant_b):
            return True
        if role in ("agent", "admin"):
            return True
        return False

    if room_id.startswith("ticket:"):
        parts = room_id.split(":", 1)
        if len(parts) != 2:
            return False
        ticket_id = parts[1]
        try:
            async with db.execute(
                "SELECT client_id FROM tickets WHERE id = ? AND project_id = ?",
                (ticket_id, project_id),
            ) as cursor:
                row = await cursor.fetchone()
        except Exception:
            logger.exception("Error checking ticket access for room %s", room_id)
            return False
        if row is None:
            return False
        client_id: Optional[str] = row[0] if row else None
        if client_id == user_id:
            return True
        if role in ("agent", "admin"):
            return True
        return False

    if room_id == "orders:board":
        return role in ("agent", "admin")

    return False
