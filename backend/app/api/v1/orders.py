"""
REST endpoints para gestion de ordenes.

POST   /orders              : crea orden (client/agent/admin)
GET    /orders              : listado con filtros por rol y query params
GET    /orders/{order_id}   : get individual con IDOR por rol
PATCH  /orders/{order_id}   : actualiza status/agent_id/details con validacion de transicion
DELETE /orders/{order_id}   : solo admin, retorna 204

Al crear y al hacer PATCH exitoso, emite order:updated via Socket.IO al room orders:board
en el namespace /<api_key>.
"""
import json
import logging
from typing import Optional, List, Dict, Any
from uuid import uuid4

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from pydantic import BaseModel, Field

from app.core.guards import get_scoped_project
from app.core.errors import error_response
from app.database import get_db
from app.sockets.server import sio

logger = logging.getLogger("suportum")

router = APIRouter()

# ---------------------------------------------------------------------------
# Maquina de estados
# Claves: (status_actual, status_nuevo) -> set de roles permitidos
# ---------------------------------------------------------------------------

_VALID_TRANSITIONS: Dict[tuple, set] = {
    ("pending",   "active"):    {"agent", "admin"},
    ("pending",   "cancelled"): {"client", "agent", "admin"},
    ("active",    "taken"):     {"agent", "admin"},
    ("active",    "cancelled"): {"agent", "admin"},
    ("taken",     "completed"): {"agent", "admin"},
    ("taken",     "cancelled"): {"agent", "admin"},
}

VALID_STATUSES: set = {"pending", "active", "taken", "completed", "cancelled"}

# Estado terminal: no puede transicionar a ninguno
TERMINAL_STATUS = "completed"

# Limite de tamano del campo details (50 KB)
DETAILS_MAX_BYTES = 50 * 1024


def validate_order_transition(current: str, new: str, role: str) -> bool:
    """
    Retorna True si la transicion de estado es valida para el rol dado.
    Retorna False en cualquier otro caso (incluyendo estado terminal).
    """
    if current == TERMINAL_STATUS:
        return False
    allowed_roles = _VALID_TRANSITIONS.get((current, new))
    if allowed_roles is None:
        return False
    return role in allowed_roles


# ---------------------------------------------------------------------------
# Modelos de request
# ---------------------------------------------------------------------------

class CreateOrderRequest(BaseModel):
    type: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=200)
    details: Optional[Dict[str, Any]] = None


class PatchOrderRequest(BaseModel):
    status: Optional[str] = None
    agent_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Helper: construye dict de orden desde una row de DB
# ---------------------------------------------------------------------------

def _row_to_order(row: aiosqlite.Row) -> dict:
    raw_details = row["details"]
    if raw_details:
        try:
            parsed_details: dict = json.loads(raw_details)
        except (json.JSONDecodeError, ValueError):
            parsed_details = {}
    else:
        parsed_details = {}

    return {
        "id":           row["id"],
        "project_id":   row["project_id"],
        "type":         row["type"],
        "title":        row["title"],
        "details":      parsed_details,
        "status":       row["status"],
        "client_id":    row["client_id"],
        "client_name":  row["client_name"],
        "agent_id":     row["agent_id"],
        "agent_name":   row["agent_name"],
        "created_at":   row["created_at"],
        "updated_at":   row["updated_at"],
    }


# ---------------------------------------------------------------------------
# Helper: emite order:updated via Socket.IO
# ---------------------------------------------------------------------------

async def _emit_order_updated(
    db: aiosqlite.Connection,
    project_id: str,
    order_dict: dict,
    action: str,
) -> None:
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
                "order:updated",
                {"order": order_dict, "action": action},
                room="orders:board",
                namespace=namespace,
            )
    except Exception:
        logger.exception("Error emitting order:updated for order %s", order_dict.get("id"))


