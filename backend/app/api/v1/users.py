"""
REST endpoints para gestion de usuarios.

GET    /users              : lista usuarios del proyecto (admin/agent; client -> 403)
GET    /users/{user_id}    : perfil individual con IDOR por rol
POST   /users              : crea usuario (solo admin); hashea password
PATCH  /users/{user_id}    : actualiza usuario; admin puede todo; usuario solo username/password
DELETE /users/{user_id}    : soft delete (is_active=0); solo admin; admin no puede borrarse a si mismo
"""
import logging
from typing import Optional, List
from uuid import uuid4

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlite3 import IntegrityError

from app.core.guards import get_scoped_project
from app.core.auth import hash_password
from app.core.errors import error_response
from app.core.utils import now_iso
from app.database import get_db

logger = logging.getLogger("suportum")

router = APIRouter()

VALID_ROLES = {"client", "agent", "admin"}

# Campos publicos de usuario (nunca incluir password)
_USER_FIELDS = (
    "id, project_id, email, username, role, is_active, created_at, updated_at"
)


def _row_to_user(row: aiosqlite.Row) -> dict:
    return {
        "id":         row["id"],
        "project_id": row["project_id"],
        "email":      row["email"],
        "username":   row["username"],
        "role":       row["role"],
        "is_active":  bool(row["is_active"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


# ---------------------------------------------------------------------------
# Modelos de request
# ---------------------------------------------------------------------------

class CreateUserRequest(BaseModel):
    email: str
    username: str
    password: str
    role: Optional[str] = "client"


class PatchUserRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# GET /users
# ---------------------------------------------------------------------------

@router.get("")
async def list_users(
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    role: str = scoped["role"]

    if role == "client":
        return error_response("FORBIDDEN", 403)

    project_id: str = scoped["project"]["id"]

    async with db.execute(
        "SELECT " + _USER_FIELDS + " FROM users WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,),
    ) as cursor:
        rows = await cursor.fetchall()

    users: List[dict] = [_row_to_user(row) for row in rows]
    return {"users": users}


# ---------------------------------------------------------------------------
# GET /users/{user_id}
# ---------------------------------------------------------------------------

@router.get("/{user_id}")
async def get_user(
    user_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    role: str = scoped["role"]
    current_user_id: str = scoped["user_id"]
    project_id: str = scoped["project"]["id"]

    # agent y client solo pueden ver su propio perfil
    if role in ("agent", "client") and user_id != current_user_id:
        return error_response("FORBIDDEN", 403)

    async with db.execute(
        "SELECT " + _USER_FIELDS + " FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        return error_response("USER_NOT_FOUND", 404)

    return {"user": _row_to_user(row)}


# ---------------------------------------------------------------------------
# POST /users
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_user(
    body: CreateUserRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    role: str = scoped["role"]

    if role != "admin":
        return error_response("FORBIDDEN", 403)

    project_id: str = scoped["project"]["id"]

    if not body.email or not body.email.strip():
        return error_response("VALIDATION_ERROR", 400)
    if not body.username or not body.username.strip():
        return error_response("VALIDATION_ERROR", 400)
    if not body.password or not body.password.strip():
        return error_response("VALIDATION_ERROR", 400)

    user_role = body.role if body.role in VALID_ROLES else "client"

    user_id = str(uuid4())
    hashed = hash_password(body.password)
    ts = now_iso()

    try:
        await db.execute(
            "INSERT INTO users (id, project_id, email, username, password, role, is_active, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
            (user_id, project_id, body.email.strip(), body.username.strip(), hashed, user_role, ts, ts),
        )
        await db.commit()
    except IntegrityError as exc:
        msg = str(exc).lower()
        if "email" in msg:
            return error_response("EMAIL_TAKEN", 409)
        if "username" in msg:
            return error_response("USERNAME_TAKEN", 409)
        return error_response("EMAIL_TAKEN", 409)

    async with db.execute(
        "SELECT " + _USER_FIELDS + " FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        return error_response("INTERNAL_ERROR", 500)

    return {"user": _row_to_user(row)}


# ---------------------------------------------------------------------------
# PATCH /users/{user_id}
# ---------------------------------------------------------------------------

@router.patch("/{user_id}")
async def patch_user(
    user_id: str,
    body: PatchUserRequest,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    role: str = scoped["role"]
    current_user_id: str = scoped["user_id"]
    project_id: str = scoped["project"]["id"]

    # Verificar que el usuario objetivo existe en el proyecto
    async with db.execute(
        "SELECT " + _USER_FIELDS + " FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        target_row = await cursor.fetchone()

    if target_row is None:
        return error_response("USER_NOT_FOUND", 404)

    # Permisos: admin puede editar a cualquiera; agent/client solo a si mismos
    if role != "admin" and user_id != current_user_id:
        return error_response("FORBIDDEN", 403)

    # agent/client solo pueden cambiar username y password
    if role in ("agent", "client"):
        if body.email is not None or body.role is not None or body.is_active is not None:
            return error_response("FORBIDDEN", 403)

    # Proteger al admin de bloquearse a si mismo
    if user_id == current_user_id and role == "admin":
        if body.role is not None and body.role != "admin":
            return error_response("FORBIDDEN", 403)
        if body.is_active is not None and not body.is_active:
            return error_response("FORBIDDEN", 403)

    # Construir UPDATE dinamico
    set_clauses: List[str] = []
    update_params: List[object] = []

    if body.username is not None:
        if not body.username.strip():
            return error_response("VALIDATION_ERROR", 400)
        set_clauses.append("username = ?")
        update_params.append(body.username.strip())

    if body.password is not None:
        if not body.password.strip():
            return error_response("VALIDATION_ERROR", 400)
        set_clauses.append("password = ?")
        update_params.append(hash_password(body.password))

    if body.email is not None:
        if not body.email.strip():
            return error_response("VALIDATION_ERROR", 400)
        set_clauses.append("email = ?")
        update_params.append(body.email.strip())

    if body.role is not None:
        if body.role not in VALID_ROLES:
            return error_response("VALIDATION_ERROR", 400)
        set_clauses.append("role = ?")
        update_params.append(body.role)

    if body.is_active is not None:
        set_clauses.append("is_active = ?")
        update_params.append(1 if body.is_active else 0)

    if not set_clauses:
        return error_response("VALIDATION_ERROR", 400)

    set_clauses.append("updated_at = ?")
    update_params.append(now_iso())

    update_params.append(user_id)
    update_params.append(project_id)

    try:
        await db.execute(
            "UPDATE users SET " + ", ".join(set_clauses) + " WHERE id = ? AND project_id = ?",
            tuple(update_params),
        )
        await db.commit()
    except IntegrityError as exc:
        msg = str(exc).lower()
        if "email" in msg:
            return error_response("EMAIL_TAKEN", 409)
        if "username" in msg:
            return error_response("USERNAME_TAKEN", 409)
        return error_response("EMAIL_TAKEN", 409)

    async with db.execute(
        "SELECT " + _USER_FIELDS + " FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        updated_row = await cursor.fetchone()

    if updated_row is None:
        return error_response("INTERNAL_ERROR", 500)

    return {"user": _row_to_user(updated_row)}


# ---------------------------------------------------------------------------
# DELETE /users/{user_id}
# ---------------------------------------------------------------------------

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> Response:
    role: str = scoped["role"]

    if role != "admin":
        return error_response("FORBIDDEN", 403)

    current_user_id: str = scoped["user_id"]
    project_id: str = scoped["project"]["id"]

    # Admin no puede desactivarse a si mismo
    if user_id == current_user_id:
        return error_response("FORBIDDEN", 403)

    async with db.execute(
        "SELECT id FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        row = await cursor.fetchone()

    if row is None:
        return error_response("USER_NOT_FOUND", 404)

    await db.execute(
        "UPDATE users SET is_active = 0, updated_at = ? WHERE id = ? AND project_id = ?",
        (now_iso(), user_id, project_id),
    )
    await db.commit()

    return Response(status_code=204)
