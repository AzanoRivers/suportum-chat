# Impl: b09 - Validacion de API Key + Dominio (Backend)

## Estado: DONE

## Archivos Creados/Modificados
- `backend/migrations/002_add_project_domain.sql` (nuevo): agrega columna `projects.domain` + indice.
- `backend/app/database.py`: `run_migrations()` generalizado para iterar `migrations/*.sql` ordenados alfabeticamente (via `Path.glob("*.sql")` + `sorted()`), en vez de hardcodear `001_initial.sql`. Se agrego manejo defensivo de `sqlite3.OperationalError` para "duplicate column name" / "already exists", ya que `run_migrations()` se ejecuta en cada arranque del proceso (systemd/gunicorn restart), y `ALTER TABLE ADD COLUMN` no es idempotente en SQLite (a diferencia de `CREATE TABLE/INDEX IF NOT EXISTS` que ya usaba el resto del schema). Verificado con una prueba manual que ejecuta `run_migrations()` dos veces seguidas sobre la misma DB: pasa sin error.
- `backend/app/core/domain.py` (nuevo): `extract_request_domain(request)`, hostname via `urlparse().hostname` de `Origin` o `Referer` (nunca `Host`). Retorna `Optional[str]`.
- `backend/app/models/setup.py`: agregado `ProjectVerifyResponse` (`Literal["not_found", "ready", "domain_mismatch"]`).
- `backend/app/api/v1/projects.py`: nuevo endpoint publico `GET /projects/verify` (implementado directamente en este archivo, ver decision de diseno abajo). Reusa `check_rate_limit` de b07.
- `backend/app/api/v1/setup.py`: `POST /setup` ahora extrae el dominio del request con `extract_request_domain()` y lo persiste en el INSERT de `projects` (columna `domain`). No rompe el flujo existente de `logo_data` (b08), que sigue corriendo despues del INSERT sin cambios.
- `backend/tests/test_project_verify.py` (nuevo): 5 tests cubriendo los casos de la seccion 7 del spec.

## Checkpoints Implementados
- [x] `run_migrations()` itera todos los `migrations/*.sql` ordenados, no solo `001_initial.sql`
- [x] `migrations/002_add_project_domain.sql` agrega columna `projects.domain`
- [x] `GET /api/v1/projects/verify?api_key=...` devuelve `not_found` | `ready` | `domain_mismatch`
- [x] Dominio extraido de `Origin`/`Referer` con `urlparse().hostname` (nunca comparacion cruda del header, nunca `Host`)
- [x] Fail closed: sin `Origin`/`Referer` resoluble -> `domain_mismatch`, nunca `ready` (test dedicado)
- [x] `POST /api/v1/setup` bindea `domain` al crear el proyecto
- [x] Sin excepcion para localhost/dev, mismo trato de dominio siempre (no se agrego bypass)
- [x] Respuesta de `/projects/verify` no filtra nombre/id del proyecto (solo `{"status": ...}`)
- [x] Rate limiting aplicado: `check_rate_limit(f"verify:{client_ip}", 30, 60)`, mismo patron que `setup:` y `register:`

## Verificacion Local (PowerShell/Bash equivalente, resultados)

```
python -c "from app.main import socket_app; print('OK')"
-> OK

python -m pytest tests/ -v
-> 14 passed, 1 warning in 28.01s
   (9 tests preexistentes de test_logo.py + 5 nuevos de test_project_verify.py, todos PASSED)

Select-String -Pattern "-" (em dash U+2014) sobre los archivos tocados en esta feature:
-> 0 resultados en: app/database.py, app/core/domain.py, app/models/setup.py,
   app/api/v1/projects.py, app/api/v1/setup.py, migrations/002_add_project_domain.sql,
   tests/test_project_verify.py
   (Nota: SI existen em dashes preexistentes en archivos que esta feature NO toca:
   app/api/v1/users.py, app/guide_ai.py, app/services/email.py. No fueron modificados
   ni son parte del scope de b09, se dejaron intactos.)
```

## Decisiones de Diseno

1. **Ubicacion del endpoint `/projects/verify`**: se implemento directamente en
   `app/api/v1/projects.py` (no en un router nuevo `verify.py`). Razon: el spec
   planteaba la disyuntiva solo si "projects.py ya requiere JWT en todos sus otros
   endpoints". Revisando el archivo, cada endpoint (`/me`, `/me/rotate-key`, `/me/logo`)
   declara su propio `Depends(require_admin)` a nivel de parametro, NO hay un
   `Depends()` global a nivel de `APIRouter()` que forzaria auth a todo lo que se
   registre en ese router. Agregar un endpoint publico ahi no corre riesgo de heredar
   auth por accidente, y evita registrar un segundo router con prefix duplicado
   ("/projects") solo para un endpoint. Se lo dejo claramente separado con un bloque
   de comentario ("Endpoint publico (sin JWT)...") antes de la seccion de endpoints
   de admin, para que quede visualmente inconfundible para el Reviewer.

2. **Idempotencia de la migracion 002**: el spec no menciona una tabla de tracking de
   migraciones (`schema_migrations`), y `run_migrations()` se ejecuta en cada arranque
   del proceso (via `lifespan`/`on_startup`, sin flag de "solo la primera vez"). Como
   `ALTER TABLE ADD COLUMN` (a diferencia de `CREATE TABLE/INDEX IF NOT EXISTS` que usa
   el resto del schema) rompe en la segunda ejecucion con "duplicate column name", agregue
   un catch puntual en `run_migrations()` para ese error especifico (y "already exists"
   por si alguna migracion futura usa `ALTER TABLE ... RENAME` u otra sentencia no
   idempotente), tratandolo como "ya aplicada, se omite" en vez de re-lanzar. Esto evita
   que el servidor no levante despues del segundo `systemctl restart suportum` en
   produccion. Verificado manualmente corriendo `run_migrations()` dos veces sobre la
   misma DB sin error.

3. **Rate limit de `/verify`**: no especificado con numeros exactos en el spec (solo
   "reusar el limiter de b07"). Se eligio `30 requests / 60 segundos por IP` (mas
   generoso que `setup:` 3/dia o `register:` 10/hora, ya que este endpoint se llama en
   cada carga del widget, no solo en un flujo de creacion de cuenta). La proteccion real
   contra enumeracion de api_keys viene de la entropia del token (`sproj_` + 32 hex chars,
   128 bits), el rate limit es una capa adicional contra abuso/DoS, consistente con el
   patron ya usado en `auth.py`/`setup.py`.

4. **No se toco `app/core/cors.py`**: se leyo para entender el manejo de `Origin` (el
   middleware `DynamicCORSMiddleware` ya lo lee via `request.headers.get("origin", "")`
   para hacer echo del origin en `Access-Control-Allow-Origin`, sin parsearlo a hostname).
   No hacia falta modificarlo: `extract_request_domain()` es independiente y hace su
   propio parseo con `urlparse().hostname`, no depende de ni interfiere con el CORS
   middleware.

## Notas para el Reviewer
- El caso de test "matching domain" verifica explicitamente que cambiar puerto/protocolo
  del `Origin` (`https://miempresa.com` -> `http://miempresa.com:8443`) sigue devolviendo
  `ready`, ya que solo se compara `hostname` (comportamiento explicito del spec, seccion 4).
- No se agrego ningun bypass para `localhost`/dev, tal como lo pidio el usuario
  explicitamente: mismo trato de dominio siempre.
