from typing import Optional

import aiosqlite


async def get_project_by_api_key(
    api_key: str, db: aiosqlite.Connection
) -> Optional[dict]:
    async with db.execute(
        "SELECT * FROM projects WHERE api_key = ? AND is_active = 1",
        (api_key,),
    ) as cursor:
        row = await cursor.fetchone()
    return dict(row) if row is not None else None


async def get_project_by_id(
    project_id: str, db: aiosqlite.Connection
) -> Optional[dict]:
    async with db.execute(
        "SELECT * FROM projects WHERE id = ? AND is_active = 1",
        (project_id,),
    ) as cursor:
        row = await cursor.fetchone()
    return dict(row) if row is not None else None
