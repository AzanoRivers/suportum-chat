# Suportum — Foundation Plan

> **Archivo madre de contexto global.** Este documento es la fuente de verdad arquitectónica para el proyecto Suportum.
> Se divide en sub-planes a medida que cada área entra en desarrollo activo.
>
> Idioma del código y configuraciones: inglés. Idioma de esta documentación: español.

---

> ## ⚠️ ADVERTENCIA CRÍTICA PARA AGENTES DE IA — LEER ANTES DE INSTALAR CUALQUIER PAQUETE
>
> ### JAMÁS se deben escribir versiones de paquetes manualmente en ningún archivo
>
> **PROHIBIDO** crear o editar archivos de dependencias con versiones hardcodeadas:
> ```
> # ❌ NUNCA hacer esto — versiones manuales en requirements.txt
> fastapi==0.115.0
> next: "^15.0.0"
> tailwindcss: "^4.0.0"
> ```
>
> **OBLIGATORIO** instalar siempre con el comando que resuelve la última versión disponible:
>
> | Ecosistema | Comando correcto |
> |---|---|
> | Python (pip) | `pip install fastapi[standard] python-socketio aiosqlite` (sin versión = última) |
> | Python (uv) | `uv add fastapi python-socketio aiosqlite` |
> | Node.js (pnpm) | `pnpm add next@latest react@latest react-dom@latest` |
> | Node.js (npm) | `npm install next@latest react@latest react-dom@latest` |
>
> El archivo `requirements.txt` o `package.json` se genera automáticamente con las versiones reales **después** de instalar. Nunca se escribe a mano.
>
> ### JAMÁS crear archivos de requirements/package.json con versiones escritas a mano
>
> - `requirements.txt` → se genera con `pip freeze > requirements.txt` o `uv export`
> - `package.json` → se actualiza automáticamente por pnpm/npm al instalar con `@latest`
>
> ### Siempre usar las últimas versiones de todo
>
> Antes de instalar cualquier paquete, si tienes dudas de cuál es la última versión estable, consulta con:
> - Python: `pip index versions <paquete>` o `uv add <paquete>` (resuelve solo)
> - Node.js: `pnpm info <paquete> version` o usa `@latest`

---

## 1. Visión del Producto

**Suportum** es una plataforma de soporte y gestión de órdenes en tiempo real, de propósito general.

No está atada a un tipo de negocio específico. Puede servir como:

- Chat de soporte técnico para SaaS
- Gestión de órdenes de boosting (WoW, LoL, etc.)
- Atención médica o servicios de salud
- Atención al ciudadano / gobierno
- Cualquier flujo de soporte + órdenes que tenga agentes (support) y clientes

### Actores del sistema

| Actor | Descripción |
|---|---|
| `client` | Usuario que solicita soporte o crea órdenes |
| `agent` | Usuario de soporte que atiende chats y gestiona órdenes |
| `admin` | Gestión completa: usuarios, configuración, temas, métricas |

### Módulos funcionales

1. **Auth & Accounts** — Registro, login, sesiones JWT, recuperación de contraseña, roles
2. **Chat general** — Canal público/sala compartida por tenant
3. **Chat directo** — `agent → client` iniciado por agente; `client` solicita apertura al agente
4. **Tickets** — Creación, asignación, estados, prioridad, historial
5. **Órdenes** — Creación, estados (pending / active / taken / completed / cancelled), dashboard expandible
6. **Gestión de usuarios** — CRUD completo para clients y agents, asignación de roles
7. **Temas & UI** — Paleta de colores configurable desde la interfaz, múltiples temas guardados por tenant

---

## 2. Infraestructura Existente en el VPS

### Hardware (Oracle Cloud Always Free — Ampere A1)

```
CPU:     1 OCPU (ARM Ampere)
RAM:     6 GB
Storage: ~46 GB
OS:      Oracle Linux (dnf)
```

### Proyectos activos coexistentes

| Proyecto | Puerto | Proceso | Dominio |
|---|---|---|---|
| `vps_optimus_api` | 8000 | Gunicorn 1w UvicornWorker | optimus.azanolabs.com |
| `vps-dealer-scrapping` | 8002 | Gunicorn 1w UvicornWorker | scraper.azanolabs.com |
| **suportum (nuevo)** | **8001** | Gunicorn 1w UvicornWorker | chat.azanolabs.com |

### Stack de infraestructura consolidado

```
Internet
    │
Cloudflare (proxy + Bot Fight Mode)
    │ Solo IPs de Cloudflare permitidas (NSG)
    │
Nginx (reverse proxy + SSL origin cert + rate limiting)
    │
Gunicorn (1 worker, UvicornWorker) → FastAPI app
    │
SQLite (WAL mode) — en disco local del VPS
```

### Premisa de recursos para el nuevo backend

- El VPS corre 3 procesos Python simultáneos. Cada uno con **1 worker Gunicorn**.
- Los otros 2 proyectos son de baja concurrencia (scraping / media compression).
- El backend de Suportum puede ser el más activo de los 3 (conexiones WebSocket persistentes).
- **Restricción crítica**: sin Docker, sin Redis, sin servicios adicionales de memoria.
- El estado en memoria (rooms, conexiones activas) vive en el proceso único. Es correcto porque hay 1 solo worker.

---

## 3. Propuesta Backend

### Decisión de stack

> **FastAPI + python-socketio (asyncio) + aiosqlite (SQLite WAL)**

**¿Por qué no ir directo a C++ o Go?**

| Criterio | Python/FastAPI | Go (Fiber+ws) | C++ |
|---|---|---|---|
| DX / velocidad de desarrollo | ✅ Excelente | ⚠️ Medio | ❌ Lento |
| Consistencia con VPS existente | ✅ Exacto mismo patrón | ❌ Stack nuevo | ❌ Stack nuevo |
| Rendimiento bajo carga baja-media | ✅ Suficiente | ✅ Mejor | ✅ Máximo |
| Consumo idle RAM | ~50-80 MB | ~15-25 MB | ~5-10 MB |
| Ops / deploy / debug | ✅ Igual que proyectos existentes | ❌ Nuevo toolchain | ❌ Complejo |

Con 1 worker y conexiones WebSocket persistentes (asyncio), FastAPI maneja perfectamente la carga esperada de un chat de soporte. El event loop de Python/asyncio no bloquea con I/O, que es exactamente el perfil de trabajo de un chat.

**¿Por qué no Node.js (del tutorial de referencia)?**

- El VPS ya tiene el ecosistema Python configurado (pyenv, venvs, systemd services).
- Node.js añadiría un runtime adicional. FastAPI es más eficiente en memoria que Express+Node para este caso.

---

### 3.0 Arquitectura Multi-Tenant

> **Decisión crítica de diseño**: el backend de Suportum es un **servicio compartido**.
> El paquete `suportum-chat` puede instalarse en cualquier web/app y todos apuntan
> al mismo backend `https://chat.azanolabs.com`. Cada instalación es un **Project**
> independiente con sus propios usuarios, chats, tickets y órdenes.

#### ¿Cómo gestionar múltiples proyectos simultáneos en el VPS?

| Enfoque | Veredicto | Razón |
|---|---|---|
| 1 proceso por proyecto | ❌ Inviable | 20 proyectos = 20 Gunicorn workers = VPS saturado |
| Docker por proyecto | ❌ Descartado | Contra decisión de arquitectura del VPS |
| 1 proceso + multi-DB (un SQLite por proyecto) | ⚠️ Posible | Complejo, 20 conexiones abiertas |
| **1 proceso + 1 DB con `project_id`** | ✅ Elegido | Simple, eficiente, 1 sola conexión SQLite WAL |
| 1 proceso + Socket.IO namespace por proyecto | ✅ Elegido | Aislamiento lógico limpio, cero coste extra |

#### Análisis de capacidad del VPS

Con 1 worker asyncio (Python) gestionando 10–20 proyectos activos:

```
Conexiones WebSocket concurrentes estimadas:
  20 proyectos × 50 usuarios pico = 1.000 conexiones

Coste de una conexión WebSocket idle en asyncio:
  ~2–4 KB RAM, 0 CPU mientras no llega evento

Total memoria conexiones: 1.000 × 4 KB ≈ 4 MB  ← trivial

Escrituras SQLite concurrentes:
  WAL mode: N lectores simultáneos + 1 escritor a la vez
  Los mensajes de chat se escriben en serie (~1–5ms por escritura)
  Con 1.000 usuarios, mensajes se encolan en el event loop → sin bloqueo

Picos de CPU:
  Único pico real: compresión de imágenes (Pillow)
  Mitigado: asyncio.to_thread() → no bloquea el event loop
  Con 10 uploads simultáneos: 10 threads en el pool de Python

Conclusión: el VPS es capaz de gestionar 10–20 proyectos con hasta
50 usuarios concurrentes por proyecto sin saturarse, siempre que
los uploads de imágenes no sean masivos y simultáneos.
```

#### Modelo de aislamiento: `project_id` en todas las tablas

Todas las entidades (usuarios, mensajes, tickets, órdenes, attachments) llevan `project_id`.
Las queries siempre filtran por `project_id` — **nunca** hay datos cruzados entre proyectos.

```
projects table  ← una fila por instalación del widget
    ↓ project_id (FK)
users, messages, rooms, tickets, orders, attachments
```

#### Socket.IO: namespace dinámico por proyecto

En lugar de una sala prefijada, **cada proyecto se conecta a su propio namespace**:

```
wss://chat.azanolabs.com/{api_key}
```

- El `api_key` del proyecto es el namespace de Socket.IO
- El servidor valida el `api_key` al conectar → obtiene el `project_id`
- Las rooms dentro del namespace son locales al proyecto (no hay conflicto de nombres)
- 20 proyectos = 20 namespaces dinámicos en el mismo proceso asyncio
- Costo: prácticamente cero — son rutas de dispatch en memoria

```python
# python-socketio soporta namespace comodín para namespaces dinámicos
sio = socketio.AsyncServer(async_mode="asgi", namespaces="*")

@sio.on("connect", namespace="*")
async def on_connect(sid, environ, auth, namespace):
    api_key = namespace.lstrip("/")
    project = await get_project_by_api_key(api_key)
    if not project or not project.is_active:
        raise socketio.exceptions.ConnectionRefusedError({"code": "PROJECT_NOT_FOUND"})
    # Validar user token...
    await sio.save_session(sid, {
        "user_id": user.id,
        "project_id": project.id,
        "role": user.role,
        "namespace": namespace,
    }, namespace=namespace)
```

#### Ciclo de vida de un nuevo proyecto (onboarding)

```
1. Developer instala suportum-chat en su web
2. Widget detecta que api_key no está configurado → muestra Setup Wizard
3. Setup Wizard llama a POST /api/v1/setup (público, sin auth)
4. Backend crea:  Project → Admin user → "general" room
5. Backend devuelve: { api_key, admin_token }
6. Developer guarda api_key en su configuración
7. Widget usa api_key en cada request y en el Socket.IO namespace
8. Cualquier usuario de ese site se registra/loguea contra ese project_id
```

---

### 3.1 Arquitectura del Backend

```
suportum-api/
├── app/
│   ├── main.py                 # FastAPI app + Socket.IO mount + lifespan
│   ├── config.py               # Settings (pydantic-settings)
│   ├── database.py             # aiosqlite pool + migrations
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       ├── setup.py        # ← NUEVO: onboarding público (crear proyecto)
│   │       ├── auth.py         # login, register, refresh, logout (scoped a project)
│   │       ├── projects.py     # ← NUEVO: CRUD del proyecto (admin del proyecto)
│   │       ├── users.py        # CRUD users (admin/agent) — scoped a project
│   │       ├── tickets.py      # tickets CRUD — scoped a project
│   │       ├── orders.py       # orders CRUD + status machine — scoped a project
│   │       └── upload.py       # imagen upload — scoped a project
│   ├── sockets/
│   │   ├── server.py           # AsyncServer con namespaces="*"
│   │   ├── events.py           # connect / disconnect / message / typing — scoped
│   │   └── rooms.py            # room management por namespace/project
│   ├── core/
│   │   ├── auth.py             # JWT encode/decode + project_id en payload
│   │   ├── guards.py           # Depends() para roles + project membership
│   │   ├── project.py          # ← NUEVO: get_project_by_api_key, project context
│   │   └── rate_limit.py       # throttle por socket + por project
│   ├── core/errors.py          # handlers globales de errores
│   ├── core/startup.py         # on_startup (dirs, migrations)
│   └── models/
│       ├── project.py          # ← NUEVO
│       ├── user.py
│       ├── message.py
│       ├── ticket.py
│       └── order.py
├── migrations/
│   └── 001_initial.sql
├── suportum.service
├── suportum.conf
├── requirements.txt
└── .env.example
```

