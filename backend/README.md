# Suportum Backend

**English** | [Español](#español)

---

## English

### Overview

REST API and WebSocket server for Suportum. Built with FastAPI, python-socketio, and aiosqlite (SQLite WAL mode). Designed to run as a single-process, multi-tenant service.

### Requirements

- Python 3.9+ (production VPS runs Python 3.9)
- All dependencies installed inside `.venv`, never globally

### Setup (Windows PowerShell)

```powershell
# Create virtual environment. NEVER install packages globally
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies (no version pins, always latest)
pip install fastapi[standard] python-socketio aiosqlite python-jose passlib gunicorn uvicorn pillow pydantic-settings email-validator

# Copy environment file and fill in values
Copy-Item .env.example .env
# Edit .env: set SECRET_KEY at minimum

# Start development server
uvicorn app.main:socket_app --reload --port 8001
```

### Development Server: Process Management

The dev server runs as a **blocking process** in the terminal. To stop it: `Ctrl+C`.

To check if port 8001 is already in use before starting:

```powershell
# Check if something is already listening on port 8001
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue

# If the port is busy, find and kill the process:
$pid = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid) { Stop-Process -Id $pid -Force; Write-Host "Process $pid stopped" }
```

> One instance only: the in-memory rate limiter and Socket.IO sessions break if two processes share port 8001.

### Data Directories

The backend stores data outside the project directory. The code directory contains only source code.

**Development (Windows):** data goes to `%TEMP%\suportum\` automatically. No configuration needed.

**Development (Linux/macOS):** data goes to `/tmp/suportum/` automatically. No configuration needed.

**Production (VPS):** `/tmp` is cleared on reboot. Set persistent paths in `.env`:

```bash
# Recommended paths for Oracle Cloud VPS (outside the project folder)
DATABASE_URL=/home/opc/suportum-data/db/suportum.db
UPLOAD_DIR=/home/opc/suportum-data/uploads
```

Create the directories on first deploy:
```bash
mkdir -p /home/opc/suportum-data/db /home/opc/suportum-data/uploads
```

> Do not create `data/` or `uploads/` inside the project folder. Those belong in the OS temp dir (dev) or a persistent external path (production).

### Environment Variables

| Variable | Description |
|---|---|
| `PROJECT_NAME` | Display name for this instance |
| `SECRET_KEY` | Secret for JWT signing (min 64 hex chars) |
| `DATABASE_URL` | SQLite file path. Leave blank for OS temp default |
| `UPLOAD_DIR` | Directory for uploaded images. Leave blank for OS temp default |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes (default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime in days (default: 7) |

### Production Deployment

```bash
# VPS: set DATABASE_URL and UPLOAD_DIR in .env first
gunicorn app.main:socket_app \
  -k uvicorn.workers.UvicornWorker \
  --workers 1 \
  --timeout 0 \
  --bind 127.0.0.1:8001
```

> `--workers 1` is required: in-memory rate limiting and Socket.IO sessions are not shared across processes.
> `--timeout 0` is required: WebSocket connections are long-lived.

---

## Error Code Reference

All error responses use the following shape:

```json
{ "error": { "code": "ERROR_CODE" } }
```

Socket.IO error callbacks use:

```json
{ "code": "ERROR_CODE" }
```

No `message` field is ever included. The frontend resolves the code to a localized string via its i18n system.

### Authentication Errors

| Code | HTTP | Trigger |
|---|---|---|
| `AUTH_MISSING_TOKEN` | 401 | Authorization header absent or malformed |
| `AUTH_TOKEN_INVALID` | 401 | JWT signature invalid or payload malformed |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token past its expiry timestamp |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh token cookie absent or expired |

### Authorization Errors

| Code | HTTP | Trigger |
|---|---|---|
| `FORBIDDEN` | 403 | Authenticated user lacks the required role |
| `FORBIDDEN_ROOM` | 403 | User tries to join a room in another project |

### Resource Errors

| Code | HTTP | Trigger |
|---|---|---|
| `NOT_FOUND` | 404 | Generic resource not found |
| `USER_NOT_FOUND` | 404 | User ID does not exist in this project |
| `ROOM_NOT_FOUND` | 404 | Room ID does not exist in this project |
| `PROJECT_NOT_FOUND` | 404 | API key unknown or project is inactive |

### Conflict Errors

| Code | HTTP | Trigger |
|---|---|---|
| `USERNAME_TAKEN` | 409 | Username already registered in this project |
| `EMAIL_TAKEN` | 409 | Email address already registered in this project |
| `SLUG_TAKEN` | 409 | Project slug already in use |

### Upload Errors

| Code | HTTP | Trigger |
|---|---|---|
| `UPLOAD_TOO_LARGE` | 413 | File exceeds the configured size limit |
| `UPLOAD_TYPE_NOT_SUPPORTED` | 415 | File is not JPEG, PNG, GIF, or WebP |
| `UPLOAD_CORRUPT` | 422 | Magic bytes do not match declared MIME type |

### Rate Limiting

| Code | HTTP | Trigger |
|---|---|---|
| `RATE_LIMITED` | 429 | Client exceeded the per-IP request threshold |

### Business Logic Errors

| Code | HTTP | Trigger |
|---|---|---|
| `INVALID_TRANSITION` | 422 | State machine transition not allowed (e.g. closed ticket cannot be reopened) |
| `MESSAGE_TOO_LONG` | 422 | Message body exceeds 4000 characters |
| `INVALID_ROOM_ID` | 422 | Room ID format validation failed |

### Validation and Server Errors

| Code | HTTP | Trigger |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Pydantic request body validation failed |
| `INTERNAL_ERROR` | 500 | Unhandled server exception |
| `SERVICE_UNAVAILABLE` | 503 | Dependency (DB, storage) temporarily unreachable |

---

## Español

### Descripción general

Servidor REST y WebSocket para Suportum. Construido con FastAPI, python-socketio y aiosqlite (modo WAL de SQLite). Diseñado para correr como un proceso único y multi-tenant.

### Requisitos

- Python 3.9+ (el VPS de producción corre Python 3.9)
- Todo instalado dentro de `.venv`, nunca globalmente

### Configuración (Windows PowerShell)

```powershell
# Crear entorno virtual. JAMAS instalar paquetes globalmente
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Instalar dependencias (sin fijar versiones, siempre la ultima)
pip install fastapi[standard] python-socketio aiosqlite python-jose passlib gunicorn uvicorn pillow pydantic-settings email-validator

# Copiar archivo de entorno y completar valores
Copy-Item .env.example .env
# Editar .env: configurar SECRET_KEY como minimo

# Iniciar servidor de desarrollo
uvicorn app.main:socket_app --reload --port 8001
```

### Servidor de Desarrollo: Gestion de Procesos

El servidor corre como un **proceso bloqueante** en la terminal. Para detenerlo: `Ctrl+C`.

Verificar si el puerto 8001 ya esta en uso antes de arrancar:

```powershell
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue

# Si el puerto esta ocupado, matar el proceso:
$pid = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid) { Stop-Process -Id $pid -Force; Write-Host "Proceso $pid detenido" }
```

> Solo una instancia a la vez: el rate limiter en memoria y las sesiones de Socket.IO no funcionan con dos procesos en el mismo puerto.

### Directorios de Datos

El backend guarda datos fuera del directorio del proyecto. La carpeta del proyecto contiene solo codigo.

**Desarrollo (Windows):** los datos van a `%TEMP%\suportum\` automaticamente. Sin configuracion.

**Desarrollo (Linux/macOS):** los datos van a `/tmp/suportum/` automaticamente. Sin configuracion.

**Produccion (VPS):** `/tmp` se borra al reiniciar. Definir rutas persistentes en `.env`:

```bash
DATABASE_URL=/home/opc/suportum-data/db/suportum.db
UPLOAD_DIR=/home/opc/suportum-data/uploads
```

Crear los directorios en el primer deploy:
```bash
mkdir -p /home/opc/suportum-data/db /home/opc/suportum-data/uploads
```

> No crear `data/` ni `uploads/` dentro del proyecto. Esas carpetas pertenecen al temp del OS (dev) o a una ruta persistente externa (produccion).

### Variables de Entorno

| Variable | Descripción |
|---|---|
| `PROJECT_NAME` | Nombre de esta instancia |
| `SECRET_KEY` | Secreto para firma JWT (minimo 64 caracteres hex) |
| `DATABASE_URL` | Ruta del archivo SQLite. Dejar vacio para default del OS |
| `UPLOAD_DIR` | Directorio de imagenes. Dejar vacio para default del OS |
| `CORS_ORIGINS` | Origenes CORS permitidos, separados por comas |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duracion del access token en minutos (default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Duracion del refresh token en dias (default: 7) |

### Despliegue en Producción

```bash
# VPS: configurar DATABASE_URL y UPLOAD_DIR en .env primero
gunicorn app.main:socket_app \
  -k uvicorn.workers.UvicornWorker \
  --workers 1 \
  --timeout 0 \
  --bind 127.0.0.1:8001
