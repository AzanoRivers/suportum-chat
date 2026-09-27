# Impl: f03_orders -- Orders REST API

## Estado: DONE

## Archivos Creados/Modificados

- `app/api/v1/orders.py` (CREADO) -- router completo con los 5 endpoints
- `app/api/v1/router.py` (MODIFICADO) -- orders router registrado en /orders

## Endpoints Implementados

| Metodo | Path                 | Roles        | Notas                                                    |
|--------|----------------------|--------------|----------------------------------------------------------|
| POST   | /orders              | any          | status inicial siempre "pending"; emite order:updated    |
| GET    | /orders              | any          | filtros: ?status=, ?agent_id=me, ?client_id=             |
| GET    | /orders/{id}         | any          | IDOR: client recibe 404 si no es suya                    |
| PATCH  | /orders/{id}         | any          | valida transicion + rol; emite order:updated             |
| DELETE | /orders/{id}         | admin only   | retorna 204 sin body                                     |

## Maquina de Estados Implementada

```
pending   -> active     : agent, admin
pending   -> cancelled  : client, agent, admin
active    -> taken      : agent, admin
active    -> cancelled  : agent, admin
taken     -> completed  : agent, admin
taken     -> cancelled  : agent, admin
completed -> (nada)     : estado terminal, siempre rechaza
```

## Decisiones de Implementacion

1. `validate_order_transition(current, new, role)` verifica primero si el estado actual es
   el terminal (`completed`) y retorna False inmediatamente antes de consultar el dict de
   transiciones. Esto garantiza que ningun rol pueda mover una orden desde completed.

2. `_row_to_order(row)` deserializa el campo `details` con `json.loads` y fallback a `{}`.
   Cualquier valor nulo o JSON invalido resulta en dict vacio en lugar de error de runtime.

3. `_emit_order_updated(db, project_id, order_dict, action)` es un helper asincrono separado,
   reutilizado tanto en POST como en PATCH. Si la emision falla, se loggea sin propagar el
   error al cliente (la operacion REST ya fue exitosa).

4. En `GET /orders`, los filtros se construyen dinamicamente agregando clausulas a una lista.
   El filtro `?status=` acepta multiples valores separados por coma; los invalidos se descartan
   en lugar de retornar error, para tolerancia a valores desconocidos.

5. IDOR en GET individual: client aplica `AND o.client_id = ?` en la query. Agent y admin
   aplican solo `AND o.project_id = ?`. El 404 es identico para todos los casos de no acceso.

6. En PATCH, `details` acepta cualquier objeto JSON. El tamano se verifica en bytes UTF-8
   antes de escribir: si supera 50 KB retorna 413 UPLOAD_TOO_LARGE.

7. `?agent_id=me` en GET convierte `me` al `user_id` del caller. Cualquier otro valor
   se trata literalmente como UUID. Solo agent/admin puede usar este parametro; client lo ignora.

8. Socket.IO emite `order:updated` con payload `{"order": order_dict, "action": "created"|"updated"}`
   al room `orders:board` en namespace `/<api_key>`.

## Verificacion

```
python -c "from app.main import socket_app; print('OK')"
# Output: OK
```

Sin errores de importacion. Todos los modulos del proyecto cargan correctamente.
