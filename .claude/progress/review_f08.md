# Review: f08 - Project Branding (Frontend) - RONDA 2

## Veredicto: APPROVED

Segunda pasada, tras el REJECTED de la ronda 1 (3 issues). Se verifican unicamente
los 3 fixes reportados por el Implementer en `.claude/progress/impl_f08.md`, mas
un chequeo general de regresion.

## Fix 1 - Logo default ahora es SVG inline (decision de negocio del usuario: usar placeholder generico)

- `atoms/AzanoLogo.tsx`: confirmado. Es un `<svg>` JSX inline (viewBox, `<defs>`,
  `<linearGradient>`, `<text>`, `<circle>`). Cero `<img src>`, cero import de
  `assets/azanolabs-logo.svg`, cero base64 embebido. Respeta la decision del
  usuario de usar el placeholder generico en vez del PNG de marca real.
- Bundle: build real corrido en esta sesion confirma ESM `dist/index.mjs`
  **206.44 KB**, CJS `dist/index.js` **216.42 KB** (bajo de 310.26 KB / 320.18 KB
  de la ronda 1, una caida de ~104 KB que coincide con el string base64 PNG
  removido). No vuelve a los ~123 KB originales, pero el propio Implementer
  documenta que el resto del delta es trabajo no relacionado (f09) ya presente
  en el arbol de trabajo. Aceptado, es una explicacion verificable y consistente
  (f09 agrega endpoints/hooks nuevos que tambien entran al bundle).
- `styles/molecules/project-logo.css`: `.login-logo-wrap .project-logo--default .azano-logo`
  tiene `height: 40px; width: auto; max-width: 100%;`. El SVG tiene
  `viewBox="0 0 120 32"` (aspect ratio 3.75:1), entonces a 40px de alto el ancho
  resultante es ~150px, muy por debajo de los 430px del panel del widget y del
  contenedor `.login-logo-wrap` (flex, `justify-content: center`, sin ancho fijo
  que fuerce overflow). `max-width: 100%` actua como salvaguarda adicional en
  mobile. No hay overflow evidente leyendo el CSS ni por calculo de aspect ratio.
- Regla `.project-logo--default svg { width: auto; height: 100%; max-width: 100%; }`
  combinada con `object-fit: contain` (heredado de la regla anterior en el mismo
  archivo) es pre-existente y no forma parte de este fix; confirmado que no
  introduce overflow en los slots cuadrados (`--sm`/`--md`/`--lg`) porque
  `object-fit: contain` + `max-width: 100%` acotan el render dentro de la caja.

## Fix 2 - Touch target del boton "Quitar logo"

- `styles/organisms/setup.css` L44-56, `.setup-logo-remove`: confirmado
  `min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center;`
  presentes. Area tactil de 44x44px garantizada.

## Fix 3 - `apiClient` soporta FormData + `useProjectBranding` usa `apiClient`

- `lib/api.ts` `request()`: detecta `options.body instanceof FormData` y omite
  el header `Content-Type` en ese caso (deja que el browser setee el boundary
  multipart). Para cualquier otro body, sigue forzando
  `'Content-Type': 'application/json'` como antes. El interceptor de
  401 -> `tryRefreshToken()` -> retry, o `clearSession()` + throw, esta dentro
  de la misma funcion `request()` y no tiene ninguna rama condicionada al tipo
  de body: aplica igual para FormData que para JSON. Se agrego
  `apiClient.postForm<T>(path, formData)` sin tocar la firma de
  `get/post/put/patch/delete` existentes.
- Verificado que ningun otro caller se rompe: `apiClient.post()` se usa en
  `hooks/useOrders.ts:52` y `hooks/useTickets.ts:36`, ambos con objetos planos
  (no `FormData`), por lo tanto `isFormData` es `false` y siguen recibiendo
  `Content-Type: application/json` sin cambios de comportamiento.
- `hooks/useProjectBranding.ts`: reescrito completo, usa
  `apiClient.postForm('/api/v1/projects/me/logo', formData)` para upload y
  `apiClient.delete('/api/v1/projects/me/logo')` para remove. Cero `fetch()`
  manual. Pasa por el mismo interceptor de refresh/401/`clearSession()` que
  `useProjectSettings.ts`/`useUsers.ts`.
- `molecules/LogoUploader.tsx`: sin cambios de contrato, sigue consumiendo
  `useProjectBranding(apiUrl)` -> `{ uploadLogo, deleteLogo, isUploading, error }`
  sin romper nada.

## Chequeo general de regresion (corrido en esta sesion)

```
pnpm --filter suportum-chat typecheck   -> exit 0, 0 errores
pnpm --filter suportum-chat build       -> exit 0
  CJS dist/index.js  216.42 KB
  ESM dist/index.mjs 206.44 KB
grep style={{ en *.tsx (todo el package)
  -> 3 hits: FadeTransition.tsx, ThemeCard.tsx, AppLauncher.tsx
     los 3 son CSS custom properties (--ft-duration, --tc-*, --app-color/--icon-delay)
     tipadas `as React.CSSProperties`, ninguno de f08. R4: OK.
grep em dash (—) en *.tsx/*.ts/*.css (todo el package)
  -> 0 resultados. R1: OK.
```

