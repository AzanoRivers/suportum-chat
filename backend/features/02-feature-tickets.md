# 02 — Tickets Backend

## 1. Objetivo
CRUD completo de tickets: creación por clientes, asignación a agentes, máquina de estados,
historial de cambios via Socket.IO, y permisos por rol.

## 2. Máquina de Estados

```
open → in_progress → resolved → closed
 └──────────────────────────────→ closed  (cancelación directa)
```

| Transición | Quién puede hacerla |
|---|---|
| `open` → `in_progress` | agent, admin |
| `in_progress` → `resolved` | agent, admin |
| `resolved` → `closed` | client (confirmar resolución), admin |
| `* → closed` | admin |

## 3. Endpoints REST (`app/api/v1/tickets.py`)

```
POST   /tickets                    # client crea ticket; agent/admin también puede
GET    /tickets                    # list: admin ve todos; agent ve sus asignados; client ve los suyos
GET    /tickets/{id}               # client: solo los suyos; agent: solo asignados o sin asignar; admin: todos
PATCH  /tickets/{id}               # cambiar status, priority, agent_id
DELETE /tickets/{id}               # solo admin
```

### Body de creación
```json
{ "title": "string", "description": "string?", "priority": "low|normal|high|urgent" }
```

### Body de PATCH
```json
{ "status": "...", "priority": "...", "agent_id": "..." }
```
Cada campo es opcional. Validar transición de estado antes de actualizar.

## 4. Socket.IO — Notificaciones
Al cambiar estado o asignar agente, emitir a los rooms relevantes:
```python
await sio.emit(
    "ticket:updated",
    { "ticket": ticket_dict },
    room=f"ticket:{ticket_id}",
    namespace=f"/{api_key}"
)
# También notificar en orders:board si agents/admins están ahí
await sio.emit("ticket:updated", { "ticket": ticket_dict }, room="orders:board", namespace=f"/{api_key}")
```

## 5. Queries — Siempre con project_id

```python
# Crear
await db.execute(
    "INSERT INTO tickets (id, project_id, title, description, priority, client_id) VALUES (?,?,?,?,?,?)",
    (ticket_id, project_id, title, description, priority, user_id)
)

# Listar (agent solo ve sus asignados o sin asignar)
query = "SELECT t.*, u_client.username as client_name, u_agent.username as agent_name "
        "FROM tickets t "
        "LEFT JOIN users u_client ON t.client_id = u_client.id "
        "LEFT JOIN users u_agent ON t.agent_id = u_agent.id "
        "WHERE t.project_id = ?"
params = [project_id]
if role == "agent":
    query += " AND (t.agent_id = ? OR t.agent_id IS NULL)"
    params.append(user_id)
elif role == "client":
    query += " AND t.client_id = ?"
    params.append(user_id)

# Get by id — SIEMPRE doble filtro
ticket = await db.fetchone(
    "SELECT * FROM tickets WHERE id = ? AND project_id = ?",
    (ticket_id, project_id)
)
```

## 6. Validaciones de Negocio

- `title` requerido, max 200 chars
- `priority` solo `low|normal|high|urgent`
- `status` solo `open|in_progress|resolved|closed`
- Validar transición de estado válida según máquina de estados
- `agent_id`: solo agents/admins pueden asignarse a sí mismos o a otros agents (si son admin)
- Un client NO puede cambiar `agent_id` ni `status` a `in_progress`

## 7. Seguridad

- [ ] `get_scoped_project()` en todos los endpoints
- [ ] Client solo lee sus propios tickets (`client_id = user_id`)
- [ ] Agent solo lee tickets asignados a él o sin asignar
- [ ] Transiciones de estado válidas — rechazar con `400 INVALID_TRANSITION`
- [ ] Doble filtro en GET `/{id}`: `id + project_id`
- [ ] Antes de asignar `agent_id`, verificar que el usuario existe y pertenece al proyecto con role `agent`

## 8. Desarrollo — Pasos

1. Implementar `app/api/v1/tickets.py` con los 5 endpoints
2. Añadir transición de estado como función helper `validate_transition(current, new)`
3. Registrar router en `router.py`
4. Probar flujo completo:
   - Client crea ticket → aparece en lista de agent
   - Agent cambia status → client recibe `ticket:updated` via Socket.IO
   - Admin puede ver todos y hacer cualquier transición
5. Verificar que client no ve tickets de otros clientes del mismo proyecto

## 9. Auditoría y Revisión de Errores

### 9.1 Checklist de Seguridad
- [ ] Client no puede ver tickets de otro client
- [ ] Agent no puede ver tickets de otros agents sin asignar que no le correspondan
- [ ] Transición inválida retorna `400`, no `500`
- [ ] `DELETE /tickets/{id}` solo funciona para admin

### 9.2 Checklist de Funcionalidad
- [ ] Client crea → agent ve en lista → asigna → status cambia → client notificado
- [ ] Paginación funciona (si se implementa `?page=&limit=`)
- [ ] Filtros de status funcionan (`?status=open`)
- [ ] Socket.IO emite `ticket:updated` correctamente al room y al board

### 9.3 Errores Comunes
- Ticket no encontrado retorna `404`, no `403` (no revelar que existe para otro proyecto)
- Al cambiar `agent_id` verificar que el nuevo agent pertenece al mismo `project_id`

## 10. Criterios de Aprobación (Done)
- [ ] Flujo completo: client crea → agent asigna → status progresa hasta `closed`
- [ ] Aislamiento: client A no ve tickets de client B en el mismo proyecto
- [ ] Socket.IO: `ticket:updated` llega a room `ticket:{id}` y `orders:board`
- [ ] Transición inválida retorna error semántico, no 500
- [ ] Reviewer confirma APPROVED
