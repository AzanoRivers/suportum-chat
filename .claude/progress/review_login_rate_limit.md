# Review: login_rate_limit, Hotfix de seguridad (rate limit en POST /auth/login)

## Veredicto: APPROVED

## Checkpoints Verificados

- [x] Orden de operaciones en `login()`: rate limit por IP corre antes de tocar la DB (`check_rate_limit` en linea 52, `_resolve_project` recien en linea 55). Chequeo por cuenta (`is_rate_limited`) corre despues de resolver `project_id` pero antes del SELECT de usuario (lineas 57-66). OK.
- [x] `record_attempt` se llama en ambos caminos de fallo (`user is None` o `verify_password` falla) contra la misma `account_key`, linea unica 68-70 cubre ambos branches. OK.
- [x] Login exitoso no llama `record_attempt` en ningun punto del flujo de exito (lineas 72-95). OK.
- [x] Normalizacion de email: `email_key = body.email.lower()` se usa para construir `account_key`, y esa misma variable se pasa tanto a `is_rate_limited` como a `record_attempt`. Consistente, sin desvio de capitalizacion posible.
- [x] `_extract_client_ip` compartido: `register()` ahora invoca el helper con exactamente la misma expresion que tenia antes (confirmado con `git diff`, sin cambio de comportamiento).
- [x] IDOR/multi-tenant: `account_key = f"login:{project_id}:{email_key}"` incluye `project_id`, dos proyectos con el mismo email no comparten bucket.
- [x] Formato de error: `429` con `detail="RATE_LIMITED"`, mismo codigo que `register`. `app/core/errors.py` no tiene campo `message` (grep sin resultados, archivo no modificado).
- [x] Tests nuevos (4): leidos completos.
  - `test_five_failed_attempts_block_sixth_even_with_correct_password`: 5 fallos + 6to con password correcta bloqueado. Correcto.
  - `test_successful_login_does_not_count_against_account_limit`: 10 logins exitosos seguidos, ninguno cuenta contra el limite de 5. Correcto.
  - `test_account_limit_is_independent_per_email`: cuenta A bloqueada, cuenta B (mismo proyecto) sigue funcionando. Correcto.
  - `test_ip_limit_blocks_after_30_attempts_regardless_of_account`: usa 30 emails distintos e inexistentes (`nonexistent{i}@example.com`), evitando que el limite de cuenta (5) se dispare antes que el de IP (30). El intento 31 con un email nuevo (`yet-another@example.com`) confirma que el bloqueo es por IP y no por cuenta. Diseño correcto, sin confusion entre limites.
- [x] Python 3.9: sin `X | Y` ni `X | None` en `rate_limit.py` ni `auth.py` (grep sin resultados).
- [x] R1: sin em dash en los 3 archivos (rate_limit.py, auth.py, test_login_rate_limit.py).
- [x] `refresh`, `logout`, `me` y `evict_stale_buckets` no fueron tocados (confirmado via `git diff`, el diff solo agrega `is_rate_limited`/`record_attempt` antes de `evict_stale_buckets`, sin modificarla, y no toca las funciones `refresh`/`logout`/`me` en `auth.py`).

## Verificacion de suite completa

```
.venv\Scripts\python.exe -c "from app.main import socket_app; print('OK')"  → OK
.venv\Scripts\python.exe -m pytest tests/ -v  → 18 passed, 0 failed (14 existentes + 4 nuevos)
```

## Notas Adicionales

- Todas las funciones nuevas (`is_rate_limited`, `record_attempt`, `_extract_client_ip`) tienen type hints completos.
- El diff es minimo y quirurgico: 2 archivos modificados, 38 inserciones, 6 eliminaciones. Sin efectos colaterales fuera del scope del hotfix.
- No se pudo correr `mypy` (no esta instalado en el venv actual), no bloqueante dado que la anotacion de tipos es visualmente completa y correcta.

---

## Review: login_rate_limit, ronda 2, config via .env (light)

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)

- [x] Defaults en `config.py` identicos a los literales hardcodeados que reemplazan: `LOGIN_RATE_LIMIT_MAX=5`, `LOGIN_RATE_LIMIT_WINDOW=300`, `LOGIN_IP_RATE_LIMIT_MAX=30`, `LOGIN_IP_RATE_LIMIT_WINDOW=300` (config.py lineas 33-36). Sin cambio de comportamiento.
- [x] `auth.py` no mezcla las constantes: chequeo por IP (linea 52-56) usa `settings.LOGIN_IP_RATE_LIMIT_MAX`/`settings.LOGIN_IP_RATE_LIMIT_WINDOW`; chequeo por cuenta (linea 63-67) usa `settings.LOGIN_RATE_LIMIT_MAX`/`settings.LOGIN_RATE_LIMIT_WINDOW`. Sin desvio.
- [x] `.env.example` documenta las 4 variables con comentarios claros (lineas 27-34), separando limite por cuenta y por IP, sin em dash.
- [x] Type hints nuevos: los 4 campos son `int` simples, sin `X | Y` ni `X | None` (grep sin resultados en los 3 archivos).
- [x] R1 (em dash): grep sin resultados en `app/config.py`, `.env.example`, `app/api/v1/auth.py`.

## Verificacion de suite completa

```
.venv\Scripts\python.exe -c "from app.main import socket_app; print('OK')"  -> OK
.venv\Scripts\python.exe -m pytest tests/ -v  -> 18 passed, 0 failed
```

## Notas adicionales

- Cambio quirurgico: solo mueve literales a `Settings`, sin tocar logica de `check_rate_limit`/`is_rate_limited`/`record_attempt`. Los 4 tests de rate limit de la ronda 1 siguen pasando sin modificacion.
