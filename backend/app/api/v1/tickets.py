"""
REST endpoints para gestion de tickets.

POST   /tickets              : crea ticket (client/agent/admin)
GET    /tickets              : listado filtrado por rol
GET    /tickets/{ticket_id}  : get individual con IDOR
PATCH  /tickets/{ticket_id}  : actualiza status/priority/agent_id
DELETE /tickets/{ticket_id}  : solo admin, retorna 204

Al hacer PATCH exitoso, emite ticket:updated via Socket.IO al room del ticket
y al board de ordenes.
"""
import logging
from typing import Optional, List
from uuid import uuid4

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.core.guards import get_scoped_project
from app.core.project import get_project_by_id
from app.core.errors import error_response
from app.database import get_db
from app.sockets.server import sio

logger = logging.getLogger("suportum")

router = APIRouter()

# ---------------------------------------------------------------------------
# Maquina de estados
# Claves: (status_actual, status_nuevo) -> set de roles permitidos
# ---------------------------------------------------------------------------

_VALID_TRANSITIONS = {
    ("open",        "in_progress"): {"agent", "admin"},
    ("open",        "closed"):      {"admin"},
    ("in_progress", "resolved"):    {"agent", "admin"},
    ("in_progress", "closed"):      {"admin"},
    ("resolved",    "closed"):      {"client", "admin"},
}

VALID_STATUSES   = {"open", "in_progress", "resolved", "closed"}
VALID_PRIORITIES = {"low", "normal", "high", "urgent"}


def validate_transition(current: str, new: str, role: str) -> bool:
    """
    Retorna True si la transicion de estado es valida para el rol dado.
    Retorna False en cualquier otro caso.
    """
    allowed_roles = _VALID_TRANSITIONS.get((current, new))
    if allowed_roles is None:
        return False
    return role in allowed_roles


# ---------------------------------------------------------------------------
# Modelos de request
# ---------------------------------------------------------------------------

