# Impl: b08 - Project Branding (Backend)

## Estado: DONE

## Hallazgo importante

Al leer el codigo existente para implementar la feature, encontre que **b08 backend ya estaba
completamente implementado** desde el commit inicial `e302150 feat: foundation - full-stack chat
widget MVP` (confirmado con `git log --oneline -- <archivo>` en cada archivo relevante: no hay
diffs pendientes en `app/api/v1/projects.py`, `app/api/v1/setup.py`, `app/models/setup.py` ni
`tests/test_logo.py`, todos coinciden con HEAD). No fue necesario escribir la logica de negocio
de los endpoints ni de `logo_data`: ya cumple el spec punto por punto. Mi trabajo se redujo a
verificacion exhaustiva contra el spec y checkpoints, mas una correccion de estilo (R1).

## Archivos Creados/Modificados

- `backend/app/core/upload.py` - unico cambio real de esta sesion: elimine un em dash (R1) en un
  comentario de `compress_to_webp` (linea 69: "WebP soporta alpha : preservar canal de
  transparencia" en vez de "—"). El resto del archivo (`safe_branding_path`, `detect_mime`,
  `compress_to_webp`, `ALLOWED_MIMES`) ya estaba implementado correctamente segun el spec.

Archivos verificados sin necesidad de cambios (ya cumplian el spec):
- `backend/app/api/v1/projects.py` - `POST /me/logo`, `DELETE /me/logo`, helper publico
  `process_logo_data_uri()` reusado por `setup.py`.
- `backend/app/api/v1/setup.py` - `POST /api/v1/setup` procesa `logo_data` opcional despues de
  crear el proyecto, con try/except que no rompe el flujo si falla (solo `logger.warning`).
- `backend/app/models/setup.py` - `SetupCreateRequest.logo_data: Optional[str]` ya declarado.
- `backend/app/config.py` - `MAX_LOGO_SIZE_MB=2`, `MAX_LOGO_DIMENSION_PX=512` ya presentes.
- `backend/.env.example` - mismas variables ya documentadas.
- `backend/app/core/startup.py` - `StaticFiles` montado en `/uploads` dentro de `lifespan()`
  despues de que `on_startup` crea `UPLOAD_DIR`; el mount es recursivo (sirve `branding/` sin
  cambios adicionales).
- `backend/tests/test_logo.py` - 9 tests ya cubren: upload valido, 401 sin token admin, 413
  tamano excedido, 415 MIME invalido, 422 imagen corrupta, delete existente, delete 404 sin logo
  previo, reupload reemplaza archivo anterior, e IDOR cross-tenant.

## Checkpoints Implementados

- [x] `POST /api/v1/projects/me/logo` - solo admin (`require_admin`), valida MIME por magic bytes
      (`detect_mime`, nunca por extension), comprime a WebP (`compress_to_webp` +
      `asyncio.to_thread`), respeta `MAX_LOGO_SIZE_MB` (413) y `MAX_LOGO_DIMENSION_PX`.
- [x] `DELETE /api/v1/projects/me/logo` - solo admin, borra archivo del disco
      (`_delete_logo_file`, con try/except que no rompe si el archivo esta lockeado) y limpia
      `settings.logo_url` via merge JSON (`_set_logo_url`, nunca reemplaza el settings completo).
- [x] `POST /api/v1/setup` acepta `logo_data` (data URI base64) opcional: si falla la validacion
      (formato, tamano, MIME, corrupcion, o error de guardado), el setup continua sin logo y solo
      se loguea un warning server-side, sin filtrar detalles internos al cliente.
- [x] `image/svg+xml` explicitamente rechazado: `ALLOWED_MIMES` en `upload.py` es
      `{image/jpeg, image/png, image/gif, image/webp}`, sin SVG. La regex
      `_LOGO_DATA_URI_RE` en `projects.py` tambien excluye `svg` del patron
      `data:image/(png|jpeg|gif|webp);base64,...`.
- [x] IDOR: ambos endpoints usan `scoped["project"]["id"]` del JWT (via `require_admin`), nunca
      un id que venga del cliente. Path de guardado usa `safe_branding_path()` con
      `_sanitize_segment()` (mismo helper que `safe_upload_path` de b05), sin traversal posible.
      Test `test_idor_admin_cannot_affect_other_project_logo` confirma que el admin del proyecto A
      no puede afectar archivos del proyecto B.
- [x] Errores en formato `{"error": {"code": "SCREAMING_SNAKE_CASE"}}` sin campo `message`
      (R3), via `error_response()` en los endpoints REST y `HTTPException(detail={"error":
      {"code": ...}})` en `process_logo_data_uri()`.
- [x] Type hints Python 3.9 (`Optional[X]`, nunca `X | None`) en todos los archivos tocados.
- [x] Sin `time.sleep()`, sin `import requests`. Compresion Pillow via `asyncio.to_thread`.

## Verificacion Local (PowerShell / bash equivalente, mismo venv)

```
python -c "from app.main import socket_app; print('OK')"
-> OK

python -m pytest tests/ -v
-> 9 passed, 1 warning (warning es PydanticDeprecatedSince20 sobre class Config, preexistente
   y no relacionado a esta feature)

Busqueda de em dash (U+2014) en app/**/*.py:
-> Verificado con deteccion de bytes UTF-8 exacta (\xe2\x80\x94) en los archivos relevantes de
   b08: app/api/v1/projects.py, app/api/v1/setup.py, app/models/setup.py, app/core/upload.py,
   tests/test_logo.py, app/config.py, .env.example -> CERO resultados en todos.
```

## Nota sobre em dash fuera de scope (no modificado)

Al correr una busqueda amplia de em dash en todo `app/**/*.py` (no solo los archivos de b08)
encontre em dashes preexistentes en 4 archivos no relacionados a esta feature, ya commiteados en
el foundation commit: `app/guide_ai.py`, `app/services/email.py`, `app/api/v1/users.py`. No los
toque porque son deuda tecnica preexistente fuera del scope de b08 (afectan `/guide-ai`, el
servicio de email, y el endpoint de bienvenida de usuarios), y modificarlos no fue pedido en esta
sesion. Lo dejo señalado por si el Orchestrer quiere abrir una feature de limpieza aparte para
R1 global.

## Decisiones de diseño (no hubo ambiguedad real, todo ya estaba resuelto por la implementacion previa)

Documento aqui las decisiones que ya estaban tomadas en el codigo existente, por si el Reviewer
quiere confirmarlas:

1. `GET /api/v1/setup/branding` (endpoint publico, sin auth) ya existe para que `LoginView`/
   `RegisterView` del frontend puedan mostrar el logo antes de autenticarse. No estaba pedido
   explicitamente en el spec de b08 pero es coherente con el checkpoint frontend "LoginView,
   RegisterView... muestran el logo del proyecto". Esto es parte del scope compartido con f08
   pero vive en el backend (`setup.py`), lo dejo intacto.
2. El regex `_LOGO_DATA_URI_RE` valida el formato completo `data:image/(png|jpeg|gif|webp);
   base64,...` antes de decodificar, en vez de solo intentar `b64decode` a ciegas: esto evita
   procesar payloads con MIME declarado invalido antes incluso de tocar Pillow.
3. En el setup, si el proyecto ya fue creado y el logo falla, no hay rollback del proyecto (el
   spec es explicito: "no bloquea el setup... el proyecto se crea igual sin logo"). Confirmado
   que asi esta implementado.
