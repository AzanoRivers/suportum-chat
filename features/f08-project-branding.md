# F08 — Project Branding (logo del proyecto)

> **Feature ID:** f08
> **Tipo:** full-stack (backend + frontend)
> **Modo recomendado:** A (Implementer único)
> **Dependencias:** f00 (Foundation), f06 (Themes ya en admin settings)
> **Rama sugerida:** `feature/f08-project-branding`

## Objetivo

Cada proyecto puede tener su propio logo (branding). El logo:

1. **Se pide durante el Setup Wizard (paso 1)** — junto con el nombre del proyecto.
2. **Si el usuario no sube logo, se usa el logo de AzanoLabs por defecto.**
3. **Se muestra en 3 lugares:**
   - Arriba del formulario de LoginView
   - Arriba del Setup Wizard (cuando se accede antes del setup)
   - En el header del widget una vez logueado
4. **Es editable después por el admin** desde AdminSettings (pestaña Settings).
5. **Se persiste** como campo `project.settings.logo_url` (URL al archivo estático) o `null` para usar el default.

---

## Decisiones de diseño

### Backend

- **Reutilizar el patrón del endpoint `/upload/{room_id}`** pero crear uno nuevo: `POST /api/v1/projects/me/logo`.
  - Misma validación MIME por magic bytes.
  - Mismo `asyncio.to_thread` + Pillow.
  - Mismo path seguro: `UPLOAD_DIR/{project_id}/branding/logo-{uuid}.webp` (sin room_id, sin fecha).
  - Devuelve `{ "url": "/uploads/{project_id}/branding/logo-{uuid}.webp" }`.
- **Endpoint `DELETE /api/v1/projects/me/logo`**: elimina el archivo en disco y borra `logo_url` del settings.
- **`project.settings.logo_url`**: nuevo campo. Si es `null` o string vacío → frontend usa el default AzanoLabs.
- **Multi-tenant:** todo filtrado por `project_id` del JWT/scoped.
- **Solo admin** puede cambiar el logo.

### Frontend

- **Nuevo atom `Logo` o `molecule ProjectLogo`** que recibe `src?: string` y renderiza con fallback al default.
- **Default logo:** importar como asset estático desde `packages/suportum-chat/src/assets/azanolabs-logo.png` (SVG preferido por tamaño).
- **Paso 1 del Setup Wizard:** agregar input file + preview. Validar MIME client-side. Subir al backend en el momento del submit del paso 2 (no antes, para no perder uploads si el usuario cancela).
- **LoginView:** `<ProjectLogo>` arriba del título `t('auth.signIn')`. Si no hay logo, muestra el default.
- **ChatHeader:** agregar slot a la izquierda del título de room. Si no hay logo, muestra un `<MessageCircle>` de Lucide (default).
- **AdminSettings:** nueva sección "Branding" con preview del logo actual + botón "Subir logo" + "Eliminar logo".

### Reglas críticas (no negociables)

- **R1, R2, R3, R4** del harness — NUNCA violar.
- **R4 (inline styles):** todo estilo nuevo en `globals.css`, nunca inline. La única excepción
  permitida es CSS custom properties dinámicas con prefijo `--` (no aplica acá).
- **i18n:** todas las nuevas strings en `i18n/en.ts` e `i18n/es.ts`.
- **iOS Safari:** inputs `text-base`, touch targets ≥ 44px, `100dvh` con fallback donde corresponda.
- **Seguridad multi-tenant:** `logo_url` SIEMPRE filtrado por `project_id` antes de cualquier operación.
- **Path traversal:** usar `safe_upload_path` con el segmento `branding/` (NO `chat/`).
- **Validación MIME:** magic bytes, no extensión del archivo.
- **Tamaño máximo:** 2 MB para logos (más chico que imágenes de chat).
- **Dimensiones máximas:** 512x512 px (logos no necesitan más).

---

## Cambios Backend

### Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `backend/app/api/v1/projects.py` | Modificar | Agregar `POST /me/logo` y `DELETE /me/logo` |
| `backend/app/core/upload.py` | Modificar | Agregar `safe_branding_path()` (variante de `safe_upload_path` para branding) |
| `backend/tests/test_logo.py` | Crear | Tests: upload válido, MIME inválido, tamaño excedido, IDOR cross-tenant |
| `backend/app/main.py` | Verificar | StaticFiles mount ya cubre `/uploads/{project_id}/branding/` |

### Contratos

**`POST /api/v1/projects/me/logo`** (admin only)
- Body: `multipart/form-data` con `file: UploadFile`
- Validaciones:
  - MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Tamaño: ≤ 2 MB (`MAX_LOGO_SIZE_MB` en config)
  - Dimensiones: ≤ 512x512 px
- Procesamiento:
  1. Validar acceso admin (`require_admin`)
  2. Leer con límite de tamaño
  3. Validar MIME por magic bytes
  4. Comprimir a WebP con `asyncio.to_thread` (reutilizar `compress_to_webp`)
  5. Generar path seguro: `UPLOAD_DIR/{project_id}/branding/logo-{uuid4().hex}.webp`
  6. Eliminar logo anterior (si existe) — búsqueda por patrón `branding/logo-*.webp`
  7. Guardar nuevo archivo
  8. Actualizar `project.settings.logo_url` (merge JSON, no reemplaza otros settings)
- Respuesta éxito (200): `{ "logo_url": "/uploads/{project_id}/branding/logo-abc123.webp" }`
- Errores:
  - `413 UPLOAD_TOO_LARGE` si > 2 MB
  - `415 UPLOAD_TYPE_NOT_SUPPORTED` si MIME no permitido
  - `422 UPLOAD_CORRUPT` si no se puede comprimir
  - `500 IMAGE_SAVE_ERROR` si falla el guardado en disco

**`DELETE /api/v1/projects/me/logo`** (admin only)
- Body: vacío
- Acción:
  1. Validar admin
  2. Leer `logo_url` actual del proyecto
  3. Si existe, eliminar el archivo del disco
  4. Setear `project.settings.logo_url = null` (merge JSON)
- Respuesta éxito (200): `{ "logo_url": null }`
- Errores: `404 LOGO_NOT_FOUND` si no había logo

### Modelo de datos

**`projects.settings`** (TEXT, JSON) — se agrega un nuevo campo opcional:
```json
{
  "language": "es",
  "theme": "dark-dragon",
  "position": "bottom-right",
  "button_label": "Soporte",
  "logo_url": "/uploads/abc-123-def/branding/logo-xyz.webp"
}
```

No requiere migración de SQL — la columna `settings` es JSON libre.

### Configuración nueva (`backend/app/config.py` + `.env.example`)

```python
MAX_LOGO_SIZE_MB: int = 2
MAX_LOGO_DIMENSION_PX: int = 512
```

```bash
# .env.example
MAX_LOGO_SIZE_MB=2
MAX_LOGO_DIMENSION_PX=512
```

---

## Cambios Frontend

### Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `packages/suportum-chat/src/assets/azanolabs-logo.svg` | Crear | Logo default AzanoLabs (SVG inline) |
| `packages/suportum-chat/src/atoms/ProjectLogo.tsx` | Crear | Atom: renderiza logo con fallback al default |
| `packages/suportum-chat/src/molecules/LogoUploader.tsx` | Crear | Molecule: input file + preview + botón eliminar |
| `packages/suportum-chat/src/hooks/useProjectBranding.ts` | Crear | Hook: upload/delete logo via apiClient |
| `packages/suportum-chat/src/atoms/index.ts` | Modificar | Exportar `ProjectLogo` |
| `packages/suportum-chat/src/molecules/index.ts` | Modificar | Exportar `LogoUploader` |
| `packages/suportum-chat/src/organisms/SetupWizard.tsx` | Modificar | Paso 1: agregar uploader de logo |
| `packages/suportum-chat/src/organisms/LoginView.tsx` | Modificar | Header: agregar `<ProjectLogo>` arriba del título |
| `packages/suportum-chat/src/organisms/RegisterView.tsx` | Modificar | Header: agregar `<ProjectLogo>` arriba del título |
| `packages/suportum-chat/src/organisms/LoadingScreen.tsx` | Modificar | Mostrar `<ProjectLogo>` mientras carga |
| `packages/suportum-chat/src/organisms/ChatHeader.tsx` | Modificar | Agregar logo a la izquierda del título |
| `packages/suportum-chat/src/organisms/AdminSettings.tsx` | Modificar | Nueva sección "Branding" |
| `packages/suportum-chat/src/hooks/useProjectSettings.ts` | Modificar | Tipo `ProjectSettings` agregar `logo_url?: string \| null` |
| `packages/suportum-chat/src/styles/globals.css` | Modificar | Clases `.project-logo-*`, `.logo-uploader-*`, `.login-logo-wrap` |
| `packages/suportum-chat/src/i18n/en.ts` | Modificar | Strings nuevas en `setup.*`, `auth.*`, `settings.*`, `errors.*` |
| `packages/suportum-chat/src/i18n/es.ts` | Modificar | Idem en español |
| `apps/demo/src/App.tsx` | Verificar | No debería romperse — usa `<SuportumChat>` con props públicas |

### Contratos de interfaz

**Atom `<ProjectLogo>`** (`atoms/ProjectLogo.tsx`):
```tsx
interface ProjectLogoProps {
  src?: string | null          // URL del logo del proyecto
  size?: 'sm' | 'md' | 'lg'    // 24 / 40 / 64 px
  className?: string
}
// Si src es null/undefined → renderiza default (AzanoLabs SVG inline)
```

**Molecule `<LogoUploader>`** (`molecules/LogoUploader.tsx`):
```tsx
interface LogoUploaderProps {
  currentUrl?: string | null
  apiUrl: string
  onUpload: (url: string) => void | Promise<void>
  onRemove: () => void | Promise<void>
  isUploading: boolean
  error?: string | null
}
// Muestra preview actual + input file + botón "Eliminar"
```

**Hook `useProjectBranding`** (`hooks/useProjectBranding.ts`):
```ts
function useProjectBranding(apiUrl: string): {
  uploadLogo: (file: File) => Promise<string>  // retorna nueva URL
  deleteLogo: () => Promise<void>
  isUploading: boolean
  error: string | null
}
```

### Strings i18n a agregar

**`setup.*` (en y es):**
- `setup.logoUpload` — "Project logo" / "Logo del proyecto"
- `setup.logoUploadHint` — "Optional. PNG, JPG, GIF or WebP. Max 2 MB." / "Opcional. PNG, JPG, GIF o WebP. Máx 2 MB."
- `setup.logoPreview` — "Preview" / "Vista previa"
- `setup.logoRemove` — "Remove logo" / "Quitar logo"
- `setup.logoDefault` — "Default logo will be used" / "Se usara el logo por defecto"

**`auth.*` (en y es):**
- `auth.brandSubtitle` — "Sign in to your project" / "Ingresa a tu proyecto"

**`settings.*` (en y es):**
- `settings.branding` — "Branding" / "Identidad de marca"
- `settings.logo` — "Project logo" / "Logo del proyecto"
- `settings.logoCurrent` — "Current logo" / "Logo actual"
- `settings.logoUpload` — "Upload new logo" / "Subir nuevo logo"
- `settings.logoUploadHint` — "PNG, JPG, GIF or WebP. Max 2 MB, 512x512 px." / "PNG, JPG, GIF o WebP. Máx 2 MB, 512x512 px."
- `settings.logoRemove` — "Remove logo" / "Quitar logo"
- `settings.logoUseDefault` — "Use default AzanoLabs logo" / "Usar logo AzanoLabs por defecto"