class CreateTicketRequest(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "normal"


class PatchTicketRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    agent_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: construye dict de ticket desde una row de DB
# ---------------------------------------------------------------------------

def _row_to_ticket(row: aiosqlite.Row) -> dict:
    return {
        "id":           row["id"],
        "project_id":   row["project_id"],
        "title":        row["title"],
        "description":  row["description"],
        "status":       row["status"],
        "priority":     row["priority"],
        "client_id":    row["client_id"],
        "client_name":  row["client_name"],
        "agent_id":     row["agent_id"],
        "agent_name":   row["agent_name"],
        "created_at":   row["created_at"],
        "updated_at":   row["updated_at"],
    }


# ---------------------------------------------------------------------------
# POST /tickets
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_ticket(
    body: CreateTicketRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]

    if not body.title or not body.title.strip():
        return error_response("VALIDATION_ERROR", 400)

    priority = body.priority if body.priority in VALID_PRIORITIES else "normal"

    ticket_id = str(uuid4())

    await db.execute(
        "INSERT INTO tickets (id, project_id, title, description, status, priority, client_id)"
        " VALUES (?, ?, ?, ?, 'open', ?, ?)",
        (ticket_id, project_id, body.title.strip(), body.description, priority, user_id),
    )
    await db.commit()

    async with db.execute(
        "SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,"
        "       t.client_id, c.username AS client_name,"
        "       t.agent_id,  a.username AS agent_name,"
        "       t.created_at, t.updated_at"
        " FROM tickets t"
        " JOIN users c ON t.client_id = c.id"
        " LEFT JOIN users a ON t.agent_id = a.id"
        " WHERE t.id = ? AND t.project_id = ?",
        (ticket_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        return error_response("INTERNAL_ERROR", 500)

    return {"ticket": _row_to_ticket(row)}


# ---------------------------------------------------------------------------
# GET /tickets
# ---------------------------------------------------------------------------

@router.get("")
async def list_tickets(
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    base_select = (
        "SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,"
        "       t.client_id, c.username AS client_name,"
        "       t.agent_id,  a.username AS agent_name,"
        "       t.created_at, t.updated_at"
        " FROM tickets t"
        " JOIN users c ON t.client_id = c.id"
        " LEFT JOIN users a ON t.agent_id = a.id"
    )

    if role == "admin":
        query = base_select + " WHERE t.project_id = ? ORDER BY t.created_at DESC"
        params: tuple = (project_id,)

    elif role == "agent":
        # Agente ve los tickets asignados a el y los sin asignar
        query = (
            base_select
            + " WHERE t.project_id = ? AND (t.agent_id = ? OR t.agent_id IS NULL)"
            + " ORDER BY t.created_at DESC"
        )
        params = (project_id, user_id)

    else:
        # client: solo sus propios tickets
        query = base_select + " WHERE t.project_id = ? AND t.client_id = ? ORDER BY t.created_at DESC"
        params = (project_id, user_id)

    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()

    tickets: List[dict] = [_row_to_ticket(row) for row in rows]
    return {"tickets": tickets}


# ---------------------------------------------------------------------------
# GET /tickets/{ticket_id}
# ---------------------------------------------------------------------------

@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    base_select = (
        "SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,"
        "       t.client_id, c.username AS client_name,"
        "       t.agent_id,  a.username AS agent_name,"
        "       t.created_at, t.updated_at"
        " FROM tickets t"
        " JOIN users c ON t.client_id = c.id"
        " LEFT JOIN users a ON t.agent_id = a.id"
    )

    if role == "admin":
        query = base_select + " WHERE t.id = ? AND t.project_id = ?"
        params: tuple = (ticket_id, project_id)

    elif role == "agent":
        # Agente puede ver tickets asignados a el o sin asignar; aplica IDOR por project
        query = (
            base_select
            + " WHERE t.id = ? AND t.project_id = ?"
            + " AND (t.agent_id = ? OR t.agent_id IS NULL)"
        )
        params = (ticket_id, project_id, user_id)

    else:
        # Client: solo sus propios tickets; retorna 404 si no es suyo (IDOR)
        query = base_select + " WHERE t.id = ? AND t.project_id = ? AND t.client_id = ?"
        params = (ticket_id, project_id, user_id)

    async with db.execute(query, params) as cursor:
        row = await cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    return {"ticket": _row_to_ticket(row)}


# ---------------------------------------------------------------------------
# PATCH /tickets/{ticket_id}
# ---------------------------------------------------------------------------

@router.patch("/{ticket_id}")
async def patch_ticket(
    ticket_id: str,
    body: PatchTicketRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    # Obtener ticket actual; apply IDOR segun rol
    if role == "admin":
        fetch_query = (
            "SELECT id, status, priority, agent_id, client_id"
            " FROM tickets WHERE id = ? AND project_id = ?"
        )
        fetch_params: tuple = (ticket_id, project_id)
    elif role == "agent":
        fetch_query = (
            "SELECT id, status, priority, agent_id, client_id"
            " FROM tickets WHERE id = ? AND project_id = ?"
            " AND (agent_id = ? OR agent_id IS NULL)"
        )
        fetch_params = (ticket_id, project_id, user_id)
    else:
        # Client: solo sus propios tickets
        fetch_query = (
            "SELECT id, status, priority, agent_id, client_id"
            " FROM tickets WHERE id = ? AND project_id = ? AND client_id = ?"
        )
        fetch_params = (ticket_id, project_id, user_id)

    async with db.execute(fetch_query, fetch_params) as cursor:
        current_row = await cursor.fetchone()

    if current_row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    current_status: str = current_row["status"]
    new_status: Optional[str] = body.status
    new_priority: Optional[str] = body.priority
    new_agent_id: Optional[str] = body.agent_id

    # Validar transicion de estado si se solicita
    if new_status is not None:
        if new_status not in VALID_STATUSES:
            return error_response("VALIDATION_ERROR", 400)
        if new_status != current_status:
            if not validate_transition(current_status, new_status, role):
                return error_response("INVALID_TRANSITION", 400)

    # Validar prioridad si se solicita
    if new_priority is not None and new_priority not in VALID_PRIORITIES:
        return error_response("VALIDATION_ERROR", 400)

    # Validar permisos y existencia al cambiar agent_id
    if new_agent_id is not None:
        # Client no puede asignar agente
        if role == "client":
            return error_response("FORBIDDEN", 403)
        # Agent solo puede asignarse a si mismo
        if role == "agent" and new_agent_id != user_id:
            return error_response("FORBIDDEN", 403)
        # Verificar que el nuevo agent existe en el proyecto con role agent
        async with db.execute(
            "SELECT id FROM users WHERE id = ? AND project_id = ? AND role = 'agent' AND is_active = 1",
            (new_agent_id, project_id),
        ) as cursor:
            agent_row = await cursor.fetchone()
        if agent_row is None:
            return error_response("USER_NOT_FOUND", 404)

    # Si no hay nada que cambiar, retornar error
    if new_status is None and new_priority is None and new_agent_id is None:
        return error_response("VALIDATION_ERROR", 400)

    # Construir UPDATE dinamico
    set_clauses: List[str] = []
    update_params: List[object] = []

    if new_status is not None:
        set_clauses.append("status = ?")
        update_params.append(new_status)

    if new_priority is not None:
        set_clauses.append("priority = ?")
        update_params.append(new_priority)

    if new_agent_id is not None:
        set_clauses.append("agent_id = ?")
        update_params.append(new_agent_id)

    set_clauses.append("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')")

    update_params.append(ticket_id)
    update_params.append(project_id)

    await db.execute(
        "UPDATE tickets SET " + ", ".join(set_clauses) + " WHERE id = ? AND project_id = ?",
        tuple(update_params),
    )
    await db.commit()

    # Leer ticket actualizado con JOINs
    async with db.execute(
        "SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,"
        "       t.client_id, c.username AS client_name,"
        "       t.agent_id,  a.username AS agent_name,"
        "       t.created_at, t.updated_at"
        " FROM tickets t"
        " JOIN users c ON t.client_id = c.id"
        " LEFT JOIN users a ON t.agent_id = a.id"
        " WHERE t.id = ? AND t.project_id = ?",
        (ticket_id, project_id),
    ) as cursor:
        updated_row = await cursor.fetchone()

    if updated_row is None:
        return error_response("INTERNAL_ERROR", 500)

    ticket_dict = _row_to_ticket(updated_row)

    # Obtener api_key del proyecto para construir el namespace de Socket.IO
    try:
        async with db.execute(
            "SELECT api_key FROM projects WHERE id = ? AND is_active = 1",
            (project_id,),
        ) as cursor:
            project_row = await cursor.fetchone()

        if project_row is not None:
            api_key: str = project_row["api_key"]
            namespace: str = "/" + api_key
            await sio.emit(
                "ticket:updated",
                {"ticket": ticket_dict},
                room="ticket:" + ticket_id,
                namespace=namespace,
            )
            await sio.emit(
                "ticket:updated",
                {"ticket": ticket_dict},
                room="orders:board",
                namespace=namespace,
            )
    except Exception:
        logger.exception("Error emitting ticket:updated for ticket %s", ticket_id)

    return {"ticket": ticket_dict}


# ---------------------------------------------------------------------------
# DELETE /tickets/{ticket_id}
# ---------------------------------------------------------------------------

@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> Response:
    role: str = scoped["role"]

    if role != "admin":
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    project_id: str = scoped["project"]["id"]

    async with db.execute(
        "SELECT id FROM tickets WHERE id = ? AND project_id = ?",
        (ticket_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    await db.execute(
        "DELETE FROM tickets WHERE id = ? AND project_id = ?",
        (ticket_id, project_id),
    )
    await db.commit()

    return Response(status_code=204)