## Checkpoints Verificados

- [x] Logo default renderizado como SVG inline en JSX, sin `<img>`, sin import
      de archivo externo, sin base64.
- [x] Bundle reducido de forma sensible respecto a los 310 KB de la ronda 1
      (206.44 KB ESM), confirmado con build real, no solo con el reporte del
      Implementer.
- [x] `project-logo.css`: wordmark a `height: 40px`, aspect ratio correcto,
      sin overflow del panel de 430px.
- [x] `.setup-logo-remove`: `min-height`/`min-width: 44px`.
- [x] `apiClient.request()` detecta `FormData` y omite `Content-Type` solo en
      ese caso, preservando `application/json` para el resto de callers.
- [x] Interceptor de 401 / refresh / `clearSession()` se aplica igual para
      FormData y JSON (misma funcion `request()`, sin bifurcacion).
- [x] `useProjectBranding.ts` usa `apiClient.postForm`/`apiClient.delete`, cero
      `fetch()` manual.
- [x] `useOrders.ts`/`useTickets.ts` (callers JSON existentes de `apiClient.post`)
      no sufren regresion: siguen mandando `Content-Type: application/json`.
- [x] R1 (em dash): 0 ocurrencias en todo el package.
- [x] R4 (inline styles): unicos 3 hits son CSS custom properties validas.
- [x] `pnpm --filter suportum-chat typecheck` y `build` limpios.

## Notas Adicionales

- La nota fuera de scope del Implementer (ProjectLogo ausente en el header del
  SetupWizard) queda registrada pero no bloqueante, tal como el propio reporte
  la marca: no es parte de los 3 issues de esta ronda ni de los checkpoints
  explicitos de F08.
- Decision de negocio del usuario sobre el SVG placeholder vs PNG de marca real
  no fue reabierta, solo se valido que la implementacion la respeta.

---

# Review: f08 - Project Branding (Frontend) - RONDA 3 (light)

## Veredicto: APPROVED

Ronda 3, constante compartida de validacion de logo. Pasada rapida (reviewer light)
sobre un ajuste puntual, no una feature nueva; F08 ya paso por el reviewer completo
en ronda 2.

## Checkpoints verificados (spot-check)

- [x] `lib/constants.ts` existe y exporta `MAX_LOGO_SIZE_MB = 2`,
      `MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024`, y
      `ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const`.
- [x] Valores coinciden con el backend: `config.py` tiene `MAX_LOGO_SIZE_MB: int = 2`
      (identico), `upload.py` tiene
      `ALLOWED_MIMES = frozenset({"image/jpeg", "image/png", "image/gif", "image/webp"})`,
      mismo set de 4 tipos que `ALLOWED_LOGO_MIME_TYPES` (orden distinto, no importa
      para un chequeo de membership).
- [x] `LogoUploader.tsx`: sin constantes locales duplicadas, importa
      `MAX_LOGO_SIZE_BYTES`/`ALLOWED_LOGO_MIME_TYPES` desde `../lib/constants`.
      Usa `file.size > MAX_LOGO_SIZE_BYTES` y
      `ALLOWED_LOGO_MIME_TYPES.includes(file.type as typeof ALLOWED_LOGO_MIME_TYPES[number])`,
      equivalente en runtime al `Array.includes` anterior, el cast es solo para
      satisfacer el tipo `readonly` de la tupla `as const`.
- [x] `SetupWizard.tsx`: mismo patron, cero literal `2 * 1024 * 1024` inline, cero
      array de mimes inline, importa desde `../lib/constants`.
- [x] Grep en todo el package de `MAX_SIZE_BYTES`/`ALLOWED_TYPES` (nombres viejos):
      0 resultados, no quedo nada huerfano.
- [x] R1 (em dash): 0 ocurrencias en `constants.ts`, `LogoUploader.tsx`,
      `SetupWizard.tsx`.
- [x] R4 (inline styles): grep `style={{` en los 3 archivos, 0 resultados. Es una
      extraccion pura de constantes, no toco JSX de estilos.
- [x] `pnpm --filter suportum-chat typecheck`: exit 0, 0 errores.
- [x] `pnpm --filter suportum-chat build`: exit 0, ESM `dist/index.mjs` 210.12 KB,
      CJS `dist/index.js` 220.41 KB.

## Notas adicionales

- Cambio acotado a extraccion de constantes compartidas, sin logica nueva. Decision
  de no usar `.env`/`import.meta.env` (paquete npm compilado con tsup, no lee env en
  runtime) ya fue confirmada explicitamente por el usuario, no se reabre aca.
- El comentario en `constants.ts` que aclara el espejo con backend (`config.py` /
  `upload.py`) es una buena practica para mantenimiento futuro, no bloqueante.