```

> `--workers 1` es obligatorio: el rate limiting en memoria y las sesiones de Socket.IO no se comparten entre procesos.
> `--timeout 0` es obligatorio: las conexiones WebSocket son de larga duracion.

---

## Referencia de Códigos de Error

Todas las respuestas de error usan el siguiente formato:

```json
{ "error": { "code": "CODIGO_DE_ERROR" } }
```

Los callbacks de error de Socket.IO usan:

```json
{ "code": "CODIGO_DE_ERROR" }
```

Nunca se incluye campo `message`. El frontend resuelve el código a un texto localizado via su sistema i18n.

### Errores de Autenticación

| Código | HTTP | Causa |
|---|---|---|
| `AUTH_MISSING_TOKEN` | 401 | Header Authorization ausente o malformado |
| `AUTH_TOKEN_INVALID` | 401 | Firma JWT inválida o payload malformado |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token vencido |
| `AUTH_REFRESH_EXPIRED` | 401 | Cookie de refresh token ausente o vencida |

### Errores de Autorización

| Código | HTTP | Causa |
|---|---|---|
| `FORBIDDEN` | 403 | El usuario autenticado no tiene el rol requerido |
| `FORBIDDEN_ROOM` | 403 | El usuario intenta unirse a una sala de otro proyecto |

### Errores de Recurso

| Código | HTTP | Causa |
|---|---|---|
| `NOT_FOUND` | 404 | Recurso no encontrado (genérico) |
| `USER_NOT_FOUND` | 404 | ID de usuario no existe en este proyecto |
| `ROOM_NOT_FOUND` | 404 | ID de sala no existe en este proyecto |
| `PROJECT_NOT_FOUND` | 404 | Clave de API desconocida o proyecto inactivo |

### Errores de Conflicto

| Código | HTTP | Causa |
|---|---|---|
| `USERNAME_TAKEN` | 409 | Nombre de usuario ya registrado en este proyecto |
| `EMAIL_TAKEN` | 409 | Correo ya registrado en este proyecto |
| `SLUG_TAKEN` | 409 | Slug de proyecto ya en uso |

### Errores de Subida de Archivos

| Código | HTTP | Causa |
|---|---|---|
| `UPLOAD_TOO_LARGE` | 413 | Archivo supera el límite de tamaño configurado |
| `UPLOAD_TYPE_NOT_SUPPORTED` | 415 | El archivo no es JPEG, PNG, GIF ni WebP |
| `UPLOAD_CORRUPT` | 422 | Los magic bytes no coinciden con el MIME declarado |

### Limite de Solicitudes

| Código | HTTP | Causa |
|---|---|---|
| `RATE_LIMITED` | 429 | Cliente superó el umbral de solicitudes por IP |

### Errores de Lógica de Negocio

| Código | HTTP | Causa |
|---|---|---|
| `INVALID_TRANSITION` | 422 | Transición de estado no permitida (ej. ticket cerrado no puede reabrirse) |
| `MESSAGE_TOO_LONG` | 422 | El cuerpo del mensaje supera 4000 caracteres |
| `INVALID_ROOM_ID` | 422 | Formato de ID de sala inválido |

### Errores de Validación y Servidor

| Código | HTTP | Causa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Validación Pydantic del cuerpo de la solicitud falló |
| `INTERNAL_ERROR` | 500 | Excepción de servidor no controlada |
| `SERVICE_UNAVAILABLE` | 503 | Dependencia (DB, storage) temporalmente no disponible |
