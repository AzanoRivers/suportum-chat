import logging
import sqlite3
from typing import Optional

import aiosqlite
from pathlib import Path
from app.config import settings

logger = logging.getLogger("suportum")

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.DATABASE_URL)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def run_migrations() -> None:
    """
    Ejecuta todas las migraciones en migrations/*.sql, ordenadas alfabeticamente
    por nombre de archivo. Cada script debe ser idempotente (usar
    "IF NOT EXISTS" en tablas/indices). Si un script contiene una sentencia no
    idempotente (ej. ALTER TABLE ADD COLUMN) que ya fue aplicada en una corrida
    previa, el error se trata como ya aplicado y se continua con el resto.
    """
    db = await get_db()
    migrations_dir = Path(__file__).parent.parent / "migrations"
    for sql_path in sorted(migrations_dir.glob("*.sql")):
        sql = sql_path.read_text()
        try:
            await db.executescript(sql)
        except sqlite3.OperationalError as exc:
            message = str(exc).lower()
            if "duplicate column name" in message or "already exists" in message:
                logger.info("Migracion %s ya aplicada, se omite", sql_path.name)
                continue
            raise
    await db.commit()