**`errors.*` (en y es):**
- `errors.UPLOAD_TOO_LARGE` — "File is too large. Max 2 MB." / "Archivo demasiado grande. Máx 2 MB."
- `errors.UPLOAD_TYPE_NOT_SUPPORTED` — "File type not supported." / "Tipo de archivo no soportado."
- `errors.UPLOAD_CORRUPT` — "File is not a valid image." / "El archivo no es una imagen válida."
- `errors.LOGO_NOT_FOUND` — "No logo to remove." / "No hay logo para quitar."

### Flujo de UX

**Setup Wizard paso 1 (modificado):**
1. Usuario ingresa nombre del proyecto
2. Opcional: arrastra o selecciona imagen
3. Preview en vivo (default AzanoLabs si no sube nada)
4. Click "Siguiente" → avanza al paso 2
5. En el submit del paso 2, si hay logo seleccionado, primero se hace POST al endpoint de upload, después se crea el proyecto con el `logo_url` resultante

**Nota:** El setup actual es un solo POST que crea proyecto + admin user. Para evitar romper el flujo, el orden será:
- Paso 1: nombre + logo (estado local)
- Paso 2: si hay logo, primero POST /projects/me/logo (requiere proyecto existente), después continuar con admin... PERO el proyecto todavía no existe.

**Solución:** Modificar el endpoint setup o crear un endpoint temporal. La opción más simple es:
- **Crear el proyecto primero** (con logo_url opcional) en el submit del paso 1 (no del paso 2). Después seguir con el admin user en el paso 2.
- O agregar `logo_data` (base64) en el body del setup y procesarlo después.

**Decisión recomendada:** Modificar `POST /api/v1/setup` para aceptar `logo_base64?: string` opcional. Si viene, se guarda como archivo en branding/ durante el setup y se setea `logo_url` en settings. Esto evita crear un endpoint temporal.

Alternativa más simple: hacer el upload de logo en el paso 2 (admin submit) pero como multipart. Es más complejo.

**Decisión final (a confirmar con el usuario):** modificar `POST /api/v1/setup` para aceptar `logo_data` opcional en el body. Si está presente, se procesa en el backend.

**Setup Wizard paso 2 (modificado):** el body del POST ahora incluye `logo_data?: string` (base64 con data URI prefix, ej. `data:image/png;base64,iVBORw0K...`).

**LoginView (modificado):**
```
┌─────────────────────────┐
│   [LOGO]                │
│   Sign in               │
│   ─────────             │
│   email                 │
│   [______________]      │
│   password              │
│   [______________]      │
│   [ Sign in ]           │
└─────────────────────────┘
```

**ChatHeader (modificado):**
```
┌──────────────────────────────────┐
│ [LOGO] Room name  ⚙ ⚊ ✕        │
└──────────────────────────────────┘
```
Si no hay logo del proyecto, se mantiene el `MessageCircle` de Lucide como antes (no se ve afectado el default).

