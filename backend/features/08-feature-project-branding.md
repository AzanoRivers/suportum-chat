# 08 — Project Branding (logo del proyecto) — Backend

> **Feature ID:** b08
> **Contraparte:** `frontend/features/08-feature-project-branding.md` (f08)
> **Dependencias:** b00 (Foundation), b05 (Upload Images), b06 (Project API)
> **Rama sugerida:** `feature/b08-project-branding`

## 1. Objetivo

Cada proyecto puede tener su propio logo (branding), persistido como URL en `project.settings.logo_url`.
Este spec cubre la parte backend: endpoints de upload/delete del logo y el campo opcional
`logo_data` en el setup inicial. La parte frontend (UI, componentes, i18n) vive en el spec
hermano `f08` — no duplicar lógica de UI acá.

## 2. Endpoints REST (`app/api/v1/projects.py`)

```
POST   /api/v1/projects/me/logo   # Sube/reemplaza el logo del proyecto actual (solo admin)
DELETE /api/v1/projects/me/logo   # Elimina el logo actual, vuelve al default (solo admin)
```

Reutilizar el patrón del endpoint `/upload/{room_id}` (feature b05):
- Misma validación MIME por magic bytes (NO por extensión).
- Mismo `asyncio.to_thread` + Pillow para compresión a WebP.
- Mismo mecanismo de path seguro, pero con un helper nuevo `safe_branding_path()` en
  `app/core/upload.py` (variante de `safe_upload_path()` que no requiere `room_id` ni fecha).
- Path final: `UPLOAD_DIR/{project_id}/branding/logo-{uuid4().hex}.webp`.

### `POST /api/v1/projects/me/logo` (admin only)