# ---------------------------------------------------------------------------
# POST /orders
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_order(
    body: CreateOrderRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]

    if not body.type or not body.type.strip():
        return error_response("VALIDATION_ERROR", 400)

    if not body.title or not body.title.strip():
        return error_response("VALIDATION_ERROR", 400)

    details_str: Optional[str] = None
    if body.details is not None:
        details_str = json.dumps(body.details)
        if len(details_str.encode("utf-8")) > DETAILS_MAX_BYTES:
            return error_response("UPLOAD_TOO_LARGE", 413)

    order_id = str(uuid4())

    await db.execute(
        "INSERT INTO orders (id, project_id, type, title, details, status, client_id)"
        " VALUES (?, ?, ?, ?, ?, 'pending', ?)",
        (order_id, project_id, body.type.strip(), body.title.strip(), details_str, user_id),
    )
    await db.commit()

    async with db.execute(
        "SELECT o.id, o.project_id, o.type, o.title, o.details, o.status,"
        "       o.client_id, c.username AS client_name,"
        "       o.agent_id,  a.username AS agent_name,"
        "       o.created_at, o.updated_at"
        " FROM orders o"
        " JOIN users c ON o.client_id = c.id"
        " LEFT JOIN users a ON o.agent_id = a.id"
        " WHERE o.id = ? AND o.project_id = ?",
        (order_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        return error_response("INTERNAL_ERROR", 500)

    order_dict = _row_to_order(row)

    await _emit_order_updated(db, project_id, order_dict, "created")

    return {"order": order_dict}


# ---------------------------------------------------------------------------
# GET /orders
# ---------------------------------------------------------------------------

@router.get("")
async def list_orders(
    status: Optional[str] = Query(default=None),
    agent_id: Optional[str] = Query(default=None),
    client_id: Optional[str] = Query(default=None),
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    base_select = (
        "SELECT o.id, o.project_id, o.type, o.title, o.details, o.status,"
        "       o.client_id, c.username AS client_name,"
        "       o.agent_id,  a.username AS agent_name,"
        "       o.created_at, o.updated_at"
        " FROM orders o"
        " JOIN users c ON o.client_id = c.id"
        " LEFT JOIN users a ON o.agent_id = a.id"
    )

    conditions: List[str] = ["o.project_id = ?"]
    params: List[object] = [project_id]

    # Restriccion base por rol
    if role == "client":
        # Client solo ve sus propias ordenes; ignora client_id y agent_id externos
        conditions.append("o.client_id = ?")
        params.append(user_id)
    else:
        # agent/admin: pueden usar client_id como filtro
        if client_id is not None:
            conditions.append("o.client_id = ?")
            params.append(client_id)

    # Filtro agent_id=me (solo agent/admin puede usarlo)
    if agent_id is not None and role != "client":
        if agent_id == "me":
            conditions.append("o.agent_id = ?")
            params.append(user_id)
        else:
            conditions.append("o.agent_id = ?")
            params.append(agent_id)

    # Filtro por status (uno o varios separados por coma)
    if status is not None:
        requested_statuses = [s.strip() for s in status.split(",") if s.strip()]
        valid_requested = [s for s in requested_statuses if s in VALID_STATUSES]
        if valid_requested:
            placeholders = ", ".join("?" for _ in valid_requested)
            conditions.append("o.status IN (" + placeholders + ")")
            params.extend(valid_requested)

    where_clause = " WHERE " + " AND ".join(conditions)
    query = base_select + where_clause + " ORDER BY o.created_at DESC"

    async with db.execute(query, tuple(params)) as cursor:
        rows = await cursor.fetchall()

    orders: List[dict] = [_row_to_order(row) for row in rows]
    return {"orders": orders}


# ---------------------------------------------------------------------------
# GET /orders/{order_id}
# ---------------------------------------------------------------------------

@router.get("/{order_id}")
async def get_order(
    order_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    base_select = (
        "SELECT o.id, o.project_id, o.type, o.title, o.details, o.status,"
        "       o.client_id, c.username AS client_name,"
        "       o.agent_id,  a.username AS agent_name,"
        "       o.created_at, o.updated_at"
        " FROM orders o"
        " JOIN users c ON o.client_id = c.id"
        " LEFT JOIN users a ON o.agent_id = a.id"
    )

    if role == "admin":
        query = base_select + " WHERE o.id = ? AND o.project_id = ?"
        fetch_params: tuple = (order_id, project_id)

    elif role == "agent":
        query = base_select + " WHERE o.id = ? AND o.project_id = ?"
        fetch_params = (order_id, project_id)

    else:
        # Client: solo sus propias ordenes; retorna 404 si no es suya (IDOR)
        query = base_select + " WHERE o.id = ? AND o.project_id = ? AND o.client_id = ?"
        fetch_params = (order_id, project_id, user_id)

    async with db.execute(query, fetch_params) as cursor:
        row = await cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    return {"order": _row_to_order(row)}


# ---------------------------------------------------------------------------
# PATCH /orders/{order_id}
# ---------------------------------------------------------------------------

@router.patch("/{order_id}")
async def patch_order(
    order_id: str,
    body: PatchOrderRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    project_id: str = scoped["project"]["id"]
    user_id: str = scoped["user_id"]
    role: str = scoped["role"]

    # Obtener orden actual con IDOR segun rol
    if role == "admin":
        fetch_query = (
            "SELECT id, status, agent_id, client_id"
            " FROM orders WHERE id = ? AND project_id = ?"
        )
        fetch_params: tuple = (order_id, project_id)

    elif role == "agent":
        fetch_query = (
            "SELECT id, status, agent_id, client_id"
            " FROM orders WHERE id = ? AND project_id = ?"
        )
        fetch_params = (order_id, project_id)

    else:
        # Client: solo sus propias ordenes
        fetch_query = (
            "SELECT id, status, agent_id, client_id"
            " FROM orders WHERE id = ? AND project_id = ? AND client_id = ?"
        )
        fetch_params = (order_id, project_id, user_id)

    async with db.execute(fetch_query, fetch_params) as cursor:
        current_row = await cursor.fetchone()

    if current_row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    current_status: str = current_row["status"]
    new_status: Optional[str] = body.status
    new_agent_id: Optional[str] = body.agent_id
    new_details: Optional[Dict[str, Any]] = body.details

    # Validar transicion de estado si se solicita
    if new_status is not None:
        if new_status not in VALID_STATUSES:
            return error_response("VALIDATION_ERROR", 400)
        if new_status != current_status:
            if not validate_order_transition(current_status, new_status, role):
                return error_response("INVALID_TRANSITION", 400)

    # Validar permisos al cambiar agent_id
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

    # Validar tamano de details si se proporciona
    details_str: Optional[str] = None
    if new_details is not None:
        details_str = json.dumps(new_details)
        if len(details_str.encode("utf-8")) > DETAILS_MAX_BYTES:
            return error_response("UPLOAD_TOO_LARGE", 413)

    # Si no hay nada que cambiar, retornar error
    if new_status is None and new_agent_id is None and new_details is None:
        return error_response("VALIDATION_ERROR", 400)

    # Construir UPDATE dinamico
    set_clauses: List[str] = []
    update_params: List[object] = []

    if new_status is not None:
        set_clauses.append("status = ?")
        update_params.append(new_status)

    if new_agent_id is not None:
        set_clauses.append("agent_id = ?")
        update_params.append(new_agent_id)

    if new_details is not None:
        set_clauses.append("details = ?")
        update_params.append(details_str)

    set_clauses.append("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')")

    update_params.append(order_id)
    update_params.append(project_id)

    await db.execute(
        "UPDATE orders SET " + ", ".join(set_clauses) + " WHERE id = ? AND project_id = ?",
        tuple(update_params),
    )
    await db.commit()

    # Leer orden actualizada con JOINs
    async with db.execute(
        "SELECT o.id, o.project_id, o.type, o.title, o.details, o.status,"
        "       o.client_id, c.username AS client_name,"
        "       o.agent_id,  a.username AS agent_name,"
        "       o.created_at, o.updated_at"
        " FROM orders o"
        " JOIN users c ON o.client_id = c.id"
        " LEFT JOIN users a ON o.agent_id = a.id"
        " WHERE o.id = ? AND o.project_id = ?",
        (order_id, project_id),
    ) as cursor:
        updated_row = await cursor.fetchone()

    if updated_row is None:
        return error_response("INTERNAL_ERROR", 500)

    order_dict = _row_to_order(updated_row)

    await _emit_order_updated(db, project_id, order_dict, "updated")

    return {"order": order_dict}


# ---------------------------------------------------------------------------
# DELETE /orders/{order_id}
# ---------------------------------------------------------------------------

@router.delete("/{order_id}", status_code=204)
async def delete_order(
    order_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> Response:
    role: str = scoped["role"]

    if role != "admin":
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    project_id: str = scoped["project"]["id"]

    async with db.execute(
        "SELECT id FROM orders WHERE id = ? AND project_id = ?",
        (order_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="NOT_FOUND")

    await db.execute(
        "DELETE FROM orders WHERE id = ? AND project_id = ?",
        (order_id, project_id),
    )
    await db.commit()

    return Response(status_code=204)
