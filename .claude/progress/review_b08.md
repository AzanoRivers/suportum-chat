# Review: b08, Project Branding (Backend)

## Veredicto: APPROVED

## Checkpoints Verificados

- [x] `POST /api/v1/projects/me/logo`: solo admin (`require_admin` via `Depends(require_role("admin"))`),
      lee con limite `MAX_LOGO_SIZE_MB*1MB+1` y responde 413 `UPLOAD_TOO_LARGE` si excede, valida MIME
      por magic bytes (`detect_mime`, nunca por extension/content-type declarado), comprime a WebP con
      `asyncio.to_thread(compress_to_webp, ...)`, guarda con `safe_branding_path()`, hace merge de
      `settings.logo_url` preservando el resto del JSON, borra el logo anterior con try/except (no
      rompe si falla). Respuesta `{"logo_url": "/uploads/{project_id}/branding/logo-xxx.webp"}`.
- [x] `DELETE /api/v1/projects/me/logo`: solo admin, 404 `LOGO_NOT_FOUND` si no hay logo previo, borra
      archivo y limpia `logo_url` del JSON via merge.
- [x] `ALLOWED_MIMES` en `app/core/upload.py` sin `image/svg+xml`. Tabla `_MAGIC` tampoco tiene entrada
      para SVG, cualquier SVG cae en `application/octet-stream` y da 415. Regex de validacion del data
      URI en `projects.py` tambien excluye SVG del patron.
- [x] `safe_branding_path()` reutiliza `_sanitize_segment()` (mismo helper que `safe_upload_path`),
      valida contra path traversal, construye `UPLOAD_DIR/{project_id}/branding/logo-{uuid4().hex}.webp`.
- [x] IDOR: `project_id` en ambos endpoints viene unicamente de `scoped["project"]["id"]` (derivado del
      JWT), nunca de un parametro que envie el cliente. Test dedicado de cross-tenant pasa.
- [x] Errores backend: formato `{"error": {"code": ...}}` sin campo `message`, confirmado en
      `app/core/errors.py`.
- [x] `POST /api/v1/setup` procesa `logo_data` opcional despues de crear el proyecto, con
      try/except que solo loguea warning y continua: el proyecto se crea igual sin logo si falla.
- [x] `app/models/setup.py`: `logo_data: Optional[str] = None`, tipado Python 3.9.
- [x] `app/config.py` / `.env.example`: `MAX_LOGO_SIZE_MB=2`, `MAX_LOGO_DIMENSION_PX=512` presentes.
- [x] Non-admin recibe 401/403 en los endpoints de logo.
- [x] `tests/test_logo.py`: 9 tests (upload valido, sin token, tamano excedido, MIME invalido, corrupto,
      delete existente, delete sin logo previo, reupload reemplaza archivo, IDOR cross-tenant). Los 9 pasan.
- [x] Cero em dash en los archivos relevantes de esta feature.
- [x] `python -c "from app.main import socket_app; print('OK')"` -> OK.
- [x] `python -m pytest tests/ -v` -> 9 passed.

## Contexto

Esta feature ya estaba completamente implementada desde el commit foundation
(`e302150`). El unico cambio real de esta sesion fue eliminar un em dash preexistente
en `app/core/upload.py` linea 69.

## Notas Adicionales

Em dashes preexistentes fuera de scope en `app/guide_ai.py`, `app/services/email.py`,
`app/api/v1/users.py` (del commit foundation, no relacionados a b08). Senalados para
limpieza aparte, no bloqueantes para esta review.