**AdminSettings (modificado):**
- Nueva sección "Branding" entre "Nombre del proyecto" y "Theme":
  - Preview del logo actual (o "Default AzanoLabs logo" si no hay custom)
  - Input file con label "Upload new logo"
  - Botón "Remove logo" si hay custom logo
  - Validación client-side: tamaño ≤ 2 MB, tipo image/*

---

## Códigos de error nuevos

| Código | HTTP | i18n key |
|---|---|---|
| `UPLOAD_TOO_LARGE` | 413 | `errors.UPLOAD_TOO_LARGE` (ya existe, reusar) |
| `UPLOAD_TYPE_NOT_SUPPORTED` | 415 | `errors.UPLOAD_TYPE_NOT_SUPPORTED` (ya existe, reusar) |
| `UPLOAD_CORRUPT` | 422 | `errors.UPLOAD_CORRUPT` (ya existe, reusar) |
| `LOGO_NOT_FOUND` | 404 | `errors.LOGO_NOT_FOUND` (nuevo) |
| `IMAGE_SAVE_ERROR` | 500 | `errors.IMAGE_SAVE_ERROR` (ya existe, reusar) |

---

## Plan de implementación sugerido

### Paso 1 — Backend (2-3 horas)

1. Agregar `MAX_LOGO_SIZE_MB` y `MAX_LOGO_DIMENSION_PX` a `config.py` + `.env.example`
2. Agregar `safe_branding_path()` en `core/upload.py` (variante que NO requiere room_id/year/month)
3. Implementar `POST /projects/me/logo` en `api/v1/projects.py`
4. Implementar `DELETE /projects/me/logo` en `api/v1/projects.py`
5. Modificar `POST /api/v1/setup` para aceptar `logo_data` opcional
6. Tests: `tests/test_logo.py`
7. Verificar: `python -c "from app.main import socket_app; print('OK')"`
8. Verificar IDOR: que un admin de proyecto A no pueda ver/eliminar logo de proyecto B

### Paso 2 — Frontend (3-4 horas)

1. Crear `assets/azanolabs-logo.svg` (logo default como asset)
2. Crear `atoms/ProjectLogo.tsx` + clases CSS
3. Crear `hooks/useProjectBranding.ts`
4. Crear `molecules/LogoUploader.tsx` + clases CSS
5. Modificar `SetupWizard.tsx` paso 1: agregar uploader
6. Modificar `LoginView.tsx`: agregar logo arriba del título
7. Modificar `RegisterView.tsx`: agregar logo arriba del título
8. Modificar `LoadingScreen.tsx`: mostrar logo
9. Modificar `ChatHeader.tsx`: agregar logo a la izquierda del título
10. Modificar `AdminSettings.tsx`: nueva sección Branding
11. Modificar `i18n/en.ts` + `i18n/es.ts` con strings nuevas
12. Modificar `globals.css` con clases nuevas
13. Verificar: `pnpm typecheck` + `pnpm build`
14. **Verificar R4:** `Select-String -Path "frontend\packages\**\*.tsx" -Pattern "style=\{\{" -Recurse` → cada hit debe ser SOLO CSS vars (ninguno debería aparecer en este feature)

### Paso 3 — Validación E2E

1. Levantar backend: `uvicorn app.main:socket_app --reload --port 8001`
2. Levantar demo: `pnpm dev`
3. Borrar DB local (lo hace el usuario)
4. Setup wizard paso 1: completar nombre + subir logo
5. Verificar que el logo se ve en paso 1 preview, en login, en loading
6. Login con admin → ver logo en ChatHeader
7. AdminSettings → cambiar logo → ver cambio en vivo
8. AdminSettings → eliminar logo → volver al default
9. Verificar en mobile (375px) y desktop (1280px)

---

## Out of scope (no se implementa en esta feature)

- Crop / resize manual del logo antes de subir
- Múltiples logos (light mode / dark mode)
- Logo en emails transaccionales
- Favicon dinámico
- Background image / cover del widget
- Color de marca custom (paleta derivada del logo)
- Versión del logo (diff en historial)

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El setup falla con logo base64 muy grande (request > 2.5 MB) | Validar tamaño client-side antes de enviar; usar multipart si la opción A no funciona |
| Path traversal con `project_id` malicioso | Usar `safe_branding_path()` con `_sanitize_segment` (igual que `safe_upload_path`) |
| El logo default no se ve en el bundle final de tsup | Usar SVG inline (no archivo externo) para el default — más portable |
| Eliminar logo anterior falla (archivo locked) | Try/except + logger.warning — no romper el upload del nuevo |
| StaticFiles no sirve la nueva ruta `branding/` | El mount en `main.py` es recursivo: `app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR))` — ya cubre subdirs |
| Cache del navegador muestra logo viejo | Agregar `?v={uuid}` al URL del logo en frontend, o forzar `Cache-Control: no-cache` en respuestas |
| El usuario sube un SVG con JavaScript embebido (XSS) | NO aceptar `image/svg+xml` — solo JPEG, PNG, GIF, WebP. Validar MIME por magic bytes, no por extensión |
