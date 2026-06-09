"""
HTTP request logging middleware for Suportum.

Logs every request with: method, path, status, duration_ms, user_id.
user_id is extracted from the Bearer token when present (never crashes if absent).
"""
import logging
import time
from typing import Callable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.auth import decode_token

logger = logging.getLogger("suportum.http")


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.monotonic()

        user_id: Optional[str] = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = decode_token(auth[7:])
                user_id = payload.get("sub")
            except Exception:
                pass

        response = await call_next(request)

        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "method=%s path=%s status=%s duration_ms=%d user=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            user_id or "-",
        )
        return response
