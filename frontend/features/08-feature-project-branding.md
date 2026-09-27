# 08 — Project Branding (logo del proyecto) — Frontend

> **Feature ID:** f08
> **Contraparte:** `backend/features/08-feature-project-branding.md` (b08)
> **Dependencias:** f00 (Foundation), f06 (Themes), b08 (endpoints de logo)
> **Rama sugerida:** `feature/f08-project-branding`

## 1. Objetivo

Cada proyecto puede tener su propio logo (branding). El logo:

1. Se pide (opcional) durante el Setup Wizard, paso 1, junto con el nombre del proyecto.
2. Si el usuario no sube logo, se usa el logo de AzanoLabs por defecto.
3. Se muestra en 3 lugares: arriba de `LoginView`, arriba del `SetupWizard`, y en el header del widget (`ChatHeader`) una vez logueado.
4. Es editable después por el admin desde `AdminSettings` (pestaña Settings).
5. Se persiste como `project.settings.logo_url` (viene del backend, ver `b08`) — el frontend NO decide el path, solo consume la URL.

La lógica de subida/compresión/validación vive en el backend (`b08`). Este spec cubre
únicamente componentes, hooks, i18n y UX del lado frontend.

## 2. Componentes a Implementar

### Atoms
- `ProjectLogo` (nuevo) — recibe `src?: string | null` y renderiza con fallback al logo default (SVG inline de AzanoLabs).

### Molecules
- `LogoUploader` (nuevo) — input file + preview + botón "Eliminar".

### Organisms (modificar)
- `SetupWizard` — paso 1: agregar input file + preview de logo.
- `LoginView` / `RegisterView` — agregar `<ProjectLogo>` arriba del título.
- `LoadingScreen` — mostrar `<ProjectLogo>` mientras carga.
- `AdminSettings` — nueva sección "Branding".

### Templates (modificar)
- `ChatHeader` — slot de logo a la izquierda del título de room (si no hay logo, se mantiene el `MessageCircle` de Lucide default).

## 3. Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `src/assets/azanolabs-logo.svg` | Crear | Logo default, SVG inline (no archivo externo, para que el bundle de tsup lo incluya bien) |
| `src/atoms/ProjectLogo.tsx` | Crear | Ver contrato abajo |
| `src/molecules/LogoUploader.tsx` | Crear | Ver contrato abajo |
| `src/hooks/useProjectBranding.ts` | Crear | Upload/delete logo vía `apiClient` |
| `src/atoms/index.ts` | Modificar | Exportar `ProjectLogo` |
| `src/molecules/index.ts` | Modificar | Exportar `LogoUploader` |
| `src/organisms/SetupWizard.tsx` | Modificar | Paso 1: agregar uploader |
| `src/organisms/LoginView.tsx` | Modificar | Logo arriba del título |
| `src/organisms/RegisterView.tsx` | Modificar | Logo arriba del título |
| `src/organisms/LoadingScreen.tsx` | Modificar | Mostrar logo |
| `src/organisms/ChatHeader.tsx` | Modificar | Logo a la izquierda del título |
| `src/organisms/AdminSettings.tsx` | Modificar | Nueva sección "Branding" |
| `src/hooks/useProjectSettings.ts` | Modificar | Tipo `ProjectSettings` agrega `logo_url?: string \| null` |
| `src/styles/globals.css` | Modificar | Clases `.project-logo-*`, `.logo-uploader-*`, `.login-logo-wrap` |
| `src/i18n/en.ts` / `src/i18n/es.ts` | Modificar | Strings nuevas (ver sección 6) |
| `apps/demo/src/App.tsx` | Verificar | No debería romperse — usa props públicas de `<SuportumChat>` |

## 4. Contratos de interfaz

**Atom `<ProjectLogo>`:**
```tsx
interface ProjectLogoProps {
  src?: string | null          // URL del logo del proyecto (viene de settings.logo_url)
  size?: 'sm' | 'md' | 'lg'    // 24 / 40 / 64 px
  className?: string
}
// src null/undefined -> renderiza el default (AzanoLabs SVG inline)
```

**Molecule `<LogoUploader>`:**
```tsx
interface LogoUploaderProps {
  currentUrl?: string | null
  apiUrl: string
  onUpload: (url: string) => void | Promise<void>
  onRemove: () => void | Promise<void>
  isUploading: boolean
  error?: string | null
}
```

**Hook `useProjectBranding`:**
```ts
function useProjectBranding(apiUrl: string): {
  uploadLogo: (file: File) => Promise<string>  // POST /projects/me/logo -> retorna logo_url
  deleteLogo: () => Promise<void>              // DELETE /projects/me/logo
  isUploading: boolean
  error: string | null
}
```

## 5. Flujo de UX

**Setup Wizard paso 1 (modificado):**
1. Usuario ingresa nombre del proyecto.
2. Opcional: selecciona imagen de logo (preview en vivo, default AzanoLabs si no sube nada).
3. Click "Siguiente" avanza al paso 2 (cuenta admin) manteniendo el logo en estado local (no se sube todavía).
4. En el submit del paso 2 (creación real del proyecto), si hay logo seleccionado se envía como `logo_data` (base64 con data URI prefix) en el body de `POST /api/v1/setup` — el backend (`b08`) lo procesa server-side. Esto evita subir el archivo antes de que el proyecto exista.

**LoginView / RegisterView:** `<ProjectLogo>` arriba del título (`t('auth.signIn')` / `t('auth.register')`). Sin logo → default.

**ChatHeader:** logo a la izquierda del título de room. Sin logo del proyecto → se mantiene el ícono `MessageCircle` de Lucide (comportamiento actual, sin cambios si no hay logo).

