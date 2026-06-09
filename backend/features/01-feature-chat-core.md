# 01 — Chat Core Backend

## 1. Objetivo
Implementar el sistema de mensajería en tiempo real: Socket.IO con namespace por proyecto,
rooms (general, direct, ticket), persistencia de mensajes en SQLite, typing indicators,
e historial de mensajes via REST.

## 2. Eventos Socket.IO

### Cliente → Servidor
| Evento | Payload | Validación |
|---|---|---|
| `connect` | `auth: { token }` en handshake | Validar JWT + project activo |
| `room:join` | `{ room_id }` | Validar pertenencia al room |
| `room:leave` | `{ room_id }` | Verificar que está en el room |
| `message:send` | `{ room_id, content, content_type? }` | Rate limit 30msg/60s por user |
| `typing:start` | `{ room_id }` | Usuario en el room |
| `typing:stop` | `{ room_id }` | Usuario en el room |
| `direct:open` | `{ target_user_id }` | Solo agents/admins pueden iniciar |

### Servidor → Cliente
| Evento | Payload |
|---|---|
| `message:new` | `{ id, room_id, sender_id, sender_username, content, content_type, created_at, attachment? }` |
| `typing` | `{ room_id, username, active: bool }` |
| `room:opened` | `{ room_id, participants }` |
| `error` | `{ code, message }` |

## 3. Módulos a implementar

### 3.1 `app/sockets/events.py`
```python
@sio.on("connect", namespace="*")
async def on_connect(sid, environ, auth, namespace):
    # 1. Extraer api_key del namespace
    # 2. Buscar proyecto activo
    # 3. Validar JWT del auth.token con expected_project_id
    # 4. save_session({ user_id, project_id, role, namespace })
    # 5. Auto-join a "general" room del proyecto

@sio.on("disconnect", namespace="*")
async def on_disconnect(sid, namespace):
    # Emitir typing:stop a todos sus rooms activos

@sio.on("room:join", namespace="*")
async def on_room_join(sid, data, namespace):
    # Validar acceso al room según rol
    # sio.enter_room(sid, room_id, namespace)
    # Enviar historial (últimos 50 mensajes)

@sio.on("message:send", namespace="*")
async def on_message(sid, data, namespace):
    # Rate limit: 30msg/60s por user_id
    # Validar content_type in ('text', 'image', 'text+image')
    # Validar len(content) <= 4000
    # INSERT en messages con project_id
    # emit "message:new" a todos en el room

@sio.on("typing:start", namespace="*")
async def on_typing_start(sid, data, namespace):
    # emit "typing" { active: True } al room excepto al sender

@sio.on("typing:stop", namespace="*")
async def on_typing_stop(sid, data, namespace):
    # emit "typing" { active: False } al room excepto al sender

@sio.on("direct:open", namespace="*")
async def on_direct_open(sid, data, namespace):
    # Solo agents/admins pueden iniciar
    # Construir room_id canónico: direct:{min(uid_a,uid_b)}:{max(uid_a,uid_b)}
    # enter_room a ambos participantes si están conectados
    # emit "room:opened" a ambos
```

### 3.2 `app/sockets/rooms.py`
- `validate_room_access(project_id, user_id, role, room_id)` → bool
  - `general` → cualquier rol del proyecto
  - `direct:{a}:{b}` → solo si el user_id es `a` o `b`, o es admin
  - `ticket:{tid}` → verificar que el ticket pertenece al proyecto y el user tiene acceso
  - `orders:board` → solo agents/admins

### 3.3 `app/api/v1/messages.py` (REST)
- `GET /messages/{room_id}?before=<timestamp>&limit=50` → historial paginado
  - Siempre filtrar `project_id` del JWT
  - Validar acceso al room igual que en Socket.IO

## 4. Persistencia de Mensajes

```python
async def save_message(db, project_id, room_id, sender_id, content, content_type):
    msg_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO messages (id, project_id, room_id, sender_id, content, content_type) VALUES (?,?,?,?,?,?)",
        (msg_id, project_id, room_id, sender_id, content, content_type)
    )
    await db.commit()
    return msg_id
```

