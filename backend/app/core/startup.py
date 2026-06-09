import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings
from app.database import run_migrations
from app.core.rate_limit import evict_stale_buckets
from app.core.cleanup import purge_old_messages, _24_HOURS


async def _rate_limit_eviction_loop() -> None:
    """Limpia buckets inactivos cada SOCKET_MSG_RATE_WINDOW segundos."""
    while True:
        await asyncio.sleep(settings.SOCKET_MSG_RATE_WINDOW)
        evict_stale_buckets(settings.SOCKET_MSG_RATE_WINDOW)


async def _message_cleanup_loop() -> None:
    """Elimina mensajes y archivos adjuntos viejos cada 24h."""
    await purge_old_messages()  # ejecutar al arrancar
    while True:
        await asyncio.sleep(_24_HOURS)
        await purge_old_messages()


async def on_startup():
    Path(settings.DATABASE_URL).parent.mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    await run_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await on_startup()
    from fastapi.staticfiles import StaticFiles
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    tasks = [
        asyncio.create_task(_rate_limit_eviction_loop()),
        asyncio.create_task(_message_cleanup_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()