---

### 3.2 Dependencias — Instalación (NUNCA hardcodear versiones)

```bash
# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

# Instalar siempre sin versión — pip resuelve la última estable
pip install fastapi[standard] python-socketio aiosqlite \
            python-jose[cryptography] passlib[bcrypt] \
            python-multipart gunicorn uvicorn[standard]

# Generar requirements.txt DESPUÉS de instalar (nunca antes)
pip freeze > requirements.txt
```

---

### 3.3 Integración FastAPI + Socket.IO (Multi-Tenant)

`python-socketio` se monta como ASGI middleware sobre FastAPI. Comparten el mismo proceso y el mismo puerto.
Con `namespaces="*"`, el servidor acepta cualquier namespace — cada proyecto usa el suyo propio.

```python
# app/sockets/server.py
import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    namespaces="*",              # ← namespaces dinámicos: uno por proyecto
    cors_allowed_origins=[],     # CORS manejado por Nginx/Cloudflare
    logger=False,
    engineio_logger=False,
)
```

```python
# app/main.py
import socketio
from fastapi import FastAPI
from app.sockets.server import sio

app = FastAPI(...)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
# Gunicorn apunta a socket_app:
# gunicorn "app.main:socket_app" -w 1 -k uvicorn.workers.UvicornWorker
```

#### Conexión desde el frontend

```javascript
// El namespace ES el api_key del proyecto
const socket = io(`https://chat.azanolabs.com`, {
  path: "/socket.io",
  auth: { token: userJwt },
  transports: ["websocket"],
})
// O equivalente explícito:
const socket = io(`https://chat.azanolabs.com/${projectApiKey}`, { ... })
```

---

### 3.4 Base de Datos — SQLite Multi-Tenant con WAL

SQLite en modo WAL permite lecturas concurrentes sin bloquear escrituras.
Con multi-tenancy por `project_id`, todos los proyectos comparten una sola base de datos.
El aislamiento es 100% a nivel de query — nunca se cruzan datos entre proyectos.

```sql
-- migrations/001_initial.sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─────────────────────────────────────────────────────────────────
-- PROYECTOS — una fila por instalación del widget suportum-chat
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,           -- UUID v4
    name        TEXT NOT NULL,              -- nombre del proyecto/negocio
    api_key     TEXT NOT NULL UNIQUE,       -- clave pública del widget (UUID v4)
    slug        TEXT NOT NULL UNIQUE,       -- identificador URL-friendly
    settings    TEXT NOT NULL DEFAULT '{}', -- JSON: tema, idioma, config del widget
    plan        TEXT NOT NULL DEFAULT 'free',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────────────────────────────
-- USUARIOS — scoped a un proyecto
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    username    TEXT NOT NULL,
    password    TEXT NOT NULL,              -- bcrypt hash
    role        TEXT NOT NULL DEFAULT 'client', -- client | agent | admin
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(project_id, email),
    UNIQUE(project_id, username)
);

-- ─────────────────────────────────────────────────────────────────
-- MENSAJES — scoped a proyecto (room_id es local al proyecto)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    room_id      TEXT NOT NULL,             -- 'general' | 'direct:{uid_a}:{uid_b}' | 'ticket:{tid}'
    sender_id    TEXT NOT NULL REFERENCES users(id),
    content      TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'text+image'
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────────────────────────────
-- ADJUNTOS (imágenes) — scoped a proyecto
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    message_id    TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    room_id       TEXT NOT NULL,
    filename      TEXT NOT NULL,            -- <uuid>.webp en disco
    original_name TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    url           TEXT NOT NULL,            -- /uploads/{project_id}/chat/{room_id}/{year}/{month}/{uuid}.webp
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────────────────────────────
-- TICKETS — scoped a proyecto
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
    priority    TEXT NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
    client_id   TEXT NOT NULL REFERENCES users(id),
    agent_id    TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────────────────────────────
