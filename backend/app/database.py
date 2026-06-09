from typing import Optional

import aiosqlite
from pathlib import Path
from app.config import settings

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.DATABASE_URL)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def run_migrations():
    db = await get_db()
    sql_path = Path(__file__).parent.parent / "migrations" / "001_initial.sql"
    sql = sql_path.read_text()
    await db.executescript(sql)
    await db.commit()
