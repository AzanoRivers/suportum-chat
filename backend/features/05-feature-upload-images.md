# 05 — Upload de Imágenes Backend

## 1. Objetivo
Endpoint de upload de imágenes para mensajes de chat: validación por magic bytes,
compresión a WebP con Pillow, almacenamiento en filesystem, y emisión Socket.IO
del mensaje con attachment.

## 2. Endpoint (`app/api/v1/upload.py`)

```
POST /upload/{room_id}
  multipart/form-data: file=<imagen>
  Authorization: Bearer <token>
```

### Response exitosa
```json
{
  "message_id": "uuid",
  "attachment": {
    "url": "/uploads/{project_id}/chat/{room_id}/{year}/{month}/{uuid}.webp",
    "width": 800,
    "height": 600,
    "size_bytes": 45000
  }
}
```

### Errores posibles
| Código | Cuándo |
|---|---|
| `FORBIDDEN_ROOM` | No pertenece al room |
| `UPLOAD_TOO_LARGE` | Supera MAX_IMAGE_SIZE_MB |
| `UPLOAD_TYPE_NOT_SUPPORTED` | MIME no es imagen (video, audio, etc.) |
| `UPLOAD_CORRUPT` | Pillow no puede abrir el archivo |

## 3. Implementación

### 3.1 Magic bytes MIME validation
```python
ALLOWED_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}

async def detect_mime(data: bytes) -> str:
    # Verificar por cabeceras de bytes sin depender de la extensión
    if data[:3] == b"\xff\xd8\xff":       return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n": return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"): return "image/gif"
    if data[8:12] == b"WEBP":             return "image/webp"
    return "application/octet-stream"
```

### 3.2 Compresión con Pillow
```python
from PIL import Image
import io

async def compress_to_webp(data: bytes, max_dimension: int, quality: int = 85) -> tuple[bytes, int, int]:
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="WebP", quality=quality, method=6)
    return buffer.getvalue(), img.width, img.height
```

### 3.3 Ruta segura en disco
```python
from pathlib import Path
import uuid

def safe_upload_path(upload_dir: str, project_id: str, room_id: str, year: str, month: str) -> tuple[Path, str]:
    base = Path(upload_dir).resolve()
    filename = f"{uuid.uuid4().hex}.webp"
    target_dir = base / project_id / "chat" / room_id / year / month
    target = (target_dir / filename).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal detectado")
    target_dir.mkdir(parents=True, exist_ok=True)
    return target, filename
```

### 3.4 Flujo completo
```python
@router.post("/upload/{room_id}")
async def upload_image(room_id: str, file: UploadFile, scope=Depends(get_scoped_project)):
    project_id = scope["project"]["id"]
    user_id = scope["user_id"]

    # 1. Validar pertenencia al room
    if not await validate_room_access(project_id, user_id, scope["role"], room_id):
        raise HTTPException(403, "FORBIDDEN_ROOM")

    # 2. Leer archivo con límite de tamaño
    data = await file.read(settings.MAX_IMAGE_SIZE_MB * 1024 * 1024 + 1)
    if len(data) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, "UPLOAD_TOO_LARGE")

    # 3. Validar MIME por magic bytes
    mime = await detect_mime(data)
    if mime not in ALLOWED_MIME:
        raise HTTPException(415, "UPLOAD_TYPE_NOT_SUPPORTED")

    # 4. Comprimir a WebP
    try:
        compressed, width, height = await asyncio.to_thread(
            compress_to_webp, data, settings.MAX_IMAGE_DIMENSION_PX
        )
    except Exception:
        raise HTTPException(422, "UPLOAD_CORRUPT")

    # 5. Guardar en disco
    now = datetime.utcnow()
    path, filename = safe_upload_path(settings.UPLOAD_DIR, project_id, room_id, str(now.year), f"{now.month:02d}")
    path.write_bytes(compressed)

    # 6. URL pública
    url = f"/uploads/{project_id}/chat/{room_id}/{now.year}/{now.month:02d}/{filename}"

    # 7. Insertar mensaje + attachment en DB
    msg_id = str(uuid.uuid4())
    att_id = str(uuid.uuid4())
    db = await get_db()
    async with db.execute("BEGIN"):
        await db.execute(
            "INSERT INTO messages (id, project_id, room_id, sender_id, content, content_type) VALUES (?,?,?,?,?,?)",
            (msg_id, project_id, room_id, user_id, "", "image")
        )
        await db.execute(
            "INSERT INTO attachments (id, project_id, message_id, room_id, filename, original_name, size_bytes, width, height, url) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (att_id, project_id, msg_id, room_id, filename, file.filename or "image", len(compressed), width, height, url)
        )
    await db.commit()

    # 8. Emitir via Socket.IO
    payload = {
        "id": msg_id, "room_id": room_id, "sender_id": user_id,
        "content": "", "content_type": "image",
        "attachment": {"url": url, "width": width, "height": height, "size_bytes": len(compressed)},
        "created_at": now.isoformat() + "Z"
    }
    api_key = scope["project"]["api_key"]
    await sio.emit("message:new", payload, room=room_id, namespace=f"/{api_key}")

    return {"message_id": msg_id, "attachment": payload["attachment"]}
```

