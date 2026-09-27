# Impl: f01_chat — Chat Core Backend

## Estado: DONE

## Archivos Creados/Modificados

- `app/sockets/rooms.py` (CREADO) — validate_room_access con logica por tipo de room
- `app/sockets/events.py` (CREADO) — todos los handlers Socket.IO con namespace="*"
- `app/api/v1/messages.py` (CREADO) — endpoint REST GET /messages/{room_id}
- `app/api/v1/router.py` (MODIFICADO) — se agrego el messages router
- `app/main.py` (MODIFICADO) — se agrego import de app.sockets.events

## Checkpoints Implementados

- [x] rooms.py: validate_room_access cubre general, direct:{a}:{b}, ticket:{tid}, orders:board y fallback False
- [x] on_connect: valida auth/token presente, busca proyecto por api_key, decodifica JWT, verifica project_id == namespace project_id, guarda session con rooms=["general"], auto-join a "general"
- [x] on_connect: retorna False para rechazar conexion, emite error antes de retornar
- [x] on_disconnect: emite typing active=False a todos los rooms activos del usuario
- [x] on_room_join: valida acceso, enter_room, actualiza session["rooms"], envia historial solo al sid
- [x] on_room_leave: leave_room, actualiza session["rooms"]
- [x] on_message_send: rate limit (30/60s), valida content_type, valida len <= 4000, valida acceso, INSERT en messages, fetch created_at real de DB, emit message:new al room completo
- [x] on_typing_start / on_typing_stop: skip_sid=sid para no emitir al sender
- [x] on_direct_open: solo agents/admins, room_id canonico con min/max, emit room:opened al room
- [x] GET /messages/{room_id}: JWT requerido via get_scoped_project, limit <= 100, validate_room_access, query con before opcional, retorna cronologico ascendente
- [x] router.py: messages router registrado
- [x] main.py: import app.sockets.events despues de from app.sockets.server import sio
- [x] Verificacion: python -c "from app.main import socket_app; print(42)" → 42 (sin errores)

## Decisiones de implementacion no obvias

1. `decode_token` lanza HTTPException (no excepciones propias de jose). Se captura con `except Exception` en on_connect para evitar que una excepcion de FastAPI burbujee en el contexto de Socket.IO.

2. `_fetch_username` y `_fetch_history` usan `db: object` como tipo en lugar de `aiosqlite.Connection` porque get_db() retorna la conexion directamente y el tipo correcto ya esta en el modulo. Se usa anotacion generica para evitar importacion circular potencial. No hay impacto funcional.

3. `direct:open` hace enter_room al initiator en el servidor, pero el target solo recibira el evento "room:opened" si ya esta en el room (o si otro proceso lo agrega). El spec indica emitir al room, no buscar el sid del target — esto es correcto: el target recibe el evento si esta en el room, y si no lo esta, lo recibira cuando haga join.

4. Session["rooms"] se inicializa con ["general"] en on_connect, ya que el auto-join a general se hace siempre. Esto garantiza que on_disconnect emite typing stop a general tambien.

5. SQL sin f-strings en todos los casos: solo parametros posicionales ?.

6. No se usa `X | Y` en ninguna type hint. Todo usa `Optional[X]` de typing. Sin match statements. Compatible con Python 3.9.
