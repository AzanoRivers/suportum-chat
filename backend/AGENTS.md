# Suportum Backend — Contexto de Agentes

## Stack
- FastAPI + python-socketio (async_mode=asgi)
- aiosqlite (SQLite WAL mode)
- python-jose + passlib (JWT + bcrypt)
- Gunicorn 1w + UvicornWorker (--timeout 0)
- Puerto: 8001

## Arquitectura
Multi-tenant: un solo proceso, una sola BD SQLite, `project_id` en todas las tablas.
Cada proyecto usa su propio namespace de Socket.IO (`/{api_key}`).

## Estructura del proyecto
```
backend/
├── app/
│   ├── main.py              # FastAPI app + Socket.IO mount + lifespan
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # aiosqlite pool + run_migrations()
│   ├── api/v1/
│   │   ├── router.py        # incluye todos los sub-routers
│   │   ├── setup.py         # POST /setup/create (público)
│   │   ├── auth.py          # login, register, refresh, logout
│   │   ├── projects.py      # rotate-key, settings del proyecto
│   │   ├── users.py         # CRUD usuarios (admin/agent)
│   │   ├── tickets.py       # tickets CRUD
│   │   ├── orders.py        # orders CRUD + state machine
│   │   └── upload.py        # imagen upload → WebP
│   ├── sockets/
│   │   ├── server.py        # AsyncServer con namespaces="*"
│   │   ├── events.py        # connect/disconnect/message/typing
│   │   └── rooms.py         # room management por namespace
│   ├── core/
│   │   ├── auth.py          # JWT encode/decode
│   │   ├── guards.py        # get_scoped_project(), require_role()
│   │   ├── project.py       # get_project_by_api_key()
│   │   ├── rate_limit.py    # throttle en memoria (sin Redis)
│   │   ├── errors.py        # handlers globales de error
│   │   ├── security_headers.py
│   │   ├── cors.py          # DynamicCORSMiddleware
│   │   └── startup.py       # on_startup: dirs + migrations
│   └── models/
│       ├── project.py
│       ├── user.py
│       ├── message.py
│       ├── ticket.py
│       └── order.py
├── migrations/
│   └── 001_initial.sql
├── features/                # specs de cada feature a implementar
├── .env.example
├── .gitignore
└── suportum.service
```

## Regla de instalacion en Windows: SOLO dentro de .venv

En Windows, JAMAS instalar paquetes Python de manera global. Todo debe vivir dentro del `.venv` del proyecto. Esto previene conflictos entre proyectos y evitar corromper el entorno del sistema operativo.

Flujo obligatorio en Windows:
```powershell
# 1. Activar el venv PRIMERO (siempre)
.\.venv\Scripts\Activate.ps1

# 2. Instalar dentro del venv activo
pip install <paquete>

# 3. Verificar que el paquete quedo en el venv, no en el sistema
pip show <paquete>   # debe mostrar ruta dentro de .venv\
```

Si el venv no existe aun:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Nunca correr `pip install` sin haber activado el venv primero en Windows.

## Gestion del servidor de desarrollo en Windows

El servidor uvicorn es un proceso bloqueante en la terminal. Para detenerlo: Ctrl+C.

Para verificar si ya hay una instancia corriendo antes de arrancar:
```powershell
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
```

Si el puerto esta ocupado, matar el proceso:
```powershell
$pid = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid) { Stop-Process -Id $pid -Force }
```

Una sola instancia a la vez. El rate limiter en memoria y las sesiones de Socket.IO no se comparten entre procesos.

## Directorios de datos

El codigo del proyecto NUNCA contiene datos. No crear `data/` ni `uploads/` dentro de la carpeta del backend.

- **Dev Windows:** `%TEMP%\suportum\` (automatico, sin configuracion)
- **Dev Linux:** `/tmp/suportum/` (automatico, sin configuracion)
- **Produccion VPS:** `/home/opc/suportum-data/` (configurar en `.env` con rutas absolutas)

```bash
# En el VPS, crear los directorios una vez:
mkdir -p /home/opc/suportum-data/db /home/opc/suportum-data/uploads
```

Y en `.env` del VPS:
```
DATABASE_URL=/home/opc/suportum-data/db/suportum.db
UPLOAD_DIR=/home/opc/suportum-data/uploads
```

## Version de Python

**El VPS corre Python 3.9.** Todo el codigo debe ser compatible con Python 3.9.

Sintaxis prohibida (Python 3.10+):
- `X | Y` en type hints → usar `Optional[X]` o `Union[X, Y]` de `typing`
- `match` statements → usar `if/elif`
- `dict | None` → usar `Optional[dict]`
- `str | int` → usar `Union[str, int]`

Siempre importar desde `typing`: `from typing import Optional, Union, List, Dict, Tuple`

## REGLAS ABSOLUTAS — NUNCA VIOLAR

### Guion medio largo prohibido
JAMAS usar el guion medio largo (—, em dash, U+2014) en ningún texto de la aplicación,
comentarios de código, docstrings, archivos `.md`, logs, o mensajes de error.
No existe en español ni en inglés como puntuación correcta. Usar `:`, `,` o `.`.

### Backend: solo códigos de error, sin mensajes
El backend NUNCA envía campo `message` al cliente en respuestas de error.
Formato HTTP: `{ "error": { "code": "SCREAMING_SNAKE_CASE" } }`.
Formato Socket.IO: `{ "code": "SCREAMING_SNAKE_CASE" }`.
El frontend resuelve el código a texto localizado via su sistema i18n.
Todos los códigos están documentados en `backend/README.md`.

---

## Reglas críticas para agentes implementadores

1. **Toda query incluye `WHERE project_id = ?`** — sin excepción.
2. **IDOR**: siempre `WHERE id = ? AND project_id = ?` al buscar por UUID.
3. **Nunca f-strings en SQL** — solo parámetros posicionales `?`.
4. **Nunca exponer detalles internos al cliente** — usar códigos `SCREAMING_SNAKE_CASE`.
5. **Nunca hardcodear versiones de paquetes** — `pip install <pkg>` sin versión.
6. **El JWT lleva `project_id`** — siempre validar con `get_scoped_project()`.
7. **`--timeout 0` en Gunicorn** — WebSocket es long-lived.
8. **ARM64**: verificar wheel disponible en PyPI antes de añadir dependencia nueva.

## Flujo de errores
HTTP: `{ "error": { "code": "SCREAMING_SNAKE_CASE" } }` — sin campo `message`.
Socket.IO: `{ "code": "SCREAMING_SNAKE_CASE" }`.
Catálogo completo de códigos en `backend/README.md`.

## Variables de entorno
Solo `.env` (gitignored) y `.env.example` (en repo). Nunca otros archivos `.env.*`.

## Deploy
```bash
cd /home/opc/projects/suportum && git pull
sudo systemctl restart suportum
journalctl -u suportum -n 50 --no-pager
```
