# Review f05 — User Management Frontend

## R_ATOMIC
PASS — Ninguna molecule importa de organisms o templates. `UserRow` importa correctamente de `../atoms/Avatar` y de moléculas hermanas. `RoleBadge` y `UserActions` solo importan de atoms/i18n/store. No hay violaciones de jerarquía.

## R_CSS
FAIL — Se encontraron colores de Tailwind directos en los siguientes archivos f05:

- `src/organisms/AdminUsers.tsx:60` — `text-white` (botón invite)
- `src/organisms/AdminUsers.tsx:130` — `bg-black/40` (overlay modal crear)
- `src/organisms/AdminUsers.tsx:146` — `bg-black/40` (overlay modal editar)
- `src/organisms/ProfilePanel.tsx:164` — `text-white` (botón guardar username)
- `src/organisms/ProfilePanel.tsx:204` — `text-white` (botón guardar password)
- `src/organisms/UserCreateForm.tsx:89` — `text-white` (botón submit)
- `src/organisms/UserEditForm.tsx:72` — `bg-white` (knob del toggle switch)
- `src/organisms/UserEditForm.tsx:89` — `text-white` (botón submit)
- `src/organisms/UserDetail.tsx:122` — `bg-black/40` (overlay modal edit form)

## R_I18N
PASS — Todos los textos visibles usan `t('...')`. El separador `: ` en `UserEditForm.tsx:43` es puntuación (no texto hardcodeado). El literal `"ID"` en `UserDetail.tsx:82` es un término técnico (excepción válida). No se encontraron strings en inglés o español hardcodeados en JSX.

## R_IOS
PASS — Todos los `<input>` en los archivos f05 tienen `text-base` en className:
- `UserCreateForm.tsx:48,58,67` — confirmado
- `ProfilePanel.tsx:153,184,193` — confirmado

Todos los contenedores con scroll tienen `style={{ WebkitOverflowScrolling: 'touch' }}`:
- `AdminUsers.tsx:69,107,133` — confirmado
- `UserDetail.tsx:52` — confirmado
- `ProfilePanel.tsx:122` — confirmado

## R_SECURITY
PASS — Verificados todos los criterios:
- `ProfilePanel` no tiene selector de rol: confirmado (solo campos username y password).
- `UserEditForm.tsx:23` tiene `if (user.id === userId) return null`: confirmado.
- `UserRow.tsx:42` oculta `<UserActions>` cuando `isAdmin && !isCurrentUser`: confirmado (botones edit/deactivate no renderizan para el usuario actual).
- `UserDetail.tsx:24` usa `const canManage = !isCurrentUser` y envuelve el bloque de acciones en `{canManage && ...}`: confirmado.
- El store `userStore.ts` no tiene campo `password` en la interfaz `User`: confirmado.

## R_TYPECHECK
PASS — `pnpm typecheck` ejecutado con exit code 0, sin errores ni warnings:
```
$ tsc --noEmit
(sin output)
```

## R_BARRELS
PASS — Todos los componentes nuevos están exportados en sus barrels:

`molecules/index.ts` exporta:
- `RoleBadge` ✓
- `UserActions` ✓
- `UserRow` ✓

`organisms/index.ts` exporta:
- `AdminUsers` ✓
- `UserDetail` ✓
- `UserCreateForm` ✓
- `UserEditForm` ✓
- `ProfilePanel` ✓

## R_204
PASS — `src/lib/api.ts:61-63` implementa el check correctamente:
```typescript
if (response.status === 204 || response.headers.get('content-length') === '0') {
  return undefined as T
}
return response.json()  // línea 65
```
El check ocurre ANTES de `response.json()` y DESPUÉS de los checks de error (!response.ok en línea 56). Orden correcto.

## Veredicto final
REJECTED

### Issues bloqueantes

**R_CSS — 9 violaciones de color de Tailwind directo:**

1. `src/organisms/AdminUsers.tsx:60` — Reemplazar `text-white` con `text-[--color-text-on-accent]` (o definir el token) o `style={{ color: 'white' }}` NO es válido tampoco; el correcto es usar la variable CSS del design system. Si no existe token para texto sobre accent, crearlo en globals.css como `--color-text-on-accent: #ffffff` y usar `text-[--color-text-on-accent]`.

2. `src/organisms/AdminUsers.tsx:130` — Reemplazar `bg-black/40` con `bg-[--color-overlay]`. Definir en globals.css: `--color-overlay: rgba(0,0,0,0.4)` y usar `bg-[--color-overlay]`.

3. `src/organisms/AdminUsers.tsx:146` — Mismo fix que #2: reemplazar `bg-black/40` con `bg-[--color-overlay]`.

4. `src/organisms/ProfilePanel.tsx:164` — Reemplazar `text-white` con `text-[--color-text-on-accent]`.

5. `src/organisms/ProfilePanel.tsx:204` — Reemplazar `text-white` con `text-[--color-text-on-accent]`.

6. `src/organisms/UserCreateForm.tsx:89` — Reemplazar `text-white` con `text-[--color-text-on-accent]`.

7. `src/organisms/UserEditForm.tsx:72` — El knob del toggle switch usa `bg-white`. Reemplazar con `bg-[--color-toggle-knob]`. Definir en globals.css: `--color-toggle-knob: #ffffff`.

8. `src/organisms/UserEditForm.tsx:89` — Reemplazar `text-white` con `text-[--color-text-on-accent]`.

9. `src/organisms/UserDetail.tsx:122` — Reemplazar `bg-black/40` con `bg-[--color-overlay]`.

**Acción requerida para el implementer:** Definir los tokens faltantes en `src/styles/globals.css` dentro del bloque `@theme {}`:
```css
--color-text-on-accent: #ffffff;   /* texto sobre color accent */
--color-overlay: rgba(0,0,0,0.4);  /* fondo de modales/overlays */
--color-toggle-knob: #ffffff;      /* knob de toggle switch */
```
Luego reemplazar cada clase listada arriba con su equivalente CSS variable.
