from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    _ALLOW_METHODS  = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    _ALLOW_HEADERS  = "Authorization,Content-Type"

    def _apply_cors(self, response: Response, origin: str) -> None:
        if not origin:
            return
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = self._ALLOW_METHODS
        response.headers["Access-Control-Allow-Headers"]     = self._ALLOW_HEADERS
        response.headers["Vary"]                             = "Origin"

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        if request.method == "OPTIONS":
            response = Response(status_code=204)
            self._apply_cors(response, origin)
            return response

        try:
            response = await call_next(request)
        except Exception:
            response = JSONResponse(
                {"error": {"code": "INTERNAL_ERROR"}},
                status_code=500,
            )

        self._apply_cors(response, origin)
        return response
