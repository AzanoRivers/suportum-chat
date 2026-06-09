import socketio
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core.logging_config import setup_logging
from app.core.startup import lifespan
from app.core.errors import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.core.cors import DynamicCORSMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.request_logger import RequestLoggerMiddleware
from app.sockets.server import sio
import app.sockets.events  # noqa: F401 - registra los event handlers de Socket.IO
from app.api.v1.router import router as v1_router

setup_logging(settings.LOG_LEVEL)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(DynamicCORSMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggerMiddleware)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(v1_router, prefix="/api/v1")

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