## 4. Dependencias

```powershell
# Windows local:
pip install Pillow python-magic-bin

# VPS Oracle Linux ARM64 (bash vía SSH):
# sudo dnf install file-libs
# pip install Pillow python-magic
```

**Nota**: `python-magic-bin` solo para Windows. En VPS usar `python-magic` con `libmagic` del sistema.

## 5. Seguridad

- [ ] MIME validado por magic bytes, no por extensión
- [ ] Nombre en disco = UUID generado por servidor (no el nombre original)
- [ ] `safe_upload_path` verifica no hay path traversal
- [ ] Pillow corre en `asyncio.to_thread()` para no bloquear el event loop
- [ ] Max tamaño verificado ANTES de intentar abrir con Pillow
- [ ] Transacción DB: si falla el INSERT de attachment, el mensaje no queda huérfano
- [ ] `uploads/` en `.gitignore` — no versionar imágenes

## 6. Desarrollo — Pasos

1. Instalar Pillow: `pip install Pillow python-magic-bin` (Windows) o `python-magic` (VPS)
2. Implementar helpers en `app/core/upload.py`: `detect_mime`, `compress_to_webp`, `safe_upload_path`
3. Implementar endpoint en `app/api/v1/upload.py`
4. Registrar router
5. Probar con imagen JPEG → verificar que llega como WebP con dimensiones correctas
6. Probar con video → verificar `415 UPLOAD_TYPE_NOT_SUPPORTED`
7. Probar con imagen > MAX_IMAGE_SIZE_MB → `413`

## 7. Auditoría y Revisión de Errores

### 7.1 Checklist de Seguridad
- [ ] Video/audio rechazado con `415`
- [ ] Archivo corrupto rechazado con `422`
- [ ] Path traversal detectado y rechazado
- [ ] Nombre en disco es UUID, no el nombre original
- [ ] Socket.IO emite solo al room correcto

### 7.2 Checklist de Funcionalidad
- [ ] JPEG/PNG/WebP/GIF aceptados
- [ ] Output siempre WebP
- [ ] Imágenes grandes se redimensionan proporcionalmente
- [ ] `attachment.url` accesible via `GET /uploads/...`
- [ ] Mensaje persiste en DB con `content_type="image"`

## 8. Criterios de Aprobación (Done)
- [ ] Upload JPEG → WebP comprimido en disco → URL accesible
- [ ] `message:new` Socket.IO llega a los clientes en el room con el attachment
- [ ] Video rechazado con 415
- [ ] Archivo corrupto rechazado con 422
- [ ] Imagen > 10 MB rechazada con 413
- [ ] Reviewer confirma APPROVED
