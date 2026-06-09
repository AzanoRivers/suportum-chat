"""
Endpoints de gestion del proyecto para Suportum.

GET    /projects/me            -> datos del proyecto (admin)
PATCH  /projects/me            -> actualiza name y/o settings (admin)
POST   /projects/me/rotate-key -> rota el api_key (admin)
"""
import json
import uuid
from typing import Any, Dict, Optional

import aiosqlite
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.errors import error_response
from app.core.guards import require_admin
from app.core.utils import now_iso
from app.database import get_db

router = APIRouter()

_PROJECT_FIELDS = "id, name, api_key, slug, settings, plan, is_active, created_at, updated_at"


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
