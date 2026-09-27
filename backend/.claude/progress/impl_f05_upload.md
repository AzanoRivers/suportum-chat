# F05 Upload Images - Reporte de Implementacion

**Fecha:** 2026-06-08
**Estado:** IMPLEMENTADO

---

## Archivos creados / modificados

### Creados

- `app/core/upload.py` - Helpers sincronos de procesamiento de imagen
- `app/api/v1/upload.py` - Endpoint REST `POST /api/v1/upload/{room_id}`

### Modificados

- `app/api/v1/router.py` - Registro del router de upload
- `requirements.txt` - Agregado Pillow 12.2.0

---

## Descripcion de implementacion

### `app/core/upload.py`

Tres funciones sincronas (Python 3.9 compatible, tipos de `typing`):

1. `detect_mime(data: bytes) -> str`
   - Magic bytes hardcodeados en `_MAGIC`, sin dependencias externas
   - Caso especial para WebP: verifica bytes 8-12 == b"WEBP" ademas del prefijo RIFF
   - Retorna `"application/octet-stream"` si no reconoce el formato

2. `compress_to_webp(data, max_dimension, quality=85) -> Tuple[bytes, int, int]`
   - Usa Pillow para abrir, redimensionar (thumbnail preserva aspect ratio) y guardar como WebP
   - Convierte a RGB o RGBA segun si la imagen tiene transparencia
   - Retorna `(bytes_webp, ancho, alto)`

3. `safe_upload_path(upload_dir, project_id, room_id, year, month) -> Tuple[Path, str]`
   - Sanitiza cada segmento con allowlist de caracteres
   - Verifica que el path resultante este dentro del `upload_dir` (anti path traversal)
   - Crea directorios con `mkdir(parents=True, exist_ok=True)`
   - Nombre de archivo: UUID v4 + `.webp`

### `app/api/v1/upload.py`

Endpoint `POST /upload/{room_id}` con `multipart/form-data`:

1. Valida acceso al room con `validate_room_access`
2. Lee hasta `MAX_IMAGE_SIZE_MB + 1 byte` para detectar exceso de tamano (HTTP 413)
3. Detecta MIME por magic bytes; rechaza si no esta en `ALLOWED_MIMES` (HTTP 415)
4. Comprime con `await asyncio.to_thread(compress_to_webp, ...)` (no bloquea el event loop)
5. Guarda en `UPLOAD_DIR/<project_id>/<room_id>/<year>/<month>/<uuid>.webp`
6. INSERT en `messages` (content_type='image', content='') y `attachments` (todas las columnas del schema)
7. Hace commit una sola vez al final del INSERT; rollback implicito si falla antes del commit
8. Obtiene `api_key` con `SELECT api_key FROM projects WHERE id = ?` (no asume que viene en `scoped`)
9. Emite `message:new` con payload completo incluyendo `attachment` al room via `sio.emit`
10. Retorna el mensaje y attachment en la respuesta HTTP (no falla si Socket.IO falla)

---

## Decisions de diseno

- **`content` vacio en messages**: la imagen va en `attachments`, no en `content`. Correcto segun schema.
- **HTTP errors**: todos usan `{"error": {"code": "..."}}` sin campo `message`.
- **No `async with db.execute("BEGIN")`**: aiosqlite maneja la transaccion implicitamente; solo se llama `db.commit()`.
- **Rollback del archivo**: si el INSERT falla despues de guardar el archivo, se borra el archivo con `unlink(missing_ok=True)`.
- **Socket.IO falla suavemente**: un error en `sio.emit` solo se loguea, no aborta la respuesta HTTP.
- **URL publica**: formato `/uploads/<project>/<room>/<year>/<month>/<filename>`; requiere que el servidor sirva el directorio de uploads (Nginx en produccion).

---

## Verificacion

```
python -c "from app.main import socket_app; print('OK')"
# Output: OK
```

---

## Pendiente (fuera del scope de este feature)

- Configurar Nginx para servir `/uploads/` desde `UPLOAD_DIR` en produccion
- Ruta `GET /api/v1/messages/{room_id}` no incluye `attachments` en la respuesta - requiere un JOIN a `attachments` en una tarea separada
- Migracion de `attachments` ya esta en `001_initial.sql`, no requiere migracion adicional
