# 00 — Foundation Backend

## 1. Objetivo
Levantar el backend completo en local y VPS: FastAPI + Socket.IO + SQLite WAL, multi-tenant,
JWT auth, sistema de errores, CORS dinámico, health check, y setup wizard para crear proyectos.

## 1.1 Restricciones de Entorno

### Python 3.9 (VPS)
El VPS corre Python 3.9. Todo el codigo debe ser compatible:
- `X | Y` union types **prohibido** → usar `Optional[X]` / `Union[X, Y]` de `typing`
- `match` statements prohibidos → usar `if/elif`
- Genericos built-in como `list[str]` y `dict[str, str]` son validos desde 3.9

### Directorios de datos — temporal por plataforma
Los datos no van en el directorio del proyecto sino en el temp del sistema:
- **Windows dev:** `%TEMP%\suportum\data\suportum.db` y `%TEMP%\suportum\uploads\`
- **Linux VPS:** `/tmp/suportum/data/suportum.db` y `/tmp/suportum/uploads/`

`config.py` calcula el default con `os.path.join(tempfile.gettempdir(), "suportum")`.
El `.env` puede sobreescribir `DATABASE_URL` y `UPLOAD_DIR` para rutas absolutas en produccion.

## 2. Módulos a implementar

### 2.1 `app/config.py`
- `Settings` con pydantic-settings leyendo `.env`
- Campos: `SECRET_KEY`, `DATABASE_URL`, `UPLOAD_DIR`, `CORS_ORIGINS`, `ENVIRONMENT`, `PORT`

### 2.2 `app/database.py`
- `get_db()` — conexión aiosqlite singleton con WAL + foreign keys
- `run_migrations()` — ejecuta `migrations/001_initial.sql` (idempotente con `IF NOT EXISTS`)

### 2.3 `app/core/startup.py`
- `on_startup()`: crea dirs `data/` y `uploads/`, corre `run_migrations()`
- `lifespan()`: asynccontextmanager que llama `on_startup` y monta `StaticFiles("/uploads")`

### 2.4 `app/sockets/server.py`
- `AsyncServer(async_mode="asgi", namespaces="*")`

### 2.5 `app/core/auth.py`
- `create_access_token(payload, expire_minutes)` → JWT firmado HS256
- `create_refresh_token(payload)` → JWT con expiración larga
- `decode_token(token)` → payload dict; lanza `AUTH_TOKEN_EXPIRED` o `AUTH_TOKEN_INVALID`
- `hash_password(plain)` → bcrypt
- `verify_password(plain, hashed)` → bool

### 2.6 `app/core/guards.py`
- `get_current_token(credentials)` → payload dict
- `get_scoped_project(token)` → `{ project, user_id, role }`
- `require_role(*roles)` → factory de guard
- Atajos: `require_any`, `require_agent_or_admin`, `require_admin`

### 2.7 `app/core/project.py`
- `get_project_by_api_key(api_key)` → dict | None
- `get_project_by_id(project_id)` → dict | None

### 2.8 `app/api/v1/setup.py`
- `POST /setup/create` → crea project + admin user; rate limit 3/IP/24h
- `GET /setup/check-slug/{slug}` → `{ available: bool }`
- `GET /setup/health` → `{ status: "ok", version: str }`

### 2.9 `app/api/v1/auth.py`
- `POST /auth/register` → crear user dentro del proyecto (scoped por api_key en header o body)
- `POST /auth/login` → retorna access_token + cookie refresh_token
- `POST /auth/refresh` → lee cookie, retorna nuevo access_token
- `POST /auth/logout` → borra cookie
- `GET /auth/me` → retorna `{ user_id, role, project_id }` (requiere token válido)

### 2.10 `app/main.py`
- FastAPI + lifespan + middlewares + exception handlers + routers + socket_app

## 3. Schema de Base de Datos
Ver `migrations/001_initial.sql` (ya creado).
Tablas: `projects`, `users`, `messages`, `attachments`, `tickets`, `orders`.

## 4. Seguridad

### 4.1 JWT payload
```json
{ "sub": "user_uuid", "project_id": "proj_uuid", "role": "client|agent|admin", "exp": 0 }
```

### 4.2 Refresh token cookie
```python
response.set_cookie(
    key="refresh_token", value=token,
    httponly=True, secure=True, samesite="none",
    max_age=7*24*3600, path="/api/v1/auth/refresh"
)
```

### 4.3 Rate limit setup
`check_rate_limit(f"setup:{ip}", max_requests=3, window_seconds=86400)`

## 5. Desarrollo — Pasos

1. Instalar deps: `pip install fastapi[standard] python-socketio aiosqlite python-jose passlib gunicorn uvicorn`
2. Copiar `.env.example` → `.env`, completar `SECRET_KEY` con 64 bytes hex
3. Implementar en orden: `config.py` → `database.py` → `core/auth.py` → `core/project.py` → `core/guards.py`
4. Implementar `startup.py` y verificar que crear dirs es idempotente
5. Implementar `setup.py` (endpoints públicos — probar con curl/httpie)
6. Implementar `auth.py` (login, refresh, me)
7. Montar todo en `main.py`
8. Verificar: `python -c "from app.main import socket_app; print('OK')"`
9. Levantar: `uvicorn app.main:socket_app --reload --port 8001`
10. Probar `/docs`, `/setup/health`, `/setup/create`, `/auth/login`

## 6. Auditoría y Revisión de Errores

### 6.1 Checklist de Seguridad
- [ ] Ningún endpoint devuelve stack traces al cliente
- [ ] Todos los errores siguen el shape `{ error: { code, message } }`
- [ ] `get_scoped_project()` en TODO endpoint que toque datos de proyecto
- [ ] Doble filtro `id + project_id` en todas las queries por UUID
- [ ] No hay f-strings en queries SQL
- [ ] `SECRET_KEY` no tiene valor por defecto sin `.env`
- [ ] Cookie refresh es `HttpOnly; Secure; SameSite=none`
- [ ] Rate limit activo en `POST /setup/create`

### 6.2 Checklist de Funcionalidad
- [ ] `GET /setup/health` responde `200 { status: "ok" }`
- [ ] `POST /setup/create` crea project + admin + dirs en disco
- [ ] `POST /auth/login` retorna access_token en body y cookie en headers
- [ ] `POST /auth/refresh` con cookie válida retorna nuevo access_token
- [ ] `GET /auth/me` con token válido retorna user_id, role, project_id
- [ ] `GET /auth/me` con token inválido retorna `401 AUTH_TOKEN_INVALID`
- [ ] SQLite WAL activo: `PRAGMA journal_mode` retorna `wal`
- [ ] Migrations son idempotentes: segunda ejecución no rompe nada
- [ ] Dirs `data/` y `uploads/` se crean solos al arrancar

### 6.3 Errores Comunes a Verificar
- `ImportError` en `app.main` → revisar circular imports
- Cookie no llega al browser → verificar `SameSite=none; Secure` (requiere HTTPS o localhost)
- `aiosqlite.OperationalError: database is locked` → verificar WAL mode activo
- JWT decode falla → verificar `SECRET_KEY` igual en encode y decode
- `422 Unprocessable Entity` → el handler de `RequestValidationError` debe retornar `400`

## 7. Criterios de Aprobación (Done)
- [ ] `uvicorn app.main:socket_app --reload --port 8001` arranca sin errores
- [ ] `/setup/health` → `{ status: "ok" }`
- [ ] `/setup/create` crea proyecto, retorna `api_key` y `admin_token`
- [ ] `/auth/login` con credenciales válidas → access_token + cookie
- [ ] `/auth/me` → user correcto con role y project_id
- [ ] Segundo arranque: migrations no fallan (idempotentes)
- [ ] Reviewer confirma APPROVED
