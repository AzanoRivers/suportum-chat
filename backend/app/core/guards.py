from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import aiosqlite

from app.core.auth import decode_token
from app.database import get_db

_bearer = HTTPBearer(auto_error=False)


async def get_current_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="AUTH_MISSING_TOKEN")
    return decode_token(credentials.credentials)


async def get_scoped_project(
    token_payload: dict = Depends(get_current_token),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    user_id: str = token_payload.get("sub", "")
    project_id: str = token_payload.get("project_id", "")
    role: str = token_payload.get("role", "")

    async with db.execute(
        "SELECT id FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        project_row = await cursor.fetchone()

    if project_row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    async with db.execute(
        "SELECT id FROM users WHERE id = ? AND project_id = ? AND is_active = 1",
        (user_id, project_id),
    ) as cursor:
        user_row = await cursor.fetchone()

    if user_row is None:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    return {"project": dict(project_row), "user_id": user_id, "role": role}


def require_role(*roles: str):
    async def _guard(
        scoped: dict = Depends(get_scoped_project),
    ) -> dict:
        if scoped["role"] not in roles:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
        return scoped

    return _guard


require_admin = Depends(require_role("admin"))
require_agent_or_admin = Depends(require_role("agent", "admin"))
require_any = Depends(get_scoped_project)
