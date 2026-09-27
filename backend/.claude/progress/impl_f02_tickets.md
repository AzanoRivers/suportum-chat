# Impl: f02_tickets — Tickets REST API

## Estado: DONE

## Archivos Creados/Modificados

- `app/api/v1/tickets.py` (CREADO) — router completo con los 5 endpoints
- `app/api/v1/router.py` (MODIFICADO) — tickets router registrado en /tickets
- `.env` (MODIFICADO) — BOM UTF-8 eliminado (issue pre-existente)

## Endpoints Implementados

| Metodo | Path                  | Roles        | Notas                                      |
|--------|-----------------------|--------------|--------------------------------------------|
| POST   | /tickets              | any          | status inicial siempre "open"              |
| GET    | /tickets              | any          | filtrado por rol: admin=todos, agent=suyos+sin asignar, client=propios |
| GET    | /tickets/{id}         | any          | IDOR: client recibe 404 si no es suyo      |
| PATCH  | /tickets/{id}         | any          | valida transicion + rol, emite Socket.IO   |
| DELETE | /tickets/{id}         | admin only   | retorna 204 sin body                       |

## Maquina de Estados Implementada

```
open        -> in_progress  : agent, admin
open        -> closed       : admin
in_progress -> resolved     : agent, admin
in_progress -> closed       : admin
resolved    -> closed       : client, admin
closed      -> (nada)       : nadie
```

## Decisiones de Implementacion

1. `validate_transition(current, new, role)` usa un dict con tuplas como clave: `(status_actual, status_nuevo) -> set de roles`. Claro y extensible sin condiciones anidadas.

2. En `PATCH`, el UPDATE SQL se construye dinamicamente con listas de clausulas. Esto evita actualizaciones innecesarias de campos que no cambiaron y permite actualizar solo el campo solicitado.

3. `agent_id` en PATCH: solo admin puede reasignarlo. Si otro rol lo intenta, retorna `403 FORBIDDEN`.

4. Socket.IO en PATCH: se obtiene el `api_key` desde la DB con una query extra para construir el namespace (`/<api_key>`). Si la emision falla, se loggea pero no se propaga el error al cliente (el PATCH ya fue exitoso).

5. `_row_to_ticket` mapea por nombre de columna (`row["field"]`) usando `aiosqlite.Row` que ya es un dict-like. Esto es robusto frente a cambios en el orden de columnas del SELECT.

6. DELETE no emite evento Socket.IO (no fue especificado en el plan). Solo admin puede ejecutarlo.

7. El `GET /tickets/{id}` para agent aplica el mismo filtro que el listado: tickets asignados al agente o sin asignar. Esto es consistente con lo que el agente puede ver en el listado.

## Issue Resuelto: BOM en .env

El archivo `.env` tenia una marca BOM UTF-8 (bytes EF BB BF) al inicio. Esto causaba que
pydantic-settings leyera la primera clave como `﻿PROJECT_NAME` (con prefijo BOM),
que al lowercase se convierte en `﻿project_name`. Como el campo `PROJECT_NAME` ya estaba
definido en Settings, pydantic lo resolvia como campo extra desconocido y lanzaba
`ValidationError: Extra inputs are not permitted`.

Solucion: se eliminaron los 3 bytes del BOM con PowerShell, rescribiendo el archivo en UTF-8
sin BOM. El contenido del .env no fue modificado.

## Verificacion

```
python -c "from app.main import socket_app; print('OK')"
# Output: OK
```

Sin errores de importacion. Todos los modulos del proyecto cargan correctamente.
