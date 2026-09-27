# 09 — Validación de API Key + Dominio — Backend

> **Feature ID:** b09
> **Contraparte:** `frontend/features/09-feature-apikey-domain-validation.md` (f09)
> **Dependencias:** b00 (Foundation), b06 (Project API)
> **Rama sugerida:** `feature/b09-apikey-domain-validation`
> **Origen:** bug encontrado en sesión de debugging (2026-09-26) — el widget decidía
> setup-vs-login mirando solo si `apiKey` no estaba vacío, sin validar nada contra el
> backend. Pegar una key de otro ambiente (ej. producción) contra un backend con DB
> vacía mostraba el login en vez de la pantalla correcta.

## 1. Objetivo

Nuevo endpoint que, dado un `api_key`, le dice al frontend en qué estado está para que
decida qué pantalla mostrar. Además, bindea cada proyecto a un dominio la primera vez
que se usa desde alguno, para detectar uso de una key robada/copiada desde otro sitio.

## 2. Modelo de datos

Agregar columna `domain` a `projects` (nueva migración, NO editar `001_initial.sql`):

`backend/migrations/002_add_project_domain.sql`:
```sql
ALTER TABLE projects ADD COLUMN domain TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);
```

**Importante:** `app/database.py` → `run_migrations()` hoy solo ejecuta
`migrations/001_initial.sql` a mano (hardcodeado). Hay que generalizarlo para que
itere todos los `*.sql` de `migrations/` en orden alfabético y los ejecute con
`executescript()`, así esta y futuras migraciones se aplican solas sin tocar
`run_migrations()` de nuevo cada vez.

`domain` almacena solo el **hostname** (sin protocolo ni puerto), ej. `soporte.miempresa.com`
o `localhost`. Ver sección 4 sobre extracción.

## 3. Endpoint (`app/api/v1/projects.py`, o un router nuevo `verify.py` si `projects.py` ya requiere JWT en todos sus otros endpoints — este es público, pre-login)

```
GET /api/v1/projects/verify?api_key=sproj_xxx
```

Público, sin JWT (se llama antes de tener sesión). Response 200 siempre — no es un
error HTTP, es una consulta de estado (mismo criterio que `GET /setup/check-slug` en
`SlugCheckResponse`, que devuelve `{ available: bool }` en vez de un error).

```json
{ "status": "not_found" }
{ "status": "ready" }
{ "status": "domain_mismatch" }
```

Nuevo modelo en `app/models/setup.py` (o archivo equivalente que ya use `Literal`):
```python
from typing import Literal

class ProjectVerifyResponse(BaseModel):
    status: Literal["not_found", "ready", "domain_mismatch"]
```

## 4. Lógica

```python
from typing import Optional
from urllib.parse import urlparse

def extract_request_domain(request: Request) -> Optional[str]:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return None
    hostname = urlparse(origin).hostname
    return hostname  # puede ser None si el header viene malformado
```

```python
@router.get("/projects/verify", response_model=ProjectVerifyResponse)
async def verify_project(api_key: str, request: Request):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, domain FROM projects WHERE api_key = ?", (api_key,)
    )
    project = await cursor.fetchone()

    if project is None:
        return ProjectVerifyResponse(status="not_found")

    request_domain = extract_request_domain(request)

    if project["domain"] is None:
        # Primera vez que se ve esta key con un dominio resuelto: bindear (self-heal
        # para proyectos creados antes de este feature, o si el bind inicial fallo).
        # Si no se puede resolver el dominio del request, fail closed: no bindear "None".
        if request_domain is None:
            return ProjectVerifyResponse(status="domain_mismatch")
        await db.execute(
            "UPDATE projects SET domain = ?, updated_at = ? WHERE id = ?",
            (request_domain, now_iso(), project["id"]),
        )
        await db.commit()
        return ProjectVerifyResponse(status="ready")

    if request_domain is not None and project["domain"] == request_domain:
        return ProjectVerifyResponse(status="ready")

    return ProjectVerifyResponse(status="domain_mismatch")
```

