from fastapi.responses import JSONResponse

_GUIDE_AI = {
    "meta": {
        "name": "Suportum API",
        "version": "1.0.0",
        "base_url": "https://chat.azanolabs.com",
        "description": (
            "Multi-tenant real-time support platform. "
            "One backend process serves multiple independent projects. "
            "Authentication: JWT Bearer token (15 min expiry) + refresh_token HttpOnly cookie (7 days). "
            "All data is scoped to a project_id derived from the api_key."
        ),
        "guide_html": "https://chat.azanolabs.com/guide",
        "transports": ["REST (HTTP/1.1)", "WebSocket via Socket.IO"],
        "socket_io_namespace": "/<api_key>",
        "roles": ["client", "agent", "admin"],
        "error_shape": {"error": {"code": "ERROR_CODE"}},
        "socket_error_shape": {"code": "ERROR_CODE"},
    },

    "authentication": {
        "type": "Bearer JWT",
        "obtain": "POST /api/v1/auth/login or POST /api/v1/auth/register",
        "header": "Authorization: Bearer <access_token>",
        "access_token_ttl": "15 minutes",
        "refresh_token_ttl": "7 days",
        "refresh_mechanism": "POST /api/v1/auth/refresh using refresh_token HttpOnly cookie",
        "api_key_note": (
            "api_key is a PUBLIC project identifier (like Firebase apiKey or Intercom app_id). "
            "Safe to embed in client-side code. "
            "Data access always requires valid user credentials on top of it."
        ),
    },

    "endpoints": {
        "setup": [
            {
                "method": "POST",
                "path": "/api/v1/setup",
                "auth": "public",
                "description": "Create a new project. Returns the api_key for all subsequent calls.",
                "rate_limit": "3 per IP per 24 hours",
                "body": {
                    "name": "string (required)",
                    "admin_email": "string (required)",
                    "admin_username": "string (required)",
                    "admin_password": "string (required, min 8 chars)",
                    "language": "string (optional) — 'en' or 'es'",
                    "slug": "string (optional) — auto-generated from name if absent",
                    "logo_data": "string (optional) — base64 data URI",
                },
                "response": {
                    "api_key": "string",
                    "project_id": "string",
                    "admin": {"user_id": "string", "username": "string"},
                },
            },
            {
                "method": "GET",
                "path": "/api/v1/setup/health",
                "auth": "public",
                "description": "API liveness check.",
                "response": {"status": "ok", "version": "1.0.0"},
            },
            {
                "method": "GET",
                "path": "/api/v1/setup/check-slug/{slug}",
                "auth": "public",
                "description": "Check if a project slug is available.",
                "response": {"available": "boolean"},
            },
            {
                "method": "GET",
                "path": "/api/v1/setup/branding",
                "auth": "public",
                "description": "Project branding for the login screen.",
                "response": {"logo_url": "string | null", "project_name": "string"},
            },
        ],

        "auth": [
            {
                "method": "POST",
                "path": "/api/v1/auth/login",
                "auth": "public",
                "body": {"api_key": "string", "email": "string", "password": "string"},
                "response": {
                    "access_token": "string",
                    "role": "client | agent | admin",
                    "user_id": "string",
                    "project_id": "string",
                },
                "side_effects": ["Sets refresh_token HttpOnly cookie"],
            },
            {
                "method": "POST",
                "path": "/api/v1/auth/register",
                "auth": "public",
                "description": "Register a new user with role 'client'.",
                "body": {
                    "api_key": "string",
                    "email": "string",
                    "username": "string",
                    "password": "string",
                },
                "response": {
                    "access_token": "string",
                    "role": "client",
                    "user_id": "string",
                    "project_id": "string",
                },
                "side_effects": ["Sets refresh_token HttpOnly cookie"],
            },
            {
                "method": "POST",
                "path": "/api/v1/auth/refresh",
                "auth": "refresh_token cookie",
                "description": "Renew access token without re-login.",
                "response": {
                    "access_token": "string",
                    "role": "string",
                    "user_id": "string",
                    "project_id": "string",
                },
            },
            {
                "method": "POST",
                "path": "/api/v1/auth/logout",
                "auth": "Bearer",
                "description": "Clears the refresh_token cookie.",
                "response_code": 204,
            },
            {
                "method": "GET",
                "path": "/api/v1/auth/me",
                "auth": "Bearer",
                "response": {
                    "user_id": "string",
                    "role": "string",
                    "project_id": "string",
                    "username": "string",
                },
            },
        ],

        "messages": [
            {
                "method": "GET",
                "path": "/api/v1/messages/{room_id}",
                "auth": "Bearer",
                "description": "Fetch message history for a room. Real-time messages arrive via Socket.IO.",
                "query_params": {
                    "before": "ISO timestamp — cursor for pagination",
                    "limit": "integer (default 50, max 100)",
                },
                "room_id_formats": [
                    "general",
                    "direct:{uid_a}:{uid_b}",
                    "ticket:{ticket_id}",
                ],
            }
        ],

        "tickets": [
            {
                "method": "GET",
                "path": "/api/v1/tickets",
                "auth": "Bearer",
                "description": "List tickets. Clients see only their own; agents see assigned; admins see all.",
                "query_params": {"status": "string", "priority": "string", "page": "int", "limit": "int"},
            },
            {
                "method": "POST",
                "path": "/api/v1/tickets",
                "auth": "Bearer",
                "body": {
                    "title": "string",
                    "description": "string",
                    "priority": "low | normal | high | urgent",
                },
            },
            {
                "method": "GET",
                "path": "/api/v1/tickets/{ticket_id}",
                "auth": "Bearer",
            },
            {
                "method": "PATCH",
                "path": "/api/v1/tickets/{ticket_id}",
                "auth": "Bearer (agent or admin)",
                "description": "Update status, priority, or assigned agent.",
                "status_machine": "open → in_progress → resolved → closed",
            },
        ],

        "orders": [
            {
                "method": "GET",
                "path": "/api/v1/orders",
                "auth": "Bearer",
                "description": "List orders. Clients see only their own; agents and admins see all.",
                "query_params": {"status": "string", "page": "int", "limit": "int"},
            },
            {
                "method": "POST",
                "path": "/api/v1/orders",
                "auth": "Bearer",
                "body": {
                    "type": "string (project-defined)",
                    "title": "string",
                    "details": "object (project-defined)",
                },
            },
            {
                "method": "PATCH",
                "path": "/api/v1/orders/{order_id}",
                "auth": "Bearer (agent or admin)",
                "status_machine": "pending → active → taken → completed | cancelled",
            },
        ],

        "users": [
            {
                "method": "GET",
                "path": "/api/v1/users",
                "auth": "Bearer (admin only)",
                "query_params": {"role": "string", "page": "int", "limit": "int"},
            },
            {
                "method": "POST",
                "path": "/api/v1/users",
                "auth": "Bearer (admin only)",
                "body": {
                    "email": "string",
                    "username": "string",
                    "password": "string",
                    "role": "client | agent | admin",
                },
            },
            {
                "method": "PATCH",
                "path": "/api/v1/users/{user_id}",
                "auth": "Bearer (admin only)",
                "body": {"username": "string (optional)", "role": "string (optional)", "active": "boolean (optional)"},
            },
            {
                "method": "DELETE",
                "path": "/api/v1/users/{user_id}",
                "auth": "Bearer (admin only)",
                "description": "Soft-delete (deactivates) the user.",
            },
        ],

        "upload": [
            {
                "method": "POST",
                "path": "/api/v1/upload/{room_id}",
                "auth": "Bearer",
                "content_type": "multipart/form-data",
                "field": "file",
                "allowed_types": ["image/jpeg", "image/png", "image/gif", "image/webp"],
                "max_size": "10 MB",
                "max_dimension": "1920px (proportionally scaled)",
                "output_format": "WebP (server re-encodes)",
                "response": {
                    "message_id": "string",
                    "attachment": {
                        "url": "string",
                        "width": "int",
                        "height": "int",
                        "size_bytes": "int",
                    },
                },
                "side_effects": ["Broadcasts message:new Socket.IO event to room participants"],
            }
        ],

        "projects": [
            {
                "method": "GET",
                "path": "/api/v1/projects/me",
                "auth": "Bearer (admin only)",
                "description": "Project metadata: name, slug, settings, plan, timestamps.",
            },
            {
                "method": "PATCH",
                "path": "/api/v1/projects/me",
                "auth": "Bearer (admin only)",
                "body": {"name": "string (optional)", "settings": "object (deep-merged)"},
            },
            {
                "method": "POST",
                "path": "/api/v1/projects/me/rotate-key",
                "auth": "Bearer (admin only)",
                "description": "Generate a new api_key. Existing widget instances disconnect on next reconnect.",
                "response": {"api_key": "string", "warning": "string"},
            },
            {
                "method": "POST",
                "path": "/api/v1/projects/me/logo",
                "auth": "Bearer (admin only)",
                "content_type": "multipart/form-data",
                "field": "file",
                "response": {"logo_url": "string"},
            },
            {
                "method": "DELETE",
                "path": "/api/v1/projects/me/logo",
                "auth": "Bearer (admin only)",
                "response_code": 204,
            },
        ],
    },

    "socketio": {
        "connection": {
            "url": "wss://chat.azanolabs.com/<api_key>",
            "auth": {"token": "<access_token>"},
            "transports": ["websocket"],
            "note": "Namespace is the api_key. Connection is rejected if token is missing or expired.",
        },
        "client_to_server": [
            {
                "event": "room:join",
                "payload": {"room_id": "string"},
                "description": "Join a chat room and receive its message history (message:history event).",
            },
            {
                "event": "room:leave",
                "payload": {"room_id": "string"},
            },
            {
                "event": "message:send",
                "payload": {
                    "room_id": "string",
                    "content": "string",
                    "content_type": "text | image | text+image",
                },
                "rate_limit": "30 messages per user per 60 seconds",
            },
            {
                "event": "typing:start",
                "payload": {"room_id": "string"},
            },
            {
                "event": "typing:stop",
                "payload": {"room_id": "string"},
            },
            {
                "event": "direct:open",
                "payload": {"target_user_id": "string"},
                "roles": ["agent", "admin"],
                "description": "Open a direct messaging channel with a specific user.",
            },
            {
                "event": "message:delete",
                "payload": {"message_id": "string", "room_id": "string"},
                "roles": ["admin"],
            },
        ],
        "server_to_client": [
            {
                "event": "message:history",
                "payload": {"room_id": "string", "messages": "Message[]"},
                "trigger": "After room:join — last 50 messages",
            },
            {
                "event": "message:new",
                "payload": {
                    "id": "string",
                    "room_id": "string",
                    "user_id": "string",
                    "username": "string",
                    "role": "string",
                    "content": "string",
                    "content_type": "string",
                    "created_at": "ISO timestamp",
                },
            },
            {
                "event": "message:deleted",
                "payload": {"message_id": "string", "room_id": "string"},
            },
            {
                "event": "typing",
                "payload": {"room_id": "string", "username": "string", "active": "boolean"},
            },
            {
                "event": "room:opened",
                "payload": {"room_id": "string", "participants": "User[]"},
                "trigger": "When an agent opens a direct room",
            },
            {
                "event": "error",
                "payload": {"code": "string"},
                "description": "See error_codes section",
            },
        ],
    },

    "error_codes": {
        "VALIDATION_ERROR":          {"http": 400, "trigger": "Malformed or missing request fields"},
        "AUTH_MISSING_TOKEN":         {"http": 401, "trigger": "Authorization header absent"},
        "AUTH_TOKEN_INVALID":         {"http": 401, "trigger": "JWT signature invalid or malformed"},
        "AUTH_TOKEN_EXPIRED":         {"http": 401, "trigger": "Access token past expiry"},
        "AUTH_REFRESH_EXPIRED":       {"http": 401, "trigger": "Refresh cookie absent or expired"},
        "AUTH_INVALID_CREDENTIALS":   {"http": 401, "trigger": "Wrong email, password, or api_key"},
        "FORBIDDEN":                  {"http": 403, "trigger": "User lacks required role"},
        "FORBIDDEN_ROOM":             {"http": 403, "trigger": "User not allowed in that room"},
        "NOT_FOUND":                  {"http": 404, "trigger": "Resource not found"},
        "PROJECT_NOT_FOUND":          {"http": 404, "trigger": "Unknown api_key or inactive project"},
        "USER_NOT_FOUND":             {"http": 404, "trigger": "User ID not found in this project"},
        "ROOM_NOT_FOUND":             {"http": 404, "trigger": "Room ID not found in this project"},
        "USERNAME_TAKEN":             {"http": 409, "trigger": "Username already registered in this project"},
        "EMAIL_TAKEN":                {"http": 409, "trigger": "Email already registered in this project"},
        "SLUG_TAKEN":                 {"http": 409, "trigger": "Project slug already in use"},
        "UPLOAD_TOO_LARGE":           {"http": 413, "trigger": "File exceeds size limit"},
        "UPLOAD_TYPE_NOT_SUPPORTED":  {"http": 415, "trigger": "File type not allowed"},
        "UPLOAD_CORRUPT":             {"http": 422, "trigger": "Magic bytes mismatch declared MIME type"},
        "INVALID_TRANSITION":         {"http": 422, "trigger": "State machine transition not allowed"},
        "MESSAGE_TOO_LONG":           {"http": 422, "trigger": "Message exceeds 4000 characters"},
        "INVALID_ROOM_ID":            {"http": 422, "trigger": "Room ID format invalid"},
        "RATE_LIMITED":               {"http": 429, "trigger": "Too many requests"},
        "INTERNAL_ERROR":             {"http": 500, "trigger": "Unhandled server error"},
        "SERVICE_UNAVAILABLE":        {"http": 503, "trigger": "Database or storage temporarily unreachable"},
    },
}


def get_guide_ai() -> JSONResponse:
    return JSONResponse(content=_GUIDE_AI)