## 5. Historial al hacer join
Al entrar a un room se envían los últimos 50 mensajes al socket que hace join (no a todo el room):
```python
messages = await db.fetchall(
    "SELECT m.*, u.username FROM messages m JOIN users u ON m.sender_id = u.id "
    "WHERE m.project_id = ? AND m.room_id = ? ORDER BY m.created_at DESC LIMIT 50",
    (project_id, room_id)
)
await sio.emit("message:history", { "room_id": room_id, "messages": messages[::-1] }, to=sid)
```

## 6. Seguridad

### 6.1 Aislamiento
- `on_connect` valida `namespace (api_key)` → `project_id` → `JWT project_id` match
- Toda query incluye `WHERE project_id = ?`
- Un user no puede join a rooms de otro proyecto aunque conozca el room_id

### 6.2 Rate Limiting
- Mensajes: `check_rate_limit(f"msg:{user_id}", 30, 60)`
- Typing events: sin rate limit (bajo costo) pero throttle en cliente

### 6.3 Sanitización
- `content` se guarda raw (sin HTML) — el frontend es responsable de renderizar texto plano
- No se ejecuta ningún contenido del mensaje
- Longitud máxima: 4000 caracteres → `MESSAGE_TOO_LONG`

## 7. Desarrollo — Pasos

1. Implementar `app/sockets/rooms.py` con `validate_room_access`
2. Implementar `app/sockets/events.py` (comenzar por `connect/disconnect`)
3. Registrar los event handlers en `server.py` o via import en `main.py`
4. Implementar `app/api/v1/messages.py` (historial REST)
5. Registrar router en `app/api/v1/router.py`
6. Probar con cliente de prueba (wscat o el frontend demo):
   - Conectar con token válido al namespace del proyecto
   - Enviar mensaje → verificar persiste en DB y llega al room
   - Abrir 2 conexiones → verificar que ambas reciben el mensaje
   - Verificar typing indicator entre 2 clientes
   - Probar direct:open entre agent y client

## 8. Auditoría y Revisión de Errores

### 8.1 Checklist de Seguridad
- [ ] `on_connect` rechaza si api_key no existe o proyecto inactivo
- [ ] `on_connect` rechaza si JWT project_id != namespace project_id
- [ ] `validate_room_access` impide acceso cross-project
- [ ] Rate limit activo en `message:send`
- [ ] Historial REST filtra siempre por `project_id` del JWT
- [ ] No se ejecuta ningún contenido del mensaje en el servidor

### 8.2 Checklist de Funcionalidad
- [ ] 2 clientes del mismo proyecto/room se reciben mensajes mutuamente
- [ ] Cliente de proyecto B NO recibe mensajes del proyecto A
- [ ] Historial al hacer join llega solo al socket que hace join
- [ ] Typing indicator llega a todos en el room excepto al sender
- [ ] `direct:open` crea room canónico (min/max para evitar duplicados)
- [ ] Mensajes persisten en SQLite con project_id correcto
- [ ] Desconexión limpia: typing se para automáticamente

### 8.3 Errores Comunes
- `ConnectionRefusedError` en connect → revisar que el api_key del namespace es válido
- Mensajes duplicados → verificar que no se hace join al room más de una vez
- Historial desordenado → `ORDER BY created_at DESC LIMIT 50` → invertir antes de emitir
- `FORBIDDEN_ROOM` al hacer join a direct → verificar lógica de `validate_room_access`

## 9. Criterios de Aprobación (Done)
- [ ] 2 usuarios conectados al mismo room se reciben mensajes en tiempo real
- [ ] Mensajes persisten en DB con project_id y room_id correctos
- [ ] Typing indicators funcionan entre 2 clientes
- [ ] Historial de 50 mensajes llega al hacer room:join
- [ ] Rate limit: el mensaje 31 en 60s es rechazado con RATE_LIMITED
- [ ] Proyecto B no puede conectarse con token de proyecto A
- [ ] Reviewer confirma APPROVED