Notas:
- **Sin excepción para localhost/dev** — mismo trato siempre (decisión explícita del usuario,
  2026-09-26). Si en dev necesitás cambiar de "dominio" (ej. `localhost:5173` vs `127.0.0.1:5173`),
  el hostname difiere (`localhost` vs `127.0.0.1`) y se re-bindea o bloquea igual que en prod —
  es comportamiento esperado, no un bug.
- **Fail closed:** si no se puede determinar el dominio del request (sin `Origin` ni `Referer`),
  nunca se asume `ready` — se trata como `domain_mismatch`.
- El puerto y el protocolo se ignoran a propósito (solo se compara `hostname`), para no romper
  el bind en dev cuando cambia el puerto de Vite entre sesiones.

## 5. Bind del dominio al crear el proyecto (`POST /api/v1/setup`)

Para que un proyecto recién creado no quede con `domain = NULL` esperando el primer
login (lo cual dejaría una ventana donde cualquiera podría "robarse" el bind si pega
la key desde otro sitio antes que el dueño legítimo inicie sesión), bindear el dominio
en el momento de creación:

```python
domain = extract_request_domain(request)
await db.execute(
    "INSERT INTO projects (..., domain, ...) VALUES (..., ?, ...)",
    (..., domain, ...),
)
```

Si `domain` es `None` en ese momento (ej. llamada sin header Origin), queda `NULL` y se
resuelve en el primer `verify` posterior (mismo mecanismo de self-heal de la sección 4).

## 6. Seguridad

- [ ] El endpoint es público (sin JWT) — no debe filtrar nada del proyecto salvo el `status`.
      Nunca devolver `name`, `id` real, ni nada del proyecto en esta respuesta.
- [ ] Rate limiting: reusar el limiter de b07 sobre este endpoint — es un vector de
      enumeración de api_keys válidas (probar keys al voleo y ver si da `not_found` vs otra cosa).
- [ ] `extract_request_domain` nunca debe hacer trust ciego del header sin parsear con
      `urlparse().hostname` (un header `Origin: evil.com` crudo sin parsear podría compararse
      mal contra un `domain` guardado con formato distinto).
- [ ] No usar el `Host` header como fuente de dominio (ese es el host del backend, no del sitio
      que embebe el widget).

## 7. Desarrollo — Pasos

1. Crear `backend/migrations/002_add_project_domain.sql`.
2. Generalizar `run_migrations()` en `app/database.py` para iterar todos los `migrations/*.sql`
   ordenados, no solo `001_initial.sql`.
3. Agregar `extract_request_domain()` (helper, ej. en `app/core/security_headers.py` o un
   nuevo `app/core/domain.py`).
4. Implementar `GET /api/v1/projects/verify`.
5. Modificar `POST /api/v1/setup` para bindear `domain` al crear el proyecto.
6. Tests: `backend/tests/test_project_verify.py`:
   - api_key inexistente → `not_found`.
   - api_key con `domain = NULL` → bindea y devuelve `ready`.
   - api_key con `domain` igual al del request → `ready`.
   - api_key con `domain` distinto al del request → `domain_mismatch`.
   - Request sin `Origin` ni `Referer` contra proyecto con `domain = NULL` → `domain_mismatch` (fail closed).
7. Verificar: `python -c "from app.main import socket_app; print('OK')"`.

## 8. Criterios de Aprobación (Done)

- [ ] `run_migrations()` aplica todas las migraciones en `migrations/*.sql`, no solo la 001.
- [ ] `GET /projects/verify` devuelve los 3 estados correctos según los casos de la sección 7.
- [ ] `POST /setup` bindea `domain` al crear el proyecto.
- [ ] Ningún dato del proyecto (nombre, id) se filtra en la respuesta de `verify`.
- [ ] Rate limiting aplicado al endpoint.
- [ ] Reviewer confirma APPROVED.