-- ÓRDENES — scoped a proyecto (tipo configurable por proyecto)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,              -- configurable por proyecto en settings
    title       TEXT NOT NULL,
    details     TEXT,                       -- JSON libre — schema propio del negocio
    status      TEXT NOT NULL DEFAULT 'pending', -- pending | active | taken | completed | cancelled
    client_id   TEXT NOT NULL REFERENCES users(id),
    agent_id    TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ─────────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_project        ON users(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_room ON messages(project_id, room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_project  ON attachments(project_id, message_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project      ON tickets(project_id, status, agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_project       ON orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_api_key     ON projects(api_key);  -- lookup crítico en cada request
```

> **Regla de oro**: toda query debe incluir `WHERE project_id = ?`.
> El guard `get_current_project()` inyecta el `project_id` en cada endpoint via `Depends()`.
> Un endpoint que olvide el filtro de `project_id` es un bug de seguridad crítico.


---

### 3.5 Autenticación JWT — Scoped a Proyecto

- **Access token**: 15 min, en header `Authorization: Bearer <token>`
- **Refresh token**: 7 días, cookie `HttpOnly; Secure; SameSite=Strict`
- El JWT payload incluye `project_id` — todo token está ligado a un proyecto específico
- Socket.IO: el access token se envía en `auth: { token }` en el handshake junto al namespace del proyecto

```python
# Payload del JWT
{
    "sub": "user_id",          # UUID del usuario
    "project_id": "proj_uuid", # UUID del proyecto al que pertenece
    "role": "client",          # client | agent | admin
    "exp": 1234567890
}
```

```python
# app/sockets/events.py — connect scoped a namespace (= api_key del proyecto)
@sio.on("connect", namespace="*")
async def on_connect(sid, environ, auth, namespace):
    api_key = namespace.lstrip("/") or None
    if not api_key:
        raise socketio.exceptions.ConnectionRefusedError({"code": "PROJECT_NOT_FOUND"})

    project = await get_project_by_api_key(api_key)
    if not project or not project.is_active:
        raise socketio.exceptions.ConnectionRefusedError({"code": "PROJECT_NOT_FOUND"})

    token = (auth or {}).get("token")
    if not token:
        raise socketio.exceptions.ConnectionRefusedError({"code": "AUTH_MISSING_TOKEN"})

    user = verify_token(token, expected_project_id=project.id)
    await sio.save_session(sid, {
        "user_id": user.id,
        "project_id": project.id,
        "role": user.role,
        "namespace": namespace,
    }, namespace=namespace)
```

---

### 3.6 Rooms / Canales — Scoped a Proyecto

Las rooms son locales al namespace del proyecto. No hay conflicto entre proyectos
porque cada uno opera en su propio namespace de Socket.IO.

```python
# Convenciones de room_id (dentro del namespace del proyecto)
ROOM_GENERAL = "general"
ROOM_DIRECT  = lambda a, b: f"direct:{min(a,b)}:{max(a,b)}"  # orden canónico
ROOM_TICKET  = lambda tid: f"ticket:{tid}"
ROOM_ORDERS  = "orders:board"  # solo agents/admins

# El join a un room incluye validación de project_id
@sio.on("room:join", namespace="*")
async def on_room_join(sid, data, namespace):
    session = await sio.get_session(sid, namespace=namespace)
    project_id = session["project_id"]
    room_id = data.get("room_id")

    # Validar que el room pertenece al proyecto antes de hacer join
    allowed = await validate_room_access(project_id, session["user_id"], room_id)
    if not allowed:
        await sio.emit("error", {"code": "FORBIDDEN_ROOM"}, to=sid, namespace=namespace)
        return

    await sio.enter_room(sid, room_id, namespace=namespace)
```

---

### 3.7 Systemd Service

```ini
# suportum.service
[Unit]
Description=Suportum Chat API
After=network.target

[Service]
User=opc
WorkingDirectory=/home/opc/projects/suportum
EnvironmentFile=-/home/opc/projects/suportum/.env
ExecStart=/home/opc/projects/suportum/.venv/bin/gunicorn "app.main:socket_app" \
    -w 1 -k uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8001 \
    --timeout 0 \
    --access-logfile - \
    --error-logfile -
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> `--timeout 0` es crítico: las conexiones WebSocket son long-lived. Gunicorn no debe matar workers por timeout en conexiones persistentes.

---

### 3.8 Nginx Config

```nginx
# suportum.conf
server {
    listen 80;
    server_name chat.azanolabs.com;
    include /etc/nginx/cloudflare-ips.conf;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name chat.azanolabs.com;

    ssl_certificate     /etc/nginx/ssl/origin.crt;
    ssl_certificate_key /etc/nginx/ssl/origin.key;

    include /etc/nginx/cloudflare-ips.conf;

    location / {
        limit_req zone=api burst=30 nodelay;

        proxy_pass             http://127.0.0.1:8001;
        proxy_set_header       Host $host;
        proxy_set_header       X-Real-IP $remote_addr;
        proxy_set_header       X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header       X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version     1.1;
        proxy_set_header       Upgrade $http_upgrade;
        proxy_set_header       Connection "upgrade";
        proxy_read_timeout     86400s;   # 24h — mantener WebSocket vivo
        proxy_send_timeout     86400s;
    }
}
```

---

### 3.9 Variables de Entorno

> ⚠️ **Regla de entorno**: Solo 2 archivos de entorno en todo el proyecto:
> - **`.env`** — valores reales de producción y desarrollo local. **NUNCA subir al repo** (en `.gitignore`).
> - **`.env.example`** — mismas variables pero con valores en blanco. **Sí se sube al repo** como referencia.
> No existe `.env.local`, `.env.production`, `.env.development` ni ningún otro archivo adicional.

```env
# .env.example — backend (valores en blanco — copiar a .env y completar)

PROJECT_NAME=
API_VERSION=
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=
REFRESH_TOKEN_EXPIRE_DAYS=
DATABASE_URL=
CORS_ORIGINS=
ENVIRONMENT=
PORT=

# Uploads de imágenes
UPLOAD_DIR=
MAX_IMAGE_SIZE_MB=
MAX_IMAGE_DIMENSION_PX=
```

```env
# .env — backend local (NO subir al repo)

PROJECT_NAME=suportum-api
API_VERSION=1.0.0
SECRET_KEY=cambia-esto-por-64-bytes-hex-aleatorio
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=./data/suportum.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ENVIRONMENT=development
PORT=8001

UPLOAD_DIR=./uploads
MAX_IMAGE_SIZE_MB=10
MAX_IMAGE_DIMENSION_PX=1920
```

```env
# .env — backend producción VPS (NO subir al repo)

PROJECT_NAME=suportum-api
API_VERSION=1.0.0
SECRET_KEY=clave-secreta-de-produccion-diferente
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=./data/suportum.db
CORS_ORIGINS=https://chat.azanolabs.com
# CORS_ORIGINS acepta múltiples orígenes separados por coma.
# Añadir el dominio de cada sitio donde se embeba el widget suportum-chat.
ENVIRONMENT=production
PORT=8001

UPLOAD_DIR=./uploads
MAX_IMAGE_SIZE_MB=10
MAX_IMAGE_DIMENSION_PX=1920
```

---

### 3.10 Subida y Compresión de Imágenes

#### Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Formatos aceptados | JPEG, PNG, GIF, WebP | Formatos web estándar — no videos |
| Formato de salida | **WebP** | 25–35% menor tamaño que JPEG a igual calidad visual |
| Compresión | **Pillow** (PIL) | Librería estándar Python, wheel ARM64 disponible |
| Almacenamiento | **Filesystem** (no SQLite BLOB) | SQLite no está optimizado para archivos binarios grandes |
| Metadatos | **SQLite** (`attachments` table) | ID, URL, dimensiones, tamaño post-compresión |
| Servir archivos | **FastAPI StaticFiles** mount | Sin Nginx extra — Nginx ya proxea `/uploads/*` al FastAPI |
| Validación MIME | **magic bytes** (`python-magic`) | No confiar en la extensión del archivo |
| Estructura de directorios | `UPLOAD_DIR/chat/<room_id>/<year>/<month>/` | Organizado por sala y fecha — evita directorios con millones de archivos |

#### Estructura de directorios en disco

```
UPLOAD_DIR/               ← configurable via .env (relativo al working dir del proceso)
  chat/
    general/
      2026/06/
        <uuid>.webp
    direct-{uid1}-{uid2}/
      2026/06/
        <uuid>.webp
    ticket-{tid}/
      2026/06/
        <uuid>.webp
```

- **Local**: `UPLOAD_DIR=./uploads` → `<proyecto>/uploads/`
- **Producción**: `UPLOAD_DIR=./uploads` → `/home/opc/projects/suportum/uploads/`
- El directorio se crea automáticamente al arrancar si no existe.

#### Dependencias

```bash
# Sin versión — pip resuelve la última estable
pip install Pillow

# Validación MIME por magic bytes:
#   En Windows (local dev):
pip install python-magic-bin   # incluye DLL nativa

#   En VPS Oracle Linux ARM64 (producción):
#   sudo dnf install file-libs   # instalar libmagic del sistema
pip install python-magic
```

> ⚠️ `python-magic-bin` sólo para Windows. `python-magic` para Linux/ARM64.
> Usar variable de entorno o condicional en requirements para gestionar la diferencia,
> o simplificar con validación de cabeceras de bytes directamente en Python puro.

#### Flujo de subida

```
POST /api/v1/upload/{room_id}
  multipart/form-data: file=<imagen>
  Authorization: Bearer <token>

  1. Validar JWT + pertenencia al room
  2. Leer hasta MAX_IMAGE_SIZE_MB → rechazar si excede
  3. Validar MIME por magic bytes (image/jpeg|png|gif|webp)
  4. Pillow: abrir → thumbnail proporcional si > MAX_IMAGE_DIMENSION_PX
  5. Convertir a RGB/RGBA según modo → guardar como WebP quality=85
  6. mkdir -p UPLOAD_DIR/chat/<room_id>/<año>/<mes>/
  7. Escribir <uuid>.webp en disco
  8. INSERT en attachments + INSERT en messages (content_type='image')
  9. Emitir Socket.IO: message:new con payload completo
  10. Responder: { message_id, attachment: { url, width, height, size_bytes } }
```

#### Auto-init al arrancar (cero fricción)

```python
# app/core/startup.py — se ejecuta al levantar el servidor
from pathlib import Path
from contextlib import asynccontextmanager
from app.core.config import settings

async def on_startup():
    """Crea todo lo necesario si no existe — local y producción."""
    # Directorio de datos (SQLite)
    Path(settings.DATABASE_URL).parent.mkdir(parents=True, exist_ok=True)
    # Directorio de uploads de imágenes
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    # Migraciones idempotentes (CREATE TABLE IF NOT EXISTS)
    await run_migrations()

@asynccontextmanager
async def lifespan(app):
    await on_startup()
    yield

app = FastAPI(lifespan=lifespan)
# Montar archivos estáticos DESPUÉS de on_startup (el dir ya existe)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
```

> Con este patrón: arrancar el servidor por primera vez en un entorno limpio
> (sin BD, sin uploads) **simplemente funciona**. Sin pasos manuales previos.

#### Payload de mensaje con imagen (Socket.IO)

```json
{
  "id": "<uuid>",
  "room_id": "general",
  "sender_id": "<uuid>",
  "content": "",
  "content_type": "image",
  "attachment": {
    "url": "/uploads/chat/general/2026/06/<uuid>.webp",
    "width": 800,
    "height": 600,
    "size_bytes": 45000
  },
  "created_at": "2026-06-08T19:00:00Z"
}
```

`content_type` puede ser: `"text"` | `"image"` | `"text+image"` (mensaje con texto e imagen).

#### Reglas de seguridad

- MIME validado por **magic bytes** — nunca por extensión del archivo
- Nombre en disco: **UUID v4 generado por el servidor** — el nombre original va sólo en metadata
- El directorio de uploads debe estar **fuera del código fuente** del repositorio
- En producción añadir a `.gitignore`: `uploads/` y `data/`
- Nunca ejecutar ni interpretar el archivo subido
- **Sin soporte para video** — rechazar con `415` cualquier tipo `video/*`, `audio/*` o archivos no listados en `ALLOWED_MIME`

---

### 3.11 Manejo de Errores del Backend

> ⚠️ **Principio fundamental**: el backend **nunca expone** información interna al cliente.
> Stack traces, mensajes de excepción Python, rutas del sistema de archivos, nombres de tablas
> o cualquier detalle de implementación deben quedar en el log del servidor y ser invisibles al cliente.

#### Contrato de respuesta de error

Toda respuesta de error HTTP tiene este shape exacto:

```json
{
  "error": {
    "code": "UPLOAD_TYPE_NOT_SUPPORTED",
    "message": "Solo se permiten imágenes (JPEG, PNG, GIF, WebP). No se aceptan videos ni otros formatos."
  }
}
```

El campo `code` es una constante en `SCREAMING_SNAKE_CASE` — el cliente puede ramificar su lógica por código sin depender de mensajes localizables.

#### Catálogo de códigos de error

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Payload malformado, campo requerido ausente |
| 400 | `INVALID_ROOM_ID` | `room_id` con formato inválido |
| 400 | `MESSAGE_TOO_LONG` | Texto del mensaje supera el límite (4000 chars) |
| 401 | `AUTH_MISSING_TOKEN` | No se envió token |
| 401 | `AUTH_TOKEN_EXPIRED` | Token de acceso expirado |
| 401 | `AUTH_TOKEN_INVALID` | Token malformado o firma inválida |
| 401 | `AUTH_REFRESH_EXPIRED` | Refresh token expirado — re-login obligatorio |
| 403 | `FORBIDDEN` | Recurso existe pero el usuario no tiene permiso |
| 403 | `FORBIDDEN_ROOM` | Usuario no pertenece a ese room |
| 404 | `NOT_FOUND` | Recurso no encontrado (genérico) |
| 404 | `USER_NOT_FOUND` | Usuario no encontrado |
| 404 | `ROOM_NOT_FOUND` | Room no encontrado |
| 409 | `USERNAME_TAKEN` | Nombre de usuario ya existe |
| 409 | `EMAIL_TAKEN` | Email ya registrado |
| 413 | `UPLOAD_TOO_LARGE` | Imagen supera `MAX_IMAGE_SIZE_MB` |
| 415 | `UPLOAD_TYPE_NOT_SUPPORTED` | Tipo de archivo no aceptado (video, audio, etc.) |
| 422 | `UPLOAD_CORRUPT` | Archivo no se puede procesar como imagen |
| 429 | `RATE_LIMITED` | Demasiadas peticiones en ventana de tiempo |
| 500 | `INTERNAL_ERROR` | Error interno — sin detalle interno expuesto |
| 503 | `SERVICE_UNAVAILABLE` | Dependencia temporalmente no disponible |

#### Implementación del handler global

```python
# app/core/errors.py

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("suportum")


def error_response(code: str, message: str, status: int) -> JSONResponse:
    """Construye la respuesta de error estándar. NUNCA incluir detalle interno."""
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Mapear status codes conocidos a códigos semánticos
    CODE_MAP = {
        401: "AUTH_TOKEN_INVALID",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        429: "RATE_LIMITED",
    }
    code = CODE_MAP.get(exc.status_code, "INTERNAL_ERROR")
    # exc.detail puede ser un código semántico explícito lanzado internamente
    if isinstance(exc.detail, str) and exc.detail.isupper() and "_" in exc.detail:
        code = exc.detail
        message = _code_to_message(code)
    else:
        message = str(exc.detail) if exc.status_code < 500 else "Error interno"
    return error_response(code, message, exc.status_code)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Nunca exponer el detalle de validación interna de Pydantic
    return error_response("VALIDATION_ERROR", "Los datos enviados son inválidos.", 400)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log completo en servidor, respuesta opaca al cliente
    logger.exception("Unhandled exception: %s %s", request.method, request.url)
    return error_response("INTERNAL_ERROR", "Ha ocurrido un error interno.", 500)


def _code_to_message(code: str) -> str:
    MESSAGES = {
        "AUTH_MISSING_TOKEN": "Se requiere autenticación.",
        "AUTH_TOKEN_EXPIRED": "La sesión ha expirado. Por favor inicia sesión nuevamente.",
        "AUTH_TOKEN_INVALID": "Token de autenticación inválido.",
        "AUTH_REFRESH_EXPIRED": "La sesión ha caducado. Por favor inicia sesión.",
        "FORBIDDEN": "No tienes permiso para realizar esta acción.",
        "FORBIDDEN_ROOM": "No tienes acceso a este chat.",
        "USER_NOT_FOUND": "Usuario no encontrado.",
        "ROOM_NOT_FOUND": "Chat no encontrado.",
        "USERNAME_TAKEN": "Este nombre de usuario ya está en uso.",
        "EMAIL_TAKEN": "Este correo electrónico ya está registrado.",
        "UPLOAD_TOO_LARGE": "La imagen supera el tamaño máximo permitido.",
        "UPLOAD_TYPE_NOT_SUPPORTED": "Solo se permiten imágenes (JPEG, PNG, GIF, WebP).",
        "UPLOAD_CORRUPT": "El archivo no es una imagen válida o está dañado.",
        "RATE_LIMITED": "Demasiadas peticiones. Espera un momento.",
        "INTERNAL_ERROR": "Ha ocurrido un error interno.",
        "SERVICE_UNAVAILABLE": "Servicio temporalmente no disponible.",
    }
    return MESSAGES.get(code, "Error desconocido.")
```

```python
# app/main.py — registrar los handlers globales

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.errors import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
```

#### Cómo lanzar errores desde los endpoints

```python
# Correcto — lanzar con código semántico como detail
from fastapi import HTTPException

raise HTTPException(status_code=413, detail="UPLOAD_TOO_LARGE")
raise HTTPException(status_code=415, detail="UPLOAD_TYPE_NOT_SUPPORTED")
raise HTTPException(status_code=403, detail="FORBIDDEN_ROOM")

# Nunca hacer esto — expone detalles internos
raise HTTPException(status_code=500, detail=str(e))          # ❌
raise HTTPException(status_code=400, detail=repr(exc))       # ❌
return {"error": traceback.format_exc()}                      # ❌
```

#### Errores en Socket.IO

Los eventos de error de Socket.IO siguen el mismo contrato:

```python
# Emitir error al cliente sin exponer detalles internos
await sio.emit("error", {"code": "FORBIDDEN_ROOM", "message": "No tienes acceso a este chat."}, to=sid)

# En el evento connect — rechazar con código semántico
raise socketio.exceptions.ConnectionRefusedError({"code": "AUTH_TOKEN_INVALID", "message": "Token inválido."})
```

#### Reglas de logging

- **`logger.exception()`** — siempre para errores 5xx con traceback completo (solo en servidor)
- **`logger.warning()`** — errores 4xx (el cliente hizo algo incorrecto)
- **Nunca** loguear: passwords, tokens JWT, datos personales (email, nombre), contenido de mensajes
- El formato de log debe incluir: timestamp, nivel, método HTTP, path, código de error, request_id (sin PII)

```python
# Formato recomendado para el logger
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
)
```

---



> **React (latest) + Tailwind CSS v4 + Socket.IO Client — un único paquete npm publicable**
>
> El frontend es **un solo producto**: el paquete `suportum-chat`. No hay una app de dashboard separada.
> La interfaz que ve el usuario depende exclusivamente de su **rol** (`client`, `agent`, `admin`).

---

### 3.12 Project Onboarding API — Setup Wizard

> Cuando un developer instala el paquete `suportum-chat` por primera vez, el widget
> detecta que no tiene `apiKey` configurado y despliega un **Setup Wizard** paso a paso.
> Este wizard llama a endpoints **públicos** (sin autenticación) que crean el proyecto desde cero.

#### Flujo del Setup Wizard

```
Paso 1: Nombre del proyecto / negocio
  → POST /api/v1/setup/validate-slug   (verificar disponibilidad del slug)

Paso 2: Cuenta de administrador
  → { email, username, password }

Paso 3: Confirmar y crear
  → POST /api/v1/setup/create
  ← { project_id, api_key, admin_token }

Paso 4: El widget muestra el api_key al developer para guardar
  → El developer lo añade a su configuración como prop apiKey="proj_xxxx"
  → El widget se reinicia ya autenticado como admin
```

#### Endpoints de Setup (sin auth — solo disponibles si el proyecto aún no existe)

```
POST   /api/v1/setup/create
  Body: {
    project_name: string,       // "Soporte WoW Boosting"
    slug: string,               // "wow-boosting" (URL-friendly, único)
    admin_email: string,
    admin_username: string,
    admin_password: string
  }
  Response: {
    project_id: string,
    api_key: string,            // formato: "sproj_<uuid_sin_guiones>"
    admin_token: string,        // access token JWT del admin recién creado
    message: string
  }
  Errores: SLUG_TAKEN, EMAIL_TAKEN, USERNAME_TAKEN, VALIDATION_ERROR

GET    /api/v1/setup/check-slug/{slug}
  Response: { available: boolean }

GET    /api/v1/setup/health
  Response: { status: "ok", version: string }
  (útil para que el widget verifique que el backend está vivo antes del wizard)
```

#### Qué se crea en la BD al hacer setup

```python
async def create_project(data: SetupRequest) -> SetupResponse:
    project_id = str(uuid.uuid4())
    api_key = f"sproj_{uuid.uuid4().hex}"  # prefijo legible + UUID sin guiones

    async with db.transaction():
        # 1. Crear proyecto
        await db.execute(
            "INSERT INTO projects (id, name, api_key, slug) VALUES (?, ?, ?, ?)",
            (project_id, data.project_name, api_key, data.slug)
        )
        # 2. Crear admin del proyecto
        admin_id = str(uuid.uuid4())
        hashed = hash_password(data.admin_password)
        await db.execute(
            "INSERT INTO users (id, project_id, email, username, password, role) VALUES (?,?,?,?,?,?)",
            (admin_id, project_id, data.admin_email, data.admin_username, hashed, "admin")
        )
        # 3. Crear directorio de uploads para este proyecto
        Path(settings.UPLOAD_DIR / project_id / "chat").mkdir(parents=True, exist_ok=True)

    # 4. Generar token JWT para el admin
    admin_token = create_access_token({"sub": admin_id, "project_id": project_id, "role": "admin"})

    return SetupResponse(project_id=project_id, api_key=api_key, admin_token=admin_token)
```

#### Rate limiting del endpoint de setup

El endpoint `POST /api/v1/setup/create` es público — protegerlo de abuso:
- Máximo 3 proyectos creados por IP en 24 horas
- Rate limiter implementado con `asyncio` + dict en memoria (sin Redis)
- En producción, Nginx también puede limitar: `limit_req_zone $binary_remote_addr rate=5r/m`

#### Estructura de uploads por proyecto

Con multi-tenancy, los uploads se aíslan por proyecto:
```
UPLOAD_DIR/
  {project_id}/
    chat/
      general/2026/06/<uuid>.webp
      direct-{uid1}-{uid2}/2026/06/<uuid>.webp
```

- Rate limiter implementado con `asyncio` + dict en memoria (sin Redis)
- En producción, Nginx también puede limitar: `limit_req_zone $binary_remote_addr rate=5r/m`

#### Estructura de uploads por proyecto

Con multi-tenancy, los uploads se aíslan por proyecto:
```
UPLOAD_DIR/
  {project_id}/
    chat/
      general/2026/06/<uuid>.webp
      direct-{uid1}-{uid2}/2026/06/<uuid>.webp
```

---

### 3.13 Capa de Seguridad — Aislamiento Multi-Tenant

> Esta sección es la **referencia de seguridad completa** del backend.
> Los agentes implementadores deben leerla antes de escribir cualquier endpoint o evento Socket.IO.
> Un error de aislamiento entre proyectos es el bug más grave posible en este sistema.

---

#### Audit de vectores de ataque y mitigaciones

| # | Vector | Riesgo | Mitigación |
|---|---|---|---|
| 1 | Endpoint REST sin filtro `project_id` | Fuga de datos entre proyectos | Guard `get_scoped_project()` obligatorio |
| 2 | IDOR — acceso por UUID directo | Usuario de P1 lee recurso de P2 | Toda query: `WHERE id=? AND project_id=?` |
| 3 | JWT de proyecto A usado en proyecto B | Acceso cruzado de proyectos | `verify_token()` valida `project_id` del JWT vs contexto del request |
| 4 | Socket.IO — namespace sin validar | Conexión a proyecto ajeno | Namespace = `api_key` → validado en `on_connect` |
| 5 | Admin de proyecto A accede a proyecto B | Escalada horizontal de privilegios | `admin` = admin de su proyecto, nunca global |
| 6 | CORS abierto + cookie cross-site | Session hijacking | Cookie `SameSite=None; Secure` + CORS con `allow_credentials` + origins por proyecto |
| 7 | Setup slug enumeration | Descubrimiento de proyectos | `check-slug` no distingue entre "no existe" y "prohibido" |
| 8 | SQL injection | Acceso/destrucción de BD | Parámetros `?` siempre — nunca f-string en SQL |
| 9 | Path traversal en uploads | Leer/escribir archivos del servidor | UUID como nombre en disco + `safe_join()` antes de servir |
| 10 | Headers HTTP sin seguridad | XSS, clickjacking, sniffing | Middleware de security headers en FastAPI |
| 11 | Tokens de larga vida comprometidos | Impersonación persistente | Access 15min + revocación via cambio de `SECRET_KEY` del proyecto |
| 12 | Rate limiting ausente | Brute force, DoS | Throttle por IP en setup + por user_id en mensajes |

---

#### Guard `get_scoped_project()` — el corazón del aislamiento

Todos los endpoints que manejan datos de un proyecto reciben este `Depends()`.
**Nunca implementar un endpoint sin él** si accede a datos de usuarios, mensajes, tickets u órdenes.

```python
# app/core/guards.py

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.auth import decode_token
from app.core.project import get_project_by_id

bearer_scheme = HTTPBearer()

async def get_current_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Decodifica y valida el JWT. Lanza AUTH_TOKEN_INVALID si falla."""
    payload = decode_token(credentials.credentials)  # lanza si expirado/inválido
    return payload


async def get_scoped_project(token: dict = Depends(get_current_token)) -> dict:
    """
    Extrae project_id del JWT y carga el proyecto.
    Garantiza que el token corresponde a un proyecto activo.
    """
    project_id = token.get("project_id")
    if not project_id:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    project = await get_project_by_id(project_id)
    if not project or not project["is_active"]:
        raise HTTPException(status_code=403, detail="FORBIDDEN")

    return {"project": project, "user_id": token["sub"], "role": token["role"]}


def require_role(*roles: str):
    """Factory de guard para verificar rol dentro del proyecto."""
    async def _guard(scope: dict = Depends(get_scoped_project)) -> dict:
        if scope["role"] not in roles:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
        return scope
    return _guard

# Atajos de uso frecuente
require_agent_or_admin = require_role("agent", "admin")
require_admin           = require_role("admin")
require_any             = require_role("client", "agent", "admin")
```

**Uso en endpoints:**

```python
# app/api/v1/tickets.py

@router.get("/tickets")
async def list_tickets(scope: dict = Depends(require_agent_or_admin)):
    project_id = scope["project"]["id"]
    user_id    = scope["user_id"]
    role       = scope["role"]

    # ← SIEMPRE filtrar por project_id primero
    query = "SELECT * FROM tickets WHERE project_id = ?"
    params = [project_id]

    if role == "agent":
        # Los agents solo ven sus tickets asignados
        query += " AND agent_id = ?"
        params.append(user_id)

    return await db.fetchall(query, params)


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, scope: dict = Depends(require_any)):
    project_id = scope["project"]["id"]

    # ← SIEMPRE id + project_id en el WHERE — previene IDOR
    ticket = await db.fetchone(
        "SELECT * FROM tickets WHERE id = ? AND project_id = ?",
        (ticket_id, project_id)
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return ticket
```

---

#### IDOR — Regla absoluta de queries

> **Ley del doble filtro**: toda query que busca un recurso por ID debe incluir SIEMPRE
> `AND project_id = ?`. Una query con solo `WHERE id = ?` es un bug de seguridad garantizado.

```python
# ❌ NUNCA — IDOR vulnerable
row = await db.fetchone("SELECT * FROM messages WHERE id = ?", (msg_id,))

# ✅ SIEMPRE — IDOR protegido
row = await db.fetchone(
    "SELECT * FROM messages WHERE id = ? AND project_id = ?",
    (msg_id, project_id)
)
# Si no encuentra → 404 NOT_FOUND (no distinguir "no existe" de "es de otro proyecto")
```

---

#### Validación cruzada de JWT vs proyecto

El JWT lleva `project_id` firmado por el servidor. No se puede forjar sin `SECRET_KEY`.
Sin embargo, en Socket.IO hay doble validación explícita:

```python
async def verify_token(token: str, expected_project_id: str) -> dict:
    payload = decode_jwt(token)  # lanza si firma inválida o expirado

    # Validación cruzada: el token debe ser del mismo proyecto que el namespace
    if payload["project_id"] != expected_project_id:
        raise socketio.exceptions.ConnectionRefusedError({"code": "FORBIDDEN"})

    return payload
```

En REST, el `project_id` viene del JWT (no de la URL) — no hay posibilidad de sustitución.

---

#### CORS para widgets embebidos en dominios externos

El widget se instala en cualquier dominio (`mystore.com`, `mygame.gg`, etc.).
La API debe aceptar peticiones cross-origin autenticadas con token.

**El problema con cookies y CORS:**

```
mystore.com  →  chat.azanolabs.com/api   (cross-origin)
```

`SameSite=Strict` o `SameSite=Lax` en el refresh token cookie
impediría que el browser lo envíe en requests cross-origin. Solución:

```python
# app/core/auth.py — refresh token cookie para uso cross-origin

def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,          # Solo HTTPS
        samesite="none",      # ← Necesario para cross-origin embebido
        max_age=7 * 24 * 3600,
        path="/api/v1/auth/refresh",  # Solo se envía en el endpoint de refresh
    )
```

```python
# app/main.py — CORS con credentials habilitado

from fastapi.middleware.cors import CORSMiddleware

# Los orígenes permitidos se gestionan en cada proyecto (settings JSON)
# Para la fase inicial se acepta cualquier origen autenticado con token
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # El widget puede estar en cualquier dominio
    allow_credentials=True,         # Necesario para la cookie de refresh
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
```

> ⚠️ `allow_origins=["*"]` con `allow_credentials=True` está prohibido por el spec CORS —
> los browsers lo rechazarán. Solución: usar un middleware custom que lee el header `Origin`
> de la request y lo devuelve en `Access-Control-Allow-Origin` si está en la lista o si
> el proyecto lo tiene permitido.

```python
# app/core/cors.py — CORS dinámico (leer Origin y echarlo si está permitido)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        response = await call_next(request)

        # Permitir cualquier origen para el widget (auth es por Bearer token)
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type"
            response.headers["Vary"] = "Origin"

        return response
```

---

#### HTTP Security Headers

```python
# app/core/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # No añadir X-XSS-Protection — es obsoleto y puede crear vulnerabilidades
        return response
```

---

#### Prevención de SQL Injection

```python
# ✅ SIEMPRE — parámetros posicionales
await db.execute("SELECT * FROM users WHERE email = ? AND project_id = ?", (email, project_id))

# ❌ NUNCA — interpolación de strings en SQL
await db.execute(f"SELECT * FROM users WHERE email = '{email}'")   # SQLi garantizado
await db.execute("SELECT * FROM users WHERE email = '%s'" % email)  # SQLi garantizado
```

Regla: si ves una f-string, `.format()` o `%` dentro de una query SQL → bug crítico de seguridad.

---

#### Path Traversal en Uploads

```python
# app/api/v1/upload.py — servir archivos de manera segura

from pathlib import Path

def safe_upload_path(upload_dir: str, project_id: str, room_id: str, filename: str) -> Path:
    """Construye la ruta de upload con validación de path traversal."""
    base = Path(upload_dir).resolve()
    target = (base / project_id / "chat" / room_id / filename).resolve()

    # Garantizar que el target está dentro del directorio base
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal detectado")

    return target
```

El nombre del archivo en disco siempre es el UUID generado por el servidor — no el nombre original.

---

#### Scope del rol `admin`

> Un usuario con rol `admin` dentro del proyecto X tiene poder total dentro de X.
> **NO tiene acceso a ningún otro proyecto.** No existe un "super admin" del sistema.
> Si se necesita administración global del sistema en el futuro, será un sistema separado
> con credenciales del VPS, no un rol dentro de la API.

```python
# ✅ Un admin puede borrar usuarios de su proyecto
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, scope: dict = Depends(require_admin)):
    project_id = scope["project"]["id"]
    # Doble filtro: user_id + project_id — un admin no puede borrar usuarios de otro proyecto
    result = await db.execute(
        "DELETE FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id)
    )
    if result.rowcount == 0:
        raise HTTPException(404, detail="USER_NOT_FOUND")
```

---

#### API Key — Rotación

```python
# app/api/v1/projects.py

@router.post("/projects/rotate-key")
async def rotate_api_key(scope: dict = Depends(require_admin)):
    """Permite al admin del proyecto rotar su api_key si cree que está comprometida."""
    project_id = scope["project"]["id"]
    new_key = f"sproj_{uuid.uuid4().hex}"

    await db.execute(
        "UPDATE projects SET api_key = ?, updated_at = ? WHERE id = ?",
        (new_key, now_iso(), project_id)
    )
    # Tras rotar, todos los widgets conectados con el namespace viejo
    # serán rechazados en el próximo reconnect — comportamiento intencional.
    return {"api_key": new_key, "warning": "Actualiza apiKey en todos los sitios donde instalaste el widget."}
```

---

#### Rate Limiting — Implementación en memoria

Sin Redis, usando el event loop asyncio + dict en memoria:

```python
# app/core/rate_limit.py

import time
from collections import defaultdict

_buckets: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """True si se permite, False si se debe rechazar. Thread-safe en asyncio single-process."""
    now = time.monotonic()
    cutoff = now - window_seconds
    bucket = _buckets[key]

    # Limpiar timestamps viejos
    _buckets[key] = [t for t in bucket if t > cutoff]

    if len(_buckets[key]) >= max_requests:
        return False  # Rate limited

    _buckets[key].append(now)
    return True


# Uso en setup endpoint
@router.post("/setup/create")
async def create_project(request: Request, data: SetupRequest):
    ip = request.client.host
    if not check_rate_limit(f"setup:{ip}", max_requests=3, window_seconds=86400):
        raise HTTPException(429, detail="RATE_LIMITED")
    # ...

# Uso en mensajes de chat (Socket.IO)
@sio.on("message:send", namespace="*")
async def on_message(sid, data, namespace):
    session = await sio.get_session(sid, namespace=namespace)
    if not check_rate_limit(f"msg:{session['user_id']}", max_requests=30, window_seconds=60):
        await sio.emit("error", {"code": "RATE_LIMITED"}, to=sid, namespace=namespace)
        return
    # ...
```

> ⚠️ Este rate limiter vive en memoria del proceso — se resetea al reiniciar el servidor.
> Es suficiente para el volumen actual. Si en el futuro hay múltiples workers o servidores,
> se necesitaría Redis o SQLite con TTL.

---


|---|---|---|---|
| Publicable como npm | ✅ Nativo | ❌ No aplica | ⚠️ Con workarounds |
| Embebible en cualquier proyecto | ✅ Sí | ❌ No | ❌ No |
| Role-based UI en cliente | ✅ Sí (React context) | ✅ | ✅ |
| Sin SSR necesario (widget client-side) | ✅ Correcto | ❌ Overhead innecesario | ✅ |
| Turbopack en desarrollo | ✅ Vite (dev server) | ✅ | ✅ Vite |

El widget NO necesita SSR. Es 100% client-side: el usuario se autentica, el JWT llega al widget, el widget lee el rol y renderiza la interfaz correspondiente.

**Estructura del monorepo (solo para desarrollo — el output es UN paquete):**

```
suportum/  (monorepo pnpm workspaces — solo para desarrollo)
├── packages/
│   └── suportum-chat/          # ← El único producto: paquete npm publicable
│       └── src/
└── apps/
    └── demo/                    # ← App Vite mínima para desarrollo/testing local
        └── (no se despliega a producción)
```

---

### 4.1 Arquitectura del Paquete — `suportum-chat`

Un único paquete. Una única importación. La interfaz adapta **todo** según el rol del usuario autenticado.

```
packages/suportum-chat/src/
├── atoms/                        # Primitivos — sin lógica de negocio
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Spinner.tsx
│   ├── Tooltip.tsx
│   └── index.ts
│
├── molecules/                    # Combinaciones con lógica de presentación
│   ├── MessageBubble.tsx         # Burbuja de mensaje con avatar + tiempo
│   ├── MessageInput.tsx          # Input + botón enviar
│   ├── TypingIndicator.tsx       # "usuario está escribiendo..."
│   ├── StatusBadge.tsx           # Badge coloreado por estado
│   ├── ConversationItem.tsx      # Item de lista de conversaciones (agents)
│   ├── OrderCard.tsx             # Tarjeta de orden en kanban
│   ├── TicketRow.tsx             # Fila de ticket en lista
│   ├── UserRow.tsx               # Fila de usuario en gestión (admin)
│   └── index.ts
│
├── organisms/                    # Secciones completas con estado y lógica
│   ├── shared/
│   │   ├── ChatPanel.tsx         # Panel de mensajes (todos los roles)
│   │   ├── ChatHeader.tsx        # Header adaptivo por rol
│   │   └── MessageList.tsx
│   ├── client/
│   │   ├── ClientHome.tsx        # Home: chats activos + mis órdenes
│   │   ├── ClientOrders.tsx      # Lista de órdenes del cliente
│   │   └── ClientTickets.tsx     # Tickets del cliente
│   ├── agent/
│   │   ├── AgentInbox.tsx        # Bandeja de conversaciones asignadas
│   │   ├── AgentOrders.tsx       # Board kanban de órdenes (expandible)
│   │   └── AgentTickets.tsx      # Gestión de tickets asignados
│   └── admin/
│       ├── AdminUsers.tsx        # Gestión de usuarios (CRUD)
│       ├── AdminOrders.tsx       # Board de órdenes global
│       ├── AdminTickets.tsx      # Todos los tickets
│       └── AdminSettings.tsx     # Temas, configuración del tenant
│
├── templates/                    # Composición final por rol
│   ├── FloatingWidget.tsx        # Shell: botón flotante + panel expansible
│   ├── views/
│   │   ├── LoginView.tsx         # Vista de login dentro del widget
│   │   ├── ClientView.tsx        # Composición de organismos para client
│   │   ├── AgentView.tsx         # Composición de organismos para agent
│   │   └── AdminView.tsx         # Composición de organismos para admin
│   └── index.ts
│
├── hooks/
│   ├── useSocket.ts              # Socket.IO client singleton
│   ├── useChat.ts                # Mensajes, typing, rooms
│   ├── useOrders.ts              # Board de órdenes realtime
│   ├── useWidgetState.ts         # open/close, expand, posición
│   └── useAuth.ts                # Token, rol, refresh automático
│
├── lib/
│   ├── api.ts                    # fetch wrapper hacia suportum-api
│   ├── auth.ts                   # JWT decode, refresh, storage
│   └── socket.ts                 # Socket.IO factory
│
├── styles/
│   ├── globals.css               # @import tailwindcss + @theme tokens
│   └── themes/
│       ├── dark-dragon.css
│       └── light-clean.css
│
└── index.ts                      # export { SuportumChat } from './templates/FloatingWidget'
```

---

### 4.2 Role-Based UI — El núcleo del widget

El rol se lee del JWT al autenticarse. El widget renderiza completamente distinto según el rol, desde el mismo componente raíz.

```tsx
// templates/FloatingWidget.tsx (lógica central)
'use client'

export function SuportumChat(props: SuportumChatProps) {
  const { user, isLoading } = useAuth(props.userToken, props.apiUrl, props.apiKey)
  const { isOpen, expand, close } = useWidgetState(props.defaultOpen)

  // Sin apiKey configurado → mostrar Setup Wizard (solo en primer uso)
  if (!props.apiKey) return <SetupWizard apiUrl={props.apiUrl} onComplete={props.onSetupComplete} />

  if (!isOpen) return <ChatButton onClick={expand} label={props.buttonLabel} />

  return (
    <WidgetShell position={props.position} offset={props.offset} onClose={close}>
      {isLoading && <Spinner />}
      {user?.role === 'client' && <ClientView apiUrl={props.apiUrl} apiKey={props.apiKey} />}
      {user?.role === 'agent'  && <AgentView  apiUrl={props.apiUrl} apiKey={props.apiKey} />}
      {user?.role === 'admin'  && <AdminView  apiUrl={props.apiUrl} apiKey={props.apiKey} />}
      {!user && <LoginView apiUrl={props.apiUrl} apiKey={props.apiKey} />}
    </WidgetShell>
  )
}
```

**Qué ve cada rol:**

| Módulo | client | agent | admin |
|---|---|---|---|
| Chat con soporte / responder chats | ✅ | ✅ | ✅ |
| Ver mis órdenes propias | ✅ | — | — |
| Solicitar apertura de chat directo | ✅ | — | — |
| Abrir chat directo a un cliente específico | — | ✅ | ✅ |
| Bandeja de conversaciones asignadas | — | ✅ | ✅ |
| Board kanban de órdenes (global) | — | ✅ | ✅ |
| Gestión de tickets asignados | — | ✅ | ✅ |
| Panel expandible de órdenes + dashboard | — | ✅ | ✅ |
| Gestión de usuarios (CRUD) | — | — | ✅ |
| Configuración de temas / tenant | — | — | ✅ |
| Todos los tickets (no solo asignados) | — | — | ✅ |

---

### 4.3 API del Componente — Props de `<SuportumChat />`

```tsx
import { SuportumChat } from 'suportum-chat'

// Primer uso — sin apiKey → muestra Setup Wizard para crear el proyecto
<SuportumChat apiUrl="https://chat.azanolabs.com" />

// Uso normal — apiKey obtenido en el Setup Wizard
<SuportumChat
  apiUrl="https://chat.azanolabs.com"
  apiKey="sproj_4f3a..."           // ← OBLIGATORIO después del setup
  position="bottom-right"          // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  offset={{ x: 24, y: 24 }}        // px desde el borde (default: 24)
  theme="dark-dragon"              // tema inicial (default: 'dark-dragon')
  userToken="jwt..."               // si el sitio host ya tiene sesión — omite el login
  defaultOpen={false}              // abrir el panel al cargar (default: false)
  buttonLabel="Soporte"            // label accesible del botón flotante
  onSetupComplete={(apiKey) => {}} // callback tras completar el wizard
/>
```

---

### 4.4 Instalación del Paquete (NUNCA versiones manuales)

```bash
# En el proyecto Next.js, Vite, Astro, o cualquier proyecto React
pnpm add suportum-chat@latest
# o
npm install suportum-chat@latest

# Instalar tsup para el build del paquete (solo en desarrollo del paquete mismo)
pnpm add -D tsup@latest
```

---
### 4.5 Sistema de Diseño — "Dragon UI"

Inspirado en los módulos de la cápsula Dragon de SpaceX: interfaz oscura, mínima, funcional, con densidad de información alta pero sin ruido visual.

#### Iconografía — Lucide React

**SIEMPRE usar Lucide React** para todos los iconos del proyecto. No usar otras librerías de iconos.

```bash
pnpm add lucide-react@latest
```

Iconos clave del widget:

| Uso | Icono Lucide | Import |
|---|---|---|
| Botón flotante / abrir chat | `MessageCircle` | `import { MessageCircle } from 'lucide-react'` |
| Cerrar panel | `X` | `import { X } from 'lucide-react'` |
| Minimizar | `ChevronDown` | `import { ChevronDown } from 'lucide-react'` |
| Enviar mensaje | `Send` | `import { Send } from 'lucide-react'` |
| Usuario / avatar | `User` | `import { User } from 'lucide-react'` |
| Agente online | `Circle` (filled green) | `import { Circle } from 'lucide-react'` |
| Ticket | `Ticket` o `FileText` | `import { Ticket } from 'lucide-react'` |
| Orden | `Package` | `import { Package } from 'lucide-react'` |
| Dashboard expandir | `Maximize2` | `import { Maximize2 } from 'lucide-react'` |
| Dashboard colapsar | `Minimize2` | `import { Minimize2 } from 'lucide-react'` |
| Settings | `Settings2` | `import { Settings2 } from 'lucide-react'` |
| Tema/paleta | `Palette` | `import { Palette } from 'lucide-react'` |

Todos los iconos de Lucide aceptan `size`, `strokeWidth`, `className` y `color` como props — aprovechar `className` con clases de Tailwind para control total.

---

#### ⚠️ iOS Safari — Lectura obligatoria antes de escribir estilos

**Antes de crear cualquier archivo CSS, componente con estilos, o definir variables de tema, el agente DEBE leer y aplicar el documento `context-iphone-bugs.md`** ubicado en la raíz del repositorio.

Reglas críticas que aplican a este proyecto:

```css
/* ❌ NUNCA — rompe iOS Safari < 16 */
html, body { overflow-x: clip; }

/* ✅ SIEMPRE */
html, body { overflow-x: hidden; }
```

```css
/* ❌ NUNCA en CSS puro */
.panel { backdrop-filter: blur(12px); }

/* ✅ SIEMPRE con prefijo webkit primero */
.panel {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
```

```tsx
/* ❌ NUNCA en inline styles de React */
style={{ backdropFilter: 'blur(12px)', userSelect: 'none' }}

/* ✅ SIEMPRE con prefijos webkit en inline styles */
style={{
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
  WebkitUserSelect: 'none',
  userSelect: 'none',
}}
```

```css
/* ❌ Para elementos full-height en mobile */
height: 100vh;

/* ✅ Con dvh + fallback */
min-height: 100vh;     /* fallback */
min-height: 100dvh;    /* iOS 15.4+ */
```

Inputs del chat: **font-size mínimo 16px** (`text-base` en Tailwind) para evitar auto-zoom en iOS.

---

#### Principios de diseño

- **Dark-first + Mobile-first**: el widget en mobile es la experiencia principal, no una adaptación
- **Monocromo + acento único**: un solo color de acento por tema (cian eléctrico por defecto)
- **Sin bordes redondeados excesivos**: `border-radius` máximo 4px en paneles, 2px en elementos de datos
- **Tipografía**: monospace para IDs/estados/timestamps, sans-serif para mensajes
- **Densidad adaptiva**: mobile muestra lo esencial, desktop expande el dashboard completo
- **Sin UI libraries externas**: componentes propios sobre Tailwind v4 para control total del Dragon UI

---

#### Tailwind v4 — `@theme` y convenciones

Tailwind v4 usa `@theme` en el CSS en lugar de `tailwind.config.js`. Los tokens del sistema de diseño se declaran ahí.

**Usar siempre clases de escala nativa** (`w-2.5`, `p-3.5`, `gap-1.5`) en lugar de valores arbitrarios (`w-[10px]`, `p-[14px]`). Solo usar valores arbitrarios cuando no exista clase nativa equivalente.

```css
/* styles/globals.css */
@import "tailwindcss";

@theme {
  /* ── Backgrounds ─────────────────────────────── */
  --color-bg-base:      #0a0a0f;
  --color-bg-surface:   #111118;
  --color-bg-elevated:  #1a1a24;
  --color-bg-overlay:   #22222f;

  /* ── Borders ──────────────────────────────────── */
  --color-border-subtle:  #1e1e2e;
  --color-border-default: #2a2a3d;
  --color-border-strong:  #3a3a52;

  /* ── Text ─────────────────────────────────────── */
  --color-text-primary:   #e8e8f0;
  --color-text-secondary: #8888a8;
  --color-text-muted:     #44445a;

  /* ── Accent ───────────────────────────────────── */
  --color-accent:       #00d4ff;
  --color-accent-dim:   #00d4ff22;
  --color-accent-hover: #33ddff;

  /* ── Status ───────────────────────────────────── */
  --color-status-pending:   #f59e0b;
  --color-status-active:    #10b981;
  --color-status-taken:     #6366f1;
  --color-status-completed: #22c55e;
  --color-status-cancelled: #ef4444;

  /* ── Typography ───────────────────────────────── */
  --font-ui:   'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Radius ───────────────────────────────────── */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;

  /* ── Transitions ──────────────────────────────── */
  --ease-fast: 120ms ease;
  --ease-base: 200ms ease;
}
```

Con `@theme`, los tokens son accesibles directamente como clases de Tailwind:
```tsx
// En JSX — los tokens @theme generan clases automáticamente
<div className="bg-bg-surface text-text-primary border-border-default">
  <span className="text-accent font-mono">STATUS: ACTIVE</span>
</div>
```

**Temas adicionales** sobreescriben las variables en un selector de clase:

```css
/* styles/themes/light-clean.css */
.theme-light-clean {
  --color-bg-base:    #f8f8fc;
  --color-bg-surface: #ffffff;
  --color-accent:     #0066cc;
  /* ... resto de overrides */
}
```

```tsx
// ThemeProvider aplica la clase al <html> o al contenedor del widget
document.documentElement.classList.remove('theme-dark-dragon', 'theme-light-clean')
document.documentElement.classList.add(`theme-${theme}`)
```

---

#### Diseño Atómico — Reglas de clasificación

| Nivel | Qué contiene | Ejemplos |
|---|---|---|
| **atoms** | Primitivos sin lógica de negocio, solo props y estilo | `Button`, `Input`, `Badge`, `Avatar`, `Spinner`, `Icon` |
| **molecules** | 2-5 átomos con lógica mínima de presentación | `MessageBubble`, `MessageInput`, `TypingIndicator`, `StatusBadge` |
| **organisms** | Secciones completas con estado y lógica de negocio | `ChatPanel`, `MessageList`, `OrdersBoard`, `Sidebar` |
| **templates** | Composición de organismos, define el layout | `FloatingWidget`, `DashboardShell`, `AuthLayout` |

Reglas estrictas:
- Un átomo **nunca** importa de molecules, organisms o templates
- Una molecule **nunca** importa de organisms o templates
- Cada nivel solo importa del nivel inmediatamente inferior

---

### 4.6 ThemeProvider — Implementación

```typescript
// atoms/ThemeProvider.tsx (en el paquete suportum-chat)
// dashboard: app/providers/ThemeProvider.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark-dragon' | 'light-clean' | string

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'dark-dragon', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark-dragon')

  useEffect(() => {
    const saved = localStorage.getItem('spt-theme') ?? 'dark-dragon'
    applyTheme(saved)
    setThemeState(saved)
  }, [])

  const setTheme = (t: Theme) => {
    localStorage.setItem('spt-theme', t)
    applyTheme(t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(theme: Theme) {
  // Aplica como clase en <html> — compatible con Tailwind @theme overrides
  const root = document.documentElement
  root.className = root.className
    .split(' ')
    .filter(c => !c.startsWith('theme-'))
    .concat(`theme-${theme}`)
    .join(' ')
}

export const useTheme = () => useContext(ThemeContext)
```

---

### 4.7 Panel Expandible (Dashboard de Órdenes)

La interfaz tiene un shell de dos columnas en desktop:

```
┌─────────────────┬────────────────────────────┐
│                 │                            │
│   Chat Panel    │   Expandible Panel         │
│   (siempre      │   (colapsado: sidebar)     │
│   visible)      │   (expandido: full board)  │
│                 │                            │
└─────────────────┴────────────────────────────┘
```

Al expandir, el panel de órdenes ocupa el 100% del viewport con un board tipo Kanban:

```
┌─────────────────────────────────────────────┐
│  Orders Board                    [Collapse] │
├──────────┬───────────┬──────────┬───────────┤
│ PENDING  │  ACTIVE   │  TAKEN   │ COMPLETED │
│          │           │          │           │
│ [card]   │ [card]    │ [card]   │ [card]    │
│ [card]   │           │ [card]   │           │
└──────────┴───────────┴──────────┴───────────┘
```

En mobile: el panel expandible se convierte en una bottom sheet con scroll horizontal por columnas de estado.

---

### 4.8 Socket.IO — Hooks de React

El socket se conecta al **namespace del proyecto** (`/{apiKey}`).
Un socket por sesión de usuario — singleton compartido dentro del widget.

```typescript
// hooks/useSocket.ts
'use client'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let globalSocket: Socket | null = null

export function useSocket(token: string | null, apiKey: string) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token || !apiKey) return

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

    if (!globalSocket || !globalSocket.connected) {
      // El namespace /{apiKey} aísla este widget en su proyecto del backend
      globalSocket = io(`${apiUrl}/${apiKey}`, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      })

      globalSocket.on('error', (err: { code: string; message: string }) => {
        // Errores emitidos por el servidor — nunca exponen internos
        console.warn('[suportum] socket error:', err.code)
      })

      globalSocket.on('connect_error', (err) => {
        console.warn('[suportum] connect_error:', err.message)
      })
    }

    socketRef.current = globalSocket

    return () => {
      // No desconectar en unmount — el socket es compartido por toda la sesión del widget
    }
  }, [token, apiKey])

  return socketRef.current
}
```

---

### 4.9 Auth Flow

```
Login (email + password)
        │
        ▼
POST /api/v1/auth/login
        │
        ▼
Server responde:
  - access_token (JSON body, 15 min)
  - refresh_token (HttpOnly cookie, 7 días)
        │
        ▼
Client guarda access_token en memoria (zustand)
        │
        ▼
Cada request lleva: Authorization: Bearer <access_token>
        │
Socket.IO connect: auth: { token: access_token }
        │
Al expirar: POST /api/v1/auth/refresh → nuevo access_token
```

---

### 4.10 Variables de Entorno Frontend

> ⚠️ Igual que el backend: solo `.env` (gitignored) y `.env.example` (en repo, valores en blanco).
> Cambiar solo `VITE_API_URL` y `VITE_SOCKET_URL` para alternar entre local y producción.

```env
# .env.example — frontend apps/demo (valores en blanco — copiar a .env y completar)

VITE_API_URL=
VITE_SOCKET_URL=
```

```env
# .env — frontend local (NO subir al repo)

VITE_API_URL=http://localhost:8001
VITE_SOCKET_URL=http://localhost:8001
```

```env
# .env — frontend producción (NO subir al repo)

VITE_API_URL=https://chat.azanolabs.com
VITE_SOCKET_URL=https://chat.azanolabs.com
```

---

---

### 4.11 Seguridad Frontend — Blindaje de UI contra Manipulación de Sesión

> **Principio fundamental**: el frontend nunca es la última línea de defensa.
> Toda decisión de acceso real la toma el backend. El frontend solo interpreta
> las respuestas del backend para mostrar la UI correcta.
> Un usuario que modifique localStorage, cookies, o el estado de Zustand
> solo logra ver una UI que el backend rechazará en el próximo request.

---

#### Vectores de ataque y respuesta del frontend

| Vector | Qué puede lograr el atacante | Por qué no funciona |
|---|---|---|
| Editar `access_token` en memoria/localStorage | JWT con firma inválida | Backend retorna `401 AUTH_TOKEN_INVALID` → logout automático |
| Editar `role` en el store de Zustand | Ver componentes de otro rol | Primer fetch de datos privilegiados retorna `403` → UI se destruye sola |
| Copiar token de otro usuario del mismo proyecto | Acceso como ese usuario | Token válido → backend lo acepta para ESE usuario (no es un bug, es el flujo normal) |
| Usar token expirado | - | `401 AUTH_TOKEN_EXPIRED` → flujo de refresh; si falla → logout |
| Usar `api_key` de otro proyecto en el namespace | Namespace válido pero token de otro proyecto | `verify_token()` rechaza cross-project → `ConnectionRefusedError` |
| Inyectar `project_id` falso en headers | - | El backend ignora headers de proyecto — toma `project_id` solo del JWT firmado |

---

#### Fuente de verdad del rol — siempre el backend

El JWT contiene el rol, pero **el frontend nunca confía ciegamente en él para renderizar UI protegida**.
Al montar el widget se llama a `/auth/me` para confirmar el rol con el servidor:

```typescript
// store/authStore.ts
import { create } from 'zustand'

type Role = 'client' | 'agent' | 'admin' | null

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  projectId: string | null
  isVerified: boolean          // ← true solo después de /auth/me exitoso
  setSession: (token: string, role: Role, userId: string, projectId: string) => void
  clearSession: () => void
  setVerified: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  projectId: null,
  isVerified: false,           // ← UI protegida solo se renderiza cuando esto es true
  setSession: (token, role, userId, projectId) =>
    set({ token, role, userId, projectId, isVerified: false }),
  clearSession: () =>
    set({ token: null, role: null, userId: null, projectId: null, isVerified: false }),
  setVerified: () => set({ isVerified: true }),
}))
```

```typescript
// hooks/useSessionVerifier.ts
// Se ejecuta una vez al montar el widget y cada vez que el token cambia.

import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../lib/api'

export function useSessionVerifier() {
  const { token, setVerified, clearSession, setSession } = useAuthStore()

  useEffect(() => {
    if (!token) return

    apiClient.get('/auth/me')
      .then((data) => {
        // El backend confirma: usuario real, rol real, proyecto real
        setSession(token, data.role, data.user_id, data.project_id)
        setVerified()
      })
      .catch((err) => {
        // 401 o 403 → el token fue manipulado o expiró
        // clearSession borra todo el estado — el widget muestra LoginView
        clearSession()
      })
  }, [token])
}
```

---

#### Guard de vistas por rol — nunca renderizar sin verificación

```typescript
// components/templates/WidgetShell.tsx

import { useAuthStore } from '../../store/authStore'
import { Spinner } from '../atoms/Spinner'
import { LoginView } from '../organisms/LoginView'
import { SetupWizard } from '../organisms/SetupWizard'

interface WidgetShellProps {
  apiKey: string
  apiUrl: string
}

export function WidgetShell({ apiKey, apiUrl }: WidgetShellProps) {
  const { token, role, isVerified } = useAuthStore()

  // Sin api_key → setup wizard (primer uso)
  if (!apiKey) return <SetupWizard apiUrl={apiUrl} />

  // Sin token → pantalla de login
  if (!token) return <LoginView apiUrl={apiUrl} apiKey={apiKey} />

  // Token existe PERO aún no fue verificado por el backend → spinner
  // Esto previene que una edición de localStorage muestre UI protegida aunque sea un flash
  if (!isVerified) return <Spinner label="Verificando sesión…" />

  // isVerified=true → el backend confirmó el rol. Renderizar según rol real.
  return (
    <>
      {role === 'client' && <ClientView apiUrl={apiUrl} apiKey={apiKey} />}
      {role === 'agent'  && <AgentView  apiUrl={apiUrl} apiKey={apiKey} />}
      {role === 'admin'  && <AdminView  apiUrl={apiUrl} apiKey={apiKey} />}
    </>
  )
}
```

> Si alguien edita el store de Zustand en DevTools para cambiar `role` a `"admin"`,
> la próxima request de datos que haga `AdminView` recibirá `403 FORBIDDEN` del backend
> y el componente mostrará el estado de error — no datos reales de otro rol.

---

#### Cliente HTTP centralizado — interceptor de errores de auth

Todo fetch pasa por un único cliente. Los errores `401` y `403` se manejan globalmente:

```typescript
// lib/api.ts

import { useAuthStore } from '../store/authStore'

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState()

  const response = await fetch(`${VITE_API_URL}${path}`, {
    ...options,
    credentials: 'include',   // necesario para enviar cookie de refresh cross-origin
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}))

    if (body?.error?.code === 'AUTH_TOKEN_EXPIRED') {
      // Intentar refresh silencioso
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Reintentar la request original con el nuevo token
        return request<T>(path, options)
      }
    }
    // Token inválido o refresh fallido → limpiar sesión
    useAuthStore.getState().clearSession()
    throw new ApiError('AUTH_TOKEN_INVALID', 401)
  }

  if (response.status === 403) {
    const body = await response.json().catch(() => ({}))
    // No limpiar sesión — el usuario existe pero no tiene permiso para esto
    throw new ApiError(body?.error?.code ?? 'FORBIDDEN', 403)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body?.error?.code ?? 'INTERNAL_ERROR', response.status)
  }

  return response.json()
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${VITE_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',  // envía cookie HttpOnly de refresh token
    })
    if (!res.ok) return false
    const data = await res.json()
    const store = useAuthStore.getState()
    // setSession con isVerified=false → useSessionVerifier lo verificará de nuevo
    store.setSession(data.access_token, store.role, store.userId!, store.projectId!)
    store.setVerified()  // el refresh implica que el backend ya validó
    return true
  } catch {
    return false
  }
}

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code)
  }
}

export const apiClient = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
}
```

---

#### Componentes con datos protegidos — manejo de 403

Cada componente que carga datos de rol elevado debe manejar el `403` explícitamente:

```typescript
// organisms/AdminView/UserList.tsx

import { useEffect, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/api'
import { ForbiddenPlaceholder } from '../../molecules/ForbiddenPlaceholder'
import { ErrorPlaceholder } from '../../molecules/ErrorPlaceholder'

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<User[]>('/api/v1/users')
      .then(setUsers)
      .catch((err: ApiError) => {
        if (err.status === 403) {
          // El usuario intentó acceder sin permisos reales (ej: manipuló el rol localmente)
          // No mostrar datos, mostrar UI de "acceso denegado"
          setError('FORBIDDEN')
        } else {
          setError(err.code)
        }
      })
  }, [])

  if (error === 'FORBIDDEN') return <ForbiddenPlaceholder />
  if (error) return <ErrorPlaceholder code={error} />
  return <>{/* lista de usuarios */}</>
}
```

```typescript
// molecules/ForbiddenPlaceholder.tsx — UI cuando el backend niega acceso

import { ShieldOff } from 'lucide-react'

export function ForbiddenPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <ShieldOff size={32} strokeWidth={1.5} className="text-[var(--color-warning)]" />
      <p className="text-sm text-[var(--color-text-secondary)]">
        No tienes permiso para ver este contenido.
      </p>
    </div>
  )
}
```

---

#### Qué NO guardar en localStorage / sessionStorage

```typescript
// ❌ NUNCA guardar en localStorage — persiste entre sesiones, accesible por JS
localStorage.setItem('access_token', token)   // cualquier script puede leerlo
localStorage.setItem('role', 'admin')          // modificable trivialmente en DevTools

// ✅ Access token: memoria del proceso (Zustand sin persistencia)
// El store se pierde al cerrar la pestaña — el usuario hace login de nuevo.
// Esto es intencional: tokens de 15min + refresh cookie HttpOnly.

// ✅ Si se necesita persistir sesión entre recargas de página:
// Usar SOLO el refresh token en cookie HttpOnly (lo gestiona el servidor).
// Al recargar: detectar que no hay token en Zustand → llamar /auth/refresh
// con la cookie → obtener nuevo access_token.
```

```typescript
// hooks/useAutoRefreshOnMount.ts — recuperar sesión al recargar sin localStorage

import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../lib/api'

export function useAutoRefreshOnMount() {
  const { token, setSession, setVerified } = useAuthStore()

  useEffect(() => {
    if (token) return  // ya hay sesión activa

    // Intentar refresh silencioso con la cookie HttpOnly al montar
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setSession(data.access_token, data.role, data.user_id, data.project_id)
        setVerified()
      })
      .catch(() => {
        // No hay cookie válida — mostrar login. Comportamiento normal.
      })
  }, [])
}
```

---

#### Socket.IO — seguridad ante desconexiones y eventos no autorizados

```typescript
// hooks/useSocket.ts — manejo de errores de auth en socket

globalSocket.on('connect_error', (err) => {
  // Si el error contiene código de auth → limpiar sesión
  try {
    const data = JSON.parse(err.message)
    if (['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED', 'FORBIDDEN'].includes(data.code)) {
      useAuthStore.getState().clearSession()
    }
  } catch {
    // Error de red — no limpiar sesión, dejar que reconnect lo intente
  }
})

globalSocket.on('error', (err: { code: string }) => {
  if (err.code === 'AUTH_TOKEN_EXPIRED') {
    // Intentar refresh y reconectar
    tryRefreshToken().then((ok) => {
      if (ok) {
        globalSocket?.disconnect()
        globalSocket = null  // forzar reconexión con nuevo token
      } else {
        useAuthStore.getState().clearSession()
      }
    })
  }
})
```

---

#### Resumen de la cadena de confianza

```
Usuario edita DevTools / localStorage
          │
          ▼
Zustand store (en memoria — no persistido)
  role="admin" editado manualmente
          │
          ▼
WidgetShell: isVerified=false → muestra Spinner
  (isVerified solo es true después de /auth/me exitoso)
          │
          ▼
/auth/me con el token (posiblemente falso/manipulado)
          │
    ┌─────┴─────┐
  200 OK       401/403
    │              │
  setVerified()  clearSession()
  render UI      render LoginView
  con rol real   (vuelta a cero)
```

> El JWT está **firmado con HMAC-SHA256**. Si alguien modifica cualquier byte del payload
> (incluyendo el `role`), la firma no coincide y el backend retorna `401 AUTH_TOKEN_INVALID`.
> El usuario no puede fabricar un rol diferente sin la `SECRET_KEY` del servidor.

---

### 4.12 Mobile First — Reglas Críticas

El widget y el dashboard deben verse y funcionar **perfectamente en mobile**. Mobile no es una adaptación — es la experiencia base.

**Breakpoints:**

```
Mobile   (default)   < 640px  — widget full screen al abrir, sin sidebar
Tablet   (sm:)       640px+   — sidebar colapsable como drawer
Desktop  (lg:)       1024px+  — sidebar fija + panel expandible visible
Wide     (xl:)       1280px+  — panel de órdenes a 3 columnas
```

**Reglas obligatorias para mobile:**

```tsx
// ✅ Widget abierto en mobile — ocupa pantalla completa
// En mobile NO hay panel flotante — es full screen con fixed positioning
<div className="
  fixed inset-0          /* mobile: full screen */
  lg:fixed lg:bottom-6 lg:right-6 lg:inset-auto lg:w-96 lg:h-[600px]
  /* iOS: usar dvh en lugar de vh */
">
```

```css
/* ✅ Altura correcta en mobile (iOS Safari) */
.widget-mobile-open {
  height: 100vh;      /* fallback */
  height: 100dvh;     /* iOS 15.4+ — dynamic viewport height */
}
```

```tsx
// ✅ Input del chat — mínimo 16px para evitar auto-zoom en iOS
<input
  className="text-base ..."  /* text-base = 16px. NUNCA text-sm (14px) en inputs */
  type="text"
/>
```

```tsx
// ✅ Touch targets — mínimo 44x44px en mobile (Apple HIG)
<button className="min-h-11 min-w-11 ...">  {/* 44px = h-11 */}
```

**Gestos mobile esperados:**
- Swipe down para minimizar el widget cuando está full screen
- Scroll horizontal en el board de órdenes (columnas de estado)
- Bottom sheet con drag handle visible para el panel expandible

---

## 5. Flujo de Comunicación Completo

```
[Next.js - Vercel]
     │
     │  HTTPS REST (auth, tickets, orders, users)
     │  WSS WebSocket (Socket.IO — chat, typing, realtime orders)
     ▼
[Cloudflare]
     │ Solo IPs Cloudflare en NSG
     ▼
[Nginx - VPS]
     │ proxy_pass + WebSocket upgrade headers
     ▼
[Gunicorn 1w UvicornWorker - port 8001]
     │
     ▼
[FastAPI + python-socketio (AsyncServer, async_mode=asgi)]
     │
     ├── REST endpoints: /api/v1/auth, /users, /tickets, /orders
     └── Socket.IO events: connect, disconnect, chat_message, typing, order_update
     │
     ▼
[SQLite WAL — /home/opc/projects/suportum/data/suportum.db]
```

---

## 6. Eventos Socket.IO — Contrato Backend/Frontend

### Cliente → Servidor

| Evento | Payload | Descripción |
|---|---|---|
| `join_room` | `{ room_id }` | Unirse a sala (general, direct, ticket) |
| `leave_room` | `{ room_id }` | Salir de sala |
| `chat_message` | `{ room_id, content }` | Enviar mensaje |
| `typing_start` | `{ room_id }` | Indicador de escritura |
| `typing_stop` | `{ room_id }` | Fin de escritura |
| `open_direct` | `{ target_user_id }` | Solicitar/abrir chat directo |
| `order_update` | `{ order_id, status }` | Cambiar estado de orden (agent/admin) |

### Servidor → Cliente

| Evento | Payload | Descripción |
|---|---|---|
| `chat_message` | `{ id, room_id, sender, content, created_at }` | Nuevo mensaje en sala |
| `typing` | `{ room_id, username, active }` | Estado de escritura |
| `room_opened` | `{ room_id, participants }` | Nuevo chat directo creado |
| `order_updated` | `{ order }` | Actualización en board de órdenes |
| `ticket_updated` | `{ ticket }` | Cambio en ticket |
| `error` | `{ code, message }` | Error de operación |

---

## 7. Fases de Desarrollo

| Fase | Alcance | Sub-plan |
|---|---|---|
| **F01 — Foundation** | Setup VPS backend, schema DB, auth JWT, health check | `f01-foundation.md` |
| **F02 — Chat Core** | Chat general, chat directo, Socket.IO, typing indicators | `f02-chat-core.md` |
| **F03 — Tickets** | CRUD tickets, asignación de agentes, estados | `f03-tickets.md` |
| **F04 — Orders** | CRUD órdenes, board expandible, estado en tiempo real | `f04-orders.md` |
| **F05 — Users** | Gestión de usuarios, roles, invitaciones | `f05-users.md` |
| **F06 — Themes** | ThemeProvider, temas configurables, persistencia | `f06-themes.md` |
| **F07 — Polish** | Mobile UX final, accesibilidad, performance audit | `f07-polish.md` |

---

## 8. Desarrollo Local — Windows

> **Objetivo**: poder probar backend y frontend en vivo desde Windows con el mínimo de fricción.
> Sin Docker, sin servicios externos. Cambiar sólo las variables de entorno para pasar de local a producción.

### ¿Por qué no se necesita Docker?

- **SQLite** es un archivo en disco — no hay servidor de base de datos que levantar.
- **Python + uvicorn** corre nativamente en Windows con `--reload`.
- **pnpm dev** (Vite) corre nativamente en Windows.
- No hay Redis, no hay colas, no hay servicios adicionales.
- La única diferencia local ↔ producción son las URLs en `.env`.

---

### Prerrequisitos (instalar una sola vez)

```powershell
# Python 3.11+ (descargar de python.org — elegir "Add to PATH")
python --version   # debe mostrar 3.11+

# Node.js LTS (descargar de nodejs.org)
node --version

# pnpm (gestor de paquetes)
npm install -g pnpm
pnpm --version
```

---

### Setup Backend (primera vez)

```powershell
# Desde la raíz del proyecto backend (backend/ o suportum-api/)
cd backend

# 1. Crear entorno virtual
python -m venv .venv

# 2. Activar (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# 3. Instalar dependencias (sin versiones — pip resuelve la última estable)
pip install fastapi[standard] python-socketio aiosqlite python-jose passlib gunicorn uvicorn

# 4. Copiar y completar el archivo de entorno
Copy-Item .env.example .env
# Editar .env con tu editor — cambiar SECRET_KEY por un valor aleatorio

# 5. Generar requirements.txt (DESPUÉS de instalar, no antes)
pip freeze > requirements.txt
```

### Correr el Backend en local

```powershell
# Con entorno virtual activo
.\.venv\Scripts\Activate.ps1

uvicorn app.main:socket_app --reload --port 8001
# → API disponible en http://localhost:8001
# → Docs en     http://localhost:8001/docs
# → Health en   http://localhost:8001/health
```

---

### Setup Frontend (primera vez)

```powershell
# Desde la raíz del monorepo frontend
cd suportum-chat   # o donde esté el monorepo

# 1. Instalar dependencias del workspace
pnpm install

# 2. Copiar y completar el archivo de entorno del demo
Copy-Item apps\demo\.env.example apps\demo\.env
# .env local ya tiene: VITE_API_URL=http://localhost:8001
# No hay que cambiar nada para desarrollo local
```

### Correr el Frontend en local

```powershell
# Dev server del demo (Vite, hot reload)
pnpm --filter demo dev
# → Widget disponible en http://localhost:5173

# O desde apps/demo directamente:
cd apps\demo
pnpm dev
```

---

### Archivos de entorno — Regla de dos archivos

| Archivo | Se sube al repo | Propósito |
|---|---|---|
| `.env.example` | ✅ Sí | Plantilla con variables en blanco. Referencia para developers y agentes. |
| `.env` | ❌ No (gitignore) | Valores reales — local o producción. Nunca exponer. |

**Nunca crear** `.env.local`, `.env.development`, `.env.production` ni archivos adicionales.

```
backend/
  .env.example   ← en repo (valores en blanco)
  .env           ← gitignored (valores reales)

suportum-chat/
  apps/demo/
    .env.example ← en repo
    .env         ← gitignored
```

---

### Cambiar de local a producción

Solo editar `.env` — el código no cambia:

```env
# .env local
VITE_API_URL=http://localhost:8001
VITE_SOCKET_URL=http://localhost:8001
```

```env
# .env producción
VITE_API_URL=https://chat.azanolabs.com
VITE_SOCKET_URL=https://chat.azanolabs.com
```

**Backend producción**: `https://chat.azanolabs.com` (VPS Oracle Cloud, puerto 8001 detrás de Nginx + Cloudflare)

---

### Flujo de trabajo típico en desarrollo

```
Terminal 1 (backend):
  cd backend && .\.venv\Scripts\Activate.ps1
  uvicorn app.main:socket_app --reload --port 8001

Terminal 2 (frontend):
  cd suportum-chat && pnpm --filter demo dev

Browser: http://localhost:5173
  → Widget carga, se conecta al backend en localhost:8001
  → Hot reload en frontend (Vite) + auto-reload en backend (uvicorn)
```

---

### .gitignore — entradas obligatorias

```gitignore
# Entornos
.env
**/.env

# Python
.venv/
__pycache__/
*.pyc
*.db
*.db-wal
*.db-shm
data/

# Uploads de imágenes (generados en runtime — no versionar)
uploads/

# Node
node_modules/
dist/
.turbo/
```

---



> **Esta sección es para agentes de IA que lean este documento.**
> El proyecto se construye usando un modelo de Harness Architecture con agentes especializados.

### Modelo de Harness

El desarrollo sigue el patrón **Orchestrer → Implementer → Reviewer**:

| Agente | Rol | Cuándo actúa |
|--------|-----|--------------|
| **Orchestrer** | Líder de sesión. Lee el plan, identifica la próxima feature, escribe el plan de sesión, delega y coordina. **No escribe código de producción.** | Al inicio de cada sesión |
| **Implementer** | Escribe el código de la feature completa. Reporta DONE / NEEDS_CONTEXT / BLOCKED. **No se autoaprueba.** | Invocado por el Orchestrer |
| **Reviewer** | Valida checkpoints. Reporta APPROVED / REJECTED con issues precisos. **No edita código.** | Invocado después del Implementer |

### Arquitectura Agnóstica — Dos CLIs soportados

El proyecto tiene configuración agentica para **dos CLIs** simultáneamente:

| CLI | Config principal | Agentes |
|-----|-----------------|---------|
| **Claude CLI** (`claude`) | `CLAUDE.md` (raíz) | `.claude/agents/orchestrer.md`, `implementer.md`, `reviewer.md` |
| **GitHub Copilot** (`gh copilot`) | `.github/copilot-instructions.md` | `.github/agents/orchestrer.md`, `implementer.md`, `reviewer.md` |

Los agentes de ambos CLIs tienen el **mismo comportamiento** — solo difieren en el formato del frontmatter YAML (Claude Code usa `tools:`, Copilot lo ignora pero lee el resto).

### Archivos del Harness

```
suportum-chat/
├── CLAUDE.md                          # Instrucciones raíz para Claude CLI (Orchestrer role)
├── .claude/
│   ├── AGENTS.md                      # Mapa del proyecto — leer primero en cada sesión
│   ├── CHECKPOINTS.md                 # Criterios de done por feature — el Reviewer lo usa siempre
│   ├── feature_list.json              # Estado machine-readable de features
│   ├── init.ps1                       # Verificación del harness antes de iniciar sesión
│   ├── agents/
│   │   ├── orchestrer.md              # Sub-agente orchestrer (Claude Code)
│   │   ├── implementer.md             # Sub-agente implementer (Claude Code)
│   │   └── reviewer.md                # Sub-agente reviewer (Claude Code)
│   └── progress/
│       ├── current.md                 # Plan vivo de sesión activa
│       └── history.md                 # Bitácora append-only
├── .github/
│   ├── copilot-instructions.md        # Instrucciones globales para GitHub Copilot
│   └── agents/
│       ├── orchestrer.md              # Agente orchestrer (GitHub Copilot)
│       ├── implementer.md             # Agente implementer (GitHub Copilot)
│       └── reviewer.md                # Agente reviewer (GitHub Copilot)
└── features/
    ├── fundation-suportum-plan.md    # Este archivo — plan madre
    ├── f01-foundation.md              # Sub-plan F01 (crear cuando se inicie F01)
    ├── f02-chat-core.md               # Sub-plan F02 (crear cuando se inicie F02)
    └── ...
```

### Protocolo de Inicio de Sesión

**Claude CLI:**
```bash
# En la raíz del proyecto
claude  # El modelo lee CLAUDE.md automáticamente y asume el rol de Orchestrer
```

**GitHub Copilot:**
```bash
gh copilot suggest  # Lee .github/copilot-instructions.md
# Para invocar un agente específico: usar el task tool con el agente deseado
```

**Primer paso siempre:**
```powershell
.\.claude\init.ps1   # Verifica estado del harness y muestra próxima feature
```

### Flujo Completo

```
Orchestrer
  ├─→ Lee AGENTS.md + plan maestro + feature_list.json
  ├─→ Escribe plan en .claude/progress/current.md
  ├─→ Invoca Implementer
  │       └─→ Implementer implementa + escribe .claude/progress/impl_f0X.md
  ├─→ Invoca Reviewer
  │       └─→ Reviewer valida + escribe .claude/progress/review_f0X.md
  ├─→ Si APPROVED → actualiza feature_list.json, limpia current.md, append history.md
  └─→ Si REJECTED → re-invoca Implementer con el reporte del Reviewer
```

### Reglas Absolutas del Harness

1. **Una feature a la vez.** `init.ps1` alerta si hay múltiples `in_progress`.
2. **El Implementer no se autoaprueba.** Siempre pasa por el Reviewer.
3. **El Reviewer no edita código.** Solo reporta.
4. **Estado en disco.** Todo en `.claude/progress/`, no en el chat.
5. **Sub-planes antes de implementar.** El Orchestrer debe crear `features/f0X-<nombre>.md` antes de invocar el Implementer si el sub-plan no existe aún.


| Opción | Razón de descarte |
|---|---|
| Docker / containers | VPS con recursos limitados; añade overhead innecesario sin aportar aislamiento real cuando hay 1 proceso por servicio |
| Redis | Servicio adicional que consume RAM constante; innecesario con 1 worker (el estado en memoria es suficiente) |
| Node.js / Express | El VPS ya tiene el stack Python consolidado; añadir un runtime adicional complica ops |
| Turso (libSQL remoto) | Latencia de red añadida para un servicio que corre en el mismo servidor; SQLite local es más rápido |
| PostgreSQL | Overhead significativo para la escala esperada; SQLite WAL cubre el caso de uso |
| MongoDB | Sin ventaja para este modelo de datos relacional |
| shadcn/ui o MUI | Limitan el control del sistema de diseño; la UX futurista requiere componentes propios |
| Vite + React SPA separada | Sin capacidad de publicarse como paquete npm embebible |
| Next.js app separada para dashboard | El widget ya contiene todo via role-based UI; una app separada duplica código sin beneficio |