- Body: `multipart/form-data` con `file: UploadFile`.
- Validaciones:
  - MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp` (NO `image/svg+xml` — ver Riesgos).
  - Tamaño: ≤ `MAX_LOGO_SIZE_MB` (2 MB).
  - Dimensiones: ≤ `MAX_LOGO_DIMENSION_PX` (512x512 px).
- Procesamiento:
  1. `require_admin` — validar rol.
  2. Leer archivo con límite de tamaño.
  3. Validar MIME por magic bytes.
  4. Comprimir a WebP (`asyncio.to_thread`, reutilizar `compress_to_webp` de b05).
  5. Generar path seguro con `safe_branding_path(project_id)`.
  6. Eliminar logo anterior si existe (buscar patrón `branding/logo-*.webp` en el dir del proyecto).
  7. Guardar el nuevo archivo.
  8. Actualizar `project.settings.logo_url` (merge JSON, igual que `PATCH /projects/me` de b06 — nunca reemplazar el settings completo).
- Respuesta éxito (200): `{ "logo_url": "/uploads/{project_id}/branding/logo-abc123.webp" }`.
- Errores:
  - `413 UPLOAD_TOO_LARGE`
  - `415 UPLOAD_TYPE_NOT_SUPPORTED`
  - `422 UPLOAD_CORRUPT`
  - `500 IMAGE_SAVE_ERROR`

### `DELETE /api/v1/projects/me/logo` (admin only)

- Body: vacío.
- Acción: validar admin → leer `logo_url` actual → si existe, borrar archivo del disco → `logo_url = null` (merge JSON).
- Respuesta éxito (200): `{ "logo_url": null }`.
- Error: `404 LOGO_NOT_FOUND` si no había logo.

## 3. Modelo de datos

`projects.settings` (columna `TEXT`, JSON libre) gana un campo opcional nuevo:

```json
{
  "language": "es",
  "theme": "dark-dragon",
  "position": "bottom-right",
  "button_label": "Soporte",
  "logo_url": "/uploads/abc-123-def/branding/logo-xyz.webp"
}
```

No requiere migración SQL, `settings` ya es JSON libre (sin columnas nuevas en `projects`).

## 4. Setup inicial con logo (`POST /api/v1/setup`)

El Setup Wizard del frontend crea el proyecto en un solo submit. Para permitir subir logo
sin necesitar un proyecto ya creado, `SetupCreateRequest` (`app/models/setup.py`) ya tiene el
campo opcional `logo_data: Optional[str]` (data URI base64). Falta implementarlo en el handler:

- Si `logo_data` viene presente: decodificar, validar MIME por magic bytes (mismas reglas que
  el endpoint de logo), comprimir a WebP, guardar en `UPLOAD_DIR/{project_id}/branding/logo-{uuid}.webp`,
  y setear `logo_url` en el `settings` inicial del proyecto.
- Si no viene o falla la validación silenciosamente no bloquea el setup: el proyecto se crea igual
  sin logo (frontend usa el default AzanoLabs). Loggear el error pero no romper el flujo de creación.
- Reusar la misma función de compresión/validación que usan los endpoints de logo (no duplicar lógica).

## 5. Configuración nueva

`backend/app/config.py`:
```python
MAX_LOGO_SIZE_MB: int = 2
MAX_LOGO_DIMENSION_PX: int = 512
```
(Ya están declarados en `config.py` actual — verificar que siguen ahí, no se tocaron en el hotfix de paths).

`.env.example`:
```bash
MAX_LOGO_SIZE_MB=2
MAX_LOGO_DIMENSION_PX=512
```

## 6. Códigos de error

| Código | HTTP | Notas |
|---|---|---|
| `UPLOAD_TOO_LARGE` | 413 | Reusar el mismo código que b05 |
| `UPLOAD_TYPE_NOT_SUPPORTED` | 415 | Reusar el mismo código que b05 |
| `UPLOAD_CORRUPT` | 422 | Reusar el mismo código que b05 |
| `LOGO_NOT_FOUND` | 404 | Nuevo |
| `IMAGE_SAVE_ERROR` | 500 | Reusar el mismo código que b05 |

## 7. Seguridad

- [ ] `require_admin` en `POST`/`DELETE /me/logo`.
- [ ] `get_scoped_project()` garantiza que el admin solo toca su propio proyecto (IDOR).
- [ ] `safe_branding_path()` usa el mismo `_sanitize_segment` que `safe_upload_path()` — sin path traversal vía `project_id`.
- [ ] **NO aceptar `image/svg+xml`** — un SVG puede llevar `<script>` embebido (XSS). Solo JPEG/PNG/GIF/WebP, validado por magic bytes.
- [ ] Si `logo_data` del setup falla la validación, no debe filtrar detalles internos en el error — solo loggear server-side.

## 8. Desarrollo — Pasos

1. Agregar `MAX_LOGO_SIZE_MB` / `MAX_LOGO_DIMENSION_PX` a `config.py` + `.env.example` (verificar si ya existen).
2. Agregar `safe_branding_path()` en `app/core/upload.py`.
3. Implementar `POST /projects/me/logo` en `app/api/v1/projects.py`.
4. Implementar `DELETE /projects/me/logo` en `app/api/v1/projects.py`.
5. Implementar el manejo de `logo_data` en el handler de `POST /api/v1/setup` (`app/api/v1/setup.py`).
6. Verificar que `app/main.py` sirve `/uploads/{project_id}/branding/...` (el mount de `StaticFiles` ya es recursivo, no debería requerir cambios).
7. Tests: `backend/tests/test_logo.py` — upload válido, MIME inválido, tamaño excedido, IDOR cross-tenant, delete sin logo previo.
8. Verificar: `python -c "from app.main import socket_app; print('OK')"`.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Path traversal vía `project_id` | `safe_branding_path()` con `_sanitize_segment` (igual que `safe_upload_path`) |
| SVG con JS embebido (XSS) | No aceptar `image/svg+xml`; validar MIME por magic bytes, nunca por extensión |
| `logo_data` base64 muy grande en el setup | Validar tamaño decodificado antes de procesar, mismo límite que el endpoint de logo |
| Eliminar logo anterior falla (archivo lockeado) | `try/except` + log warning — no debe romper el upload del nuevo logo |
| `StaticFiles` no sirve `branding/` | Confirmar que el mount en `main.py` es recursivo (ya cubre subdirectorios) |

## 10. Criterios de Aprobación (Done)

- [ ] `POST /projects/me/logo` sube, comprime a WebP, actualiza `settings.logo_url`.
- [ ] `DELETE /projects/me/logo` borra archivo y limpia `settings.logo_url`.
- [ ] `POST /setup` acepta `logo_data` opcional y no rompe el flujo si falla.
- [ ] Non-admin recibe 403 en ambos endpoints de logo.
- [ ] IDOR: admin de proyecto A no puede afectar el logo de proyecto B.
- [ ] SVG rechazado explícitamente.
- [ ] Reviewer confirma APPROVED.
