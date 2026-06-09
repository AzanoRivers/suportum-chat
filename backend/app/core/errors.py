import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger("suportum")


def error_response(code: str, status: int) -> JSONResponse:
    """Solo envía el código de error. El frontend resuelve el mensaje via i18n."""
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code}},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    CODE_MAP = {401: "AUTH_TOKEN_INVALID", 403: "FORBIDDEN", 404: "NOT_FOUND", 429: "RATE_LIMITED"}
    detail = exc.detail
    if isinstance(detail, str) and detail.isupper() and "_" in detail:
        code = detail
    else:
        code = CODE_MAP.get(exc.status_code, "INTERNAL_ERROR")
    return error_response(code, exc.status_code)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response("VALIDATION_ERROR", 400)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s %s", request.method, request.url)
    return error_response("INTERNAL_ERROR", 500)
