from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            from starlette.responses import Response
            origin = request.headers.get("origin", "")
            response = Response(status_code=204)
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type"
                response.headers["Vary"] = "Origin"
            return response

        origin = request.headers.get("origin", "")
        response = await call_next(request)
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type"
            response.headers["Vary"] = "Origin"
        return response
