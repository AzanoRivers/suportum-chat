# 03 — Orders Backend

## 1. Objetivo
CRUD de órdenes con máquina de estados, board en tiempo real via Socket.IO,
y schema de `details` flexible (JSON) para que cada proyecto defina su propio modelo de orden.

## 2. Máquina de Estados

```
pending → active → taken → completed
   └──────────────────────→ cancelled  (cualquier estado excepto completed)
```

| Estado | Descripción | Quién transiciona |
|---|---|---|
| `pending` | Orden creada, esperando atención | (inicial al crear) |
| `active` | Agente la vio y está trabajando | agent, admin |
| `taken` | Asignada a un agente específico | agent (se auto-asigna), admin |
| `completed` | Trabajo terminado | agent, admin |
| `cancelled` | Cancelada | client (solo sus órdenes), agent, admin |

## 3. Endpoints REST (`app/api/v1/orders.py`)

```
POST   /orders                         # client crea orden
GET    /orders                         # list con filtros de status
GET    /orders/{id}
PATCH  /orders/{id}                    # cambiar status, agent_id, details
DELETE /orders/{id}                    # solo admin
```

### Body de creación
```json
{
  "type": "string",             // tipo configurable por proyecto (ej: "boosting", "support")
  "title": "string",
  "details": {}                 // JSON libre — schema definido por el proyecto
}
```

### Filtros de listado
- `?status=pending,active` — múltiples separados por coma
- `?agent_id=me` — órdenes asignadas al usuario actual
- `?client_id=<uuid>` — solo admin/agent

## 4. Socket.IO — Board en Tiempo Real

Al crear o actualizar una orden, emitir al room `orders:board` del namespace del proyecto:
```python
await sio.emit(
    "order:updated",
    { "order": order_dict, "action": "created|updated" },
    room="orders:board",
    namespace=f"/{api_key}"
)
```

El frontend agents/admins hacen `room:join` a `orders:board` para recibir actualizaciones en vivo.
Los clients NO tienen acceso a `orders:board` — solo ven sus propias órdenes via REST.

## 5. Queries

```python
# Crear
await db.execute(
    "INSERT INTO orders (id, project_id, type, title, details, client_id) VALUES (?,?,?,?,?,?)",
    (order_id, project_id, type_, title, json.dumps(details), user_id)
)

# Listar por rol
base = "SELECT o.*, u_client.username as client_name, u_agent.username as agent_name " \
       "FROM orders o " \
       "LEFT JOIN users u_client ON o.client_id = u_client.id " \
       "LEFT JOIN users u_agent ON o.agent_id = u_agent.id " \
       "WHERE o.project_id = ?"
params = [project_id]

if role == "client":
    base += " AND o.client_id = ?"
    params.append(user_id)
# agent/admin ven todas — pueden filtrar con ?status=

# SIEMPRE doble filtro al buscar por id
order = await db.fetchone(
    "SELECT * FROM orders WHERE id = ? AND project_id = ?",
    (order_id, project_id)
)
```

## 6. `details` JSON
- Se almacena como TEXT en SQLite (JSON serializado)
- El servidor no valida el schema de `details` — es responsabilidad del cliente
- Se deserializa al leer: `json.loads(row["details"] or "{}")`
- Tamaño máximo: 50 KB (rechazar con `413` si excede)

## 7. Seguridad

- [ ] `get_scoped_project()` en todos los endpoints
- [ ] Client solo ve sus propias órdenes
- [ ] `orders:board` Socket.IO room: solo agents/admins pueden hacer join
- [ ] Transición `cancelled` por client: solo si `client_id == user_id`
- [ ] `agent_id` solo puede asignarse si el usuario tiene rol `agent` o `admin`
- [ ] Doble filtro `id + project_id` en todas las queries individuales

## 8. Desarrollo — Pasos

1. Implementar `app/api/v1/orders.py` con los 5 endpoints
2. Función helper `validate_order_transition(current, new, role, user_id, order)`
3. Deserializar `details` en cada respuesta (`json.loads`)
4. Emitir Socket.IO `order:updated` en create y patch
5. Registrar router en `router.py`
6. Probar board: 2 agents conectados a `orders:board` → crear orden → ambos ven `order:updated`
7. Probar que client no puede ver órdenes de otro client

## 9. Auditoría y Revisión de Errores

### 9.1 Checklist de Seguridad
- [ ] Client no accede a orders de otro client
- [ ] `orders:board` bloqueado para clients (FORBIDDEN_ROOM en validate_room_access)
- [ ] Transición inválida → `400`, no `500`
- [ ] `details` muy grande → `413`

### 9.2 Checklist de Funcionalidad
- [ ] Board en tiempo real: `order:updated` llega a agents conectados
- [ ] Filtros de status funcionan
- [ ] `details` se serializa/deserializa correctamente
- [ ] Agent puede auto-asignarse (`PATCH /orders/{id}` con `agent_id: "me"` o `agent_id: user_id`)

### 9.3 Errores Comunes
- `json.JSONDecodeError` al leer `details` de un row legacy → catch y retornar `{}`
- Socket.IO emit falla si el namespace no existe → validar que el proyecto está activo

## 10. Criterios de Aprobación (Done)
- [ ] Client crea orden → agent la ve en board en tiempo real
- [ ] Agent actualiza estado → todos en `orders:board` reciben `order:updated`
- [ ] Client no puede acceder a `orders:board`
- [ ] Máquina de estados rechaza transiciones inválidas
- [ ] `details` JSON round-trip correcto (guardar/leer)
- [ ] Reviewer confirma APPROVED
