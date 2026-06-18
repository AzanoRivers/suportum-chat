"""
Periodic cleanup job for Suportum.

Deletes messages (and their attachment files on disk) older than
MESSAGE_RETENTION_DAYS. Runs at startup and every 24 hours.

attachments rows are removed automatically via ON DELETE CASCADE in SQLite.
Physical files on disk must be deleted explicitly before the DB rows are gone.
"""
import asyncio
import logging
import os
from pathlib import Path
from typing import List, Optional, Tuple

import aiosqlite

from app.config import settings
from app.database import get_db

logger = logging.getLogger("suportum.cleanup")

_24_HOURS = 86400


async def purge_old_messages() -> None:
    """Delete messages and attachment files older than MESSAGE_RETENTION_DAYS."""
    db: aiosqlite.Connection = await get_db()
    retention = settings.MESSAGE_RETENTION_DAYS

    # Collect attachment file paths BEFORE deleting (CASCADE removes them after)
    async with db.execute(
        "SELECT filename, room_id FROM attachments"
        " WHERE created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)",
        (f"-{retention} days",),
    ) as cursor:
        old_attachments: List[Tuple[str, str]] = await cursor.fetchall()

    # Delete old messages; attachments rows cascade automatically
    async with db.execute(
        "DELETE FROM messages"
        " WHERE created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)",
        (f"-{retention} days",),
    ) as cursor:
        deleted_rows = cursor.rowcount

    await db.commit()

    # Remove physical files from disk en un thread para no bloquear el event loop
    if old_attachments:
        upload_dir = settings.UPLOAD_DIR
        deleted_files = await asyncio.to_thread(_delete_attachment_files, old_attachments, upload_dir)
    else:
        deleted_files = 0

    if deleted_rows:
        logger.info(
            "cleanup: deleted %d messages and %d attachment files (retention=%d days)",
            deleted_rows,
            deleted_files,
            retention,
        )


def _delete_attachment_files(attachments: List[Tuple[str, str]], upload_dir: str) -> int:
    """Elimina los archivos fisicos de disco. Sincrono; llamar con asyncio.to_thread."""
    deleted = 0
    for filename, room_id in attachments:
        room_dir = Path(upload_dir) / "chat" / room_id
        file_path = _find_file(room_dir, filename)
        if file_path and file_path.exists():
            try:
                file_path.unlink()
                deleted += 1
            except OSError:
                logger.warning("Could not delete attachment file: %s", file_path)
    return deleted


def _find_file(base_dir: Path, filename: str) -> Optional[Path]:
    """Walk base_dir recursively to find filename. Returns first match or None."""
    if not base_dir.exists():
        return None
    for root, _dirs, files in os.walk(base_dir):
        if filename in files:
            return Path(root) / filename
    return None