**AdminSettings:** nueva sección "Branding" entre "Nombre del proyecto" y "Theme": preview del logo actual (o "Default AzanoLabs logo"), input file "Subir nuevo logo", botón "Eliminar logo" si hay uno custom. Validación client-side: tamaño ≤ 2 MB, tipo `image/*` (el backend re-valida igual, esto es solo UX).

## 6. Strings i18n a agregar

**`setup.*`:**
- `setup.logoUpload` — "Project logo" / "Logo del proyecto"
- `setup.logoUploadHint` — "Optional. PNG, JPG, GIF or WebP. Max 2 MB." / "Opcional. PNG, JPG, GIF o WebP. Máx 2 MB."
- `setup.logoPreview` — "Preview" / "Vista previa"
- `setup.logoRemove` — "Remove logo" / "Quitar logo"
- `setup.logoDefault` — "Default logo will be used" / "Se usara el logo por defecto"

**`auth.*`:**
- `auth.brandSubtitle` — "Sign in to your project" / "Ingresa a tu proyecto"

**`settings.*`:**
- `settings.branding` — "Branding" / "Identidad de marca"
- `settings.logo` — "Project logo" / "Logo del proyecto"
- `settings.logoCurrent` — "Current logo" / "Logo actual"
- `settings.logoUpload` — "Upload new logo" / "Subir nuevo logo"
- `settings.logoUploadHint` — "PNG, JPG, GIF or WebP. Max 2 MB, 512x512 px." / "PNG, JPG, GIF o WebP. Máx 2 MB, 512x512 px."
- `settings.logoRemove` — "Remove logo" / "Quitar logo"
- `settings.logoUseDefault` — "Use default AzanoLabs logo" / "Usar logo AzanoLabs por defecto"

**`errors.*`:**
- `errors.UPLOAD_TOO_LARGE`, `errors.UPLOAD_TYPE_NOT_SUPPORTED`, `errors.UPLOAD_CORRUPT` — ya existen (de b05/f-upload), reusar.
- `errors.LOGO_NOT_FOUND` — "No logo to remove." / "No hay logo para quitar." (nuevo)

## 7. Reglas críticas (no negociables)

- **R1, R2, R3, R4** del harness — nunca violar.
- **R4 (inline styles):** todo estilo nuevo en `globals.css`, nunca `style={{}}` salvo CSS custom properties dinámicas con prefijo `--` (no aplica en este feature).
- **i18n:** todas las strings nuevas en `i18n/en.ts` e `i18n/es.ts`, nunca hardcodeadas en el JSX.
- **iOS Safari:** inputs `text-base` (16px), touch targets ≥ 44px.

## 8. Out of scope

- Crop / resize manual del logo antes de subir.
- Múltiples logos (light mode / dark mode).
- Logo en emails transaccionales.
- Favicon dinámico.
- Background image / cover del widget.
- Color de marca custom derivado del logo.
- Historial de versiones del logo.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El default logo no se ve en el bundle final de tsup | Usar SVG inline (no archivo externo importado) — más portable |
| Cache del navegador muestra logo viejo tras reemplazo | Agregar `?v={uuid}` al URL del logo, o depender del `Cache-Control: no-cache` que devuelva el backend |
| `logo_data` base64 muy grande en el submit del setup | Validar tamaño client-side antes de enviar (el backend igual re-valida) |

## 10. Desarrollo — Pasos

1. Crear `assets/azanolabs-logo.svg`.
2. Crear `atoms/ProjectLogo.tsx` + clases CSS.
3. Crear `hooks/useProjectBranding.ts`.
4. Crear `molecules/LogoUploader.tsx` + clases CSS.
5. Modificar `SetupWizard.tsx` paso 1: agregar uploader (estado local, sin subir todavía).
6. Modificar `LoginView.tsx` / `RegisterView.tsx`: logo arriba del título.
7. Modificar `LoadingScreen.tsx`: mostrar logo.
8. Modificar `ChatHeader.tsx`: logo a la izquierda del título.
9. Modificar `AdminSettings.tsx`: nueva sección Branding.
10. Modificar `i18n/en.ts` + `i18n/es.ts`.
11. Modificar `globals.css` con clases nuevas.
12. Verificar: `pnpm typecheck` + `pnpm build`.
13. **Verificar R4:** `Select-String -Path "frontend\packages\**\*.tsx" -Pattern "style=\{\{" -Recurse` → ningún hit fuera de CSS custom properties.

## 11. Validación E2E (requiere b08 ya implementado y deployado en local)

1. Levantar backend con los endpoints de `b08` ya implementados.
2. Levantar demo: `pnpm dev`.
3. Setup wizard: completar nombre + subir logo.
4. Verificar el logo en preview del paso 1, en login, y en loading screen.
5. Login con admin → ver logo en `ChatHeader`.
6. `AdminSettings` → cambiar logo → ver cambio en vivo.
7. `AdminSettings` → eliminar logo → vuelve al default.
8. Verificar en mobile (375px) y desktop (1280px).

## 12. Criterios de Aprobación (Done)

- [ ] Setup Wizard permite subir logo opcional en paso 1, se ve en preview.
- [ ] LoginView / RegisterView / LoadingScreen muestran el logo del proyecto (o default).
- [ ] ChatHeader muestra el logo (o el ícono default de Lucide si no hay).
- [ ] AdminSettings permite subir/eliminar el logo con feedback de carga y error.
- [ ] Ningún `style={{}}` fuera de CSS custom properties (R4).
- [ ] Todas las strings nuevas están en `en.ts` y `es.ts`.
- [ ] Reviewer confirma APPROVED.
