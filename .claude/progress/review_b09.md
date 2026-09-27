# Review: b09 - Validacion de API Key + Dominio (Backend)

## Veredicto: APPROVED

## Checkpoints Verificados

### F09 Backend (spec-specific)
- [x] `run_migrations()` itera todos los `migrations/*.sql` ordenados alfabeticamente (`Path.glob` + `sorted()`), no solo `001_initial.sql` - OK
- [x] `migrations/002_add_project_domain.sql` agrega columna `projects.domain` + indice - OK
- [x] `GET /api/v1/projects/verify?api_key=...` devuelve `not_found` | `ready` | `domain_mismatch` - OK, verificado con 5 tests + lectura de codigo
- [x] Dominio extraido de `Origin`/`Referer` con `urlparse().hostname` (nunca comparacion cruda, nunca `Host`) - OK, `extract_request_domain()` en `app/core/domain.py`
- [x] Fail closed: sin `Origin`/`Referer` resoluble -> `domain_mismatch`, nunca `ready` - OK, verificado en codigo (linea 156-157 de `projects.py`) y con test dedicado que ademas confirma que NO se bindea `domain = NULL` de forma incorrecta
- [x] `POST /api/v1/setup` bindea `domain` al crear el proyecto - OK, INSERT incluye columna `domain` con valor de `extract_request_domain(request)`
- [x] Sin excepcion para localhost/dev - OK, no hay ningun branch especial para `localhost`/`127.0.0.1`
- [x] Respuesta de `/projects/verify` no filtra nombre/id del proyecto - OK, las 3 ramas retornan unicamente `ProjectVerifyResponse(status=...)`
- [x] Rate limiting aplicado (reusa `check_rate_limit` de F07/b07) - OK, `check_rate_limit(f"verify:{client_ip}", 30, 60)` antes de tocar la DB

### Puntos de atencion especial del brief
1. **`run_migrations()` con `OperationalError`**: verificado ejecutando `run_migrations()` dos veces seguidas sobre una DB temporal nueva (no solo confiando en el reporte del Implementer). Primera corrida aplica `001` y `002` sin error; segunda corrida dispara `duplicate column name` en el `ALTER TABLE` de `002`, es capturado y logueado como "ya aplicada", y el proceso continua sin `raise`. Confirmado que la columna `domain` quedo presente con `PRAGMA table_info(projects)`. El catch esta acotado a los dos mensajes especificos (`"duplicate column name"`, `"already exists"`) dentro de `except sqlite3.OperationalError`, cualquier otro `OperationalError` (ej. error real de sintaxis SQL) se re-lanza (`raise` sin argumentos en el `else` implicito). Es lo suficientemente especifico, no traga errores genericos.
2. **Fail closed**: confirmado leyendo `extract_request_domain()` (retorna `None` si no hay `Origin`/`Referer`, o si `urlparse().hostname` no puede resolver un hostname) y la logica de `/projects/verify`: con `domain project == None` y `request_domain is None` devuelve `domain_mismatch` sin bindear; con `domain` ya seteado y `request_domain is None` tambien cae al `return domain_mismatch` final (nunca compara `None == None` como true). Test dedicado (`test_verify_no_origin_no_referer_against_null_domain_is_fail_closed`) pasa.
3. **Sin filtrado de datos**: confirmado, las 3 respuestas posibles del endpoint son unicamente `{"status": "..."}` via el modelo `ProjectVerifyResponse`, ningun otro campo del proyecto se serializa.
4. **Ubicacion del endpoint**: confirmado en `app/api/v1/router.py` que `router.include_router(projects.router, prefix="/projects", ...)` no pasa `dependencies=[...]`, y en `projects.py` que `router = APIRouter()` no declara Depends a nivel de router. El endpoint `/verify` no tiene ningun parametro `Depends(require_admin)` ni similar, es genuinamente publico. Los demas endpoints del archivo (`/me`, `/me/rotate-key`, `/me/logo`) si declaran su propio `Depends(require_admin)` a nivel de parametro, confirmando el patron descrito por el Implementer.
5. **No rompio b08**: confirmado en `setup.py`, el bind de `domain` ocurre en el `INSERT INTO projects` (antes del procesamiento de `logo_data`, que ocurre despues via `process_logo_data_uri` con su propio try/except que no aborta el setup si falla). Ambos mecanismos son independientes: si `domain` es `None` (sin header Origin), el INSERT igual sucede con `NULL` y se resuelve luego via self-heal en `/verify`; si el logo falla, el `domain` ya quedo persistido sin verse afectado. Los 9 tests preexistentes de `test_logo.py` siguen en PASSED.
6. **Python 3.9**: confirmado, todo el codigo nuevo usa `Optional[X]` (`app/core/domain.py`, `app/models/setup.py` con `Literal`, `app/api/v1/projects.py`). Ningun uso de `X | None` ni `X | Y`.
7. **R1 (em dash)**: verificado con script Python que busca `\u2014` en los 7 archivos tocados por esta feature (`database.py`, `domain.py`, `setup.py` (models), `projects.py`, `setup.py` (api), la migracion SQL, y el test file). 0 ocurrencias. (No se evaluaron `users.py`/`guide_ai.py`/`email.py` por estar fuera de scope de b09, tal como indica el Implementer).

### Checkpoints Globales (Backend)
- [x] No hay `time.sleep()` en el codigo nuevo/modificado - confirmado con busqueda, 0 resultados
- [x] No hay `import requests` - confirmado, 0 resultados
- [x] Type hints en todas las funciones nuevas - OK (`extract_request_domain`, `verify_project`, `run_migrations`)
- [x] Sin dependencias nuevas (solo `urllib.parse`, stdlib) - no aplica wheel arm64/requirements.txt
- [x] Optional/Union estilo Python 3.9 - OK, confirmado

## Verificacion Independiente Ejecutada
```
.venv\Scripts\python.exe -c "from app.main import socket_app; print('OK')"
-> OK

.venv\Scripts\python.exe -m pytest tests/ -v
-> 14 passed, 1 warning (9 test_logo.py + 5 test_project_verify.py, 0 failed)

Script standalone: run_migrations() ejecutado dos veces sobre DB temporal nueva
-> "First run OK" / "Second run OK", columna `domain` presente en PRAGMA table_info

Busqueda em dash (U+2014) en los 7 archivos tocados por b09
-> 0 ocurrencias
```

## Notas Adicionales
Ninguna. La decision de diseno de tratar `OperationalError` con mensaje especifico en vez de una
tabla `schema_migrations` es razonable dado que el spec no pedia esa tabla y el catch esta acotado
a los dos mensajes esperados (no es un `except Exception` generico). Si en el futuro se agregan
migraciones con sentencias no idempotentes distintas a `ALTER TABLE ADD COLUMN` (ej. `DROP COLUMN`,
`CREATE TABLE` sin `IF NOT EXISTS`), val a la pena revisar si el mensaje de error de SQLite para
esos casos tambien cae en "duplicate column name"/"already exists"; no bloqueante para este approve.
