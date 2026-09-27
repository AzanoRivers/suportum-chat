# Review: f09 — Validación de API Key + Dominio (Frontend)

## Veredicto: APPROVED

## Checkpoints Verificados
- [x] `WidgetShell` llama a `verifyProject()` antes de decidir setup/login cuando hay `apiKey` — confirmado en `templates/WidgetShell.tsx` líneas 57-88, dentro del `useEffect` inicial.
- [x] Estado `not_found`: `ProjectNotFoundPlaceholder` (ícono `PackageSearch`), sin botón de reset, sin auto-limpiar `localStorage` — confirmado, el branch `not_found` (línea 77-78) nunca llama `onProjectReset()`. Componente sin botón de acción.
- [x] Estado `blocked`: `DomainBlockedPlaceholder` (ícono `ShieldAlert`), copy exacto "Houston, tenemos un problema... Los datos se ven raros." — confirmado en `i18n/es.ts` línea 288, con puntos suspensivos (`...`), no em dash.
- [x] Error de red del propio `verify` no se confunde con `not_found`/`blocked` — usa `ErrorPlaceholder` genérico con `code="NETWORK_ERROR"` (branch `error`, línea 162-171).
- [x] Caso sin `apiKey` sigue mostrando `SetupWizard` sin regresión — branch `if (!initialApiKey)` conserva exactamente `onProjectReset?.()` + `setShellStatus('setup')`, mismo comportamiento previo, solo reubicado dentro del `check()` async.
- [x] Todas las strings nuevas en `en.ts` y `es.ts` (`projectNotFoundTitle/Body`, `domainMismatchTitle/Body`).
- [x] R1: cero em dash — grep sobre `**/*.ts` y `**/*.tsx` en `src/` no arrojó resultados.
- [x] R4: cero `style={{}}` nuevo — los 3 únicos hits en el paquete (`FadeTransition.tsx`, `ThemeCard.tsx`, `AppLauncher.tsx`) son preexistentes y usan solo CSS custom properties (`--ft-duration`, `--tc-bg`, etc.), nada agregado por f09.
- [x] `pnpm --filter suportum-chat typecheck` → OK, sin errores.
- [x] `pnpm --filter suportum-chat build` → OK (tsup CJS/ESM + `tsc --emitDeclarationOnly` sin errores).
- [x] Iconografía: solo Lucide React (`PackageSearch`, `ShieldAlert`), sin librerías nuevas.
- [x] `molecules/index.ts` exporta ambos componentes nuevos.

## Puntos de la consigna verificados en detalle

1. **`verifyProject()` nunca lanza**: confirmado, `try/catch` interno en `lib/api.ts` líneas 80-91, siempre resuelve a `{ status }`, incluso ante excepción de `fetch()` o respuesta no-ok (`connection_error`). Coherente con la regla global del usuario de nunca `throw` salvo excepción obligatoria de librería de terceros, envuelta inmediatamente.
2. **Fetch directo sin `apiClient`, con precedente real**: confirmado que NO es una excepción inventada. Grep sobre el paquete muestra el mismo patrón (`fetch(\`${apiUrl}/...\`)` sin pasar por `request()`/`apiClient`) en `useProjectBrandingPublic.ts` (línea 22, endpoint público equivalente `/api/v1/setup/branding`), `LoginView.tsx`, `RegisterView.tsx`, `SetupWizard.tsx`, `useAutoRefreshOnMount.ts` y `useSessionVerifier.ts`. Todos son llamadas pre-sesión o que necesitan `apiUrl` explícito en vez del `getBaseUrl()` global de `apiClient`. Es consistente con el resto del proyecto.
3. **Regla de negocio crítica (`not_found` no auto-resetea)**: confirmada leyendo el código línea por línea. El único lugar donde se llama `onProjectReset?.()` es el branch `if (!initialApiKey)` (línea 61-66). El branch `result.status === 'not_found'` (línea 77-78) solo hace `setShellStatus('not_found')`, sin tocar `onProjectReset`, `localStorage` ni ningún estado persistido. Correcto según sección 2 del spec.
4. **`ProjectNotFoundPlaceholder`**: ícono `PackageSearch` confirmado, sin botón de acción/reset en el JSX (solo dos `<p>` con título y cuerpo).
5. **`DomainBlockedPlaceholder`**: ícono `ShieldAlert` confirmado (distinto de `ShieldOff` que usa `ForbiddenPlaceholder` para 403 genérico, evitando confusión visual entre ambos significados). Copy exacto verificado carácter por carácter en `es.ts`: "Houston, tenemos un problema... Los datos se ven raros." — tres puntos literales, no em dash.
6. **6to valor `'error'` agregado a `ShellStatus`**: evaluado como interpretación razonable, no scope creep. La sección 6 del spec exige explícitamente un estado de error de conexión separado de `not_found`/`blocked`, y el criterio de aprobación #4 del propio spec lo confirma ("Error de red del propio verify no se confunde con not_found ni blocked"). La tabla de la sección 2 lista 5 estados pero no contradice la sección 6; es un vacío de la tabla, no una instrucción en conflicto. La solución implementada (branch dedicado reusando `ErrorPlaceholder` con `code="NETWORK_ERROR"`) es la única forma consistente de cumplir ambos requisitos sin dejar el widget en loading infinito ni reusar `not_found`/`blocked` incorrectamente.
7. **`errors.NETWORK_ERROR` reusada, no inventada**: confirmado que ya existía antes de f09 (`en.ts`/`es.ts` línea 284, usada también en `LoginView.tsx` para el catch de red del login). El spec sección 7 permite explícitamente reusar si existe una key equivalente. Correcto no crear `CONNECTION_ERROR` duplicada.
8. **Strings de sección 7**: `projectNotFoundTitle/Body` y `domainMismatchTitle/Body` presentes y con contenido equivalente al pedido en ambos idiomas.
9. **R1 doble chequeo**: el copy "Houston..." usa `...` (tres puntos ASCII), no `—`. Grep de em dash en todo `src/**/*.{ts,tsx}` → 0 resultados.
10. **R4**: sin `style={{}}` nuevo fuera de CSS custom properties.
11. **No regresión sin `apiKey`**: confirmado, comportamiento idéntico al feature f01 original.

## Notas Adicionales
- El precedente de `useProjectBrandingPublic.ts` valida que el patrón de `fetch()` directo con `apiUrl` explícito para endpoints públicos pre-sesión es una convención ya establecida en el proyecto, no una excepción ad-hoc del Implementer.
- Sin issues encontrados. Feature lista para cerrar la tanda de la sesión (junto con b08, b09, f08 ya aprobados).

---

## Review: f09, ronda 2 (light) — ajuste: copy Houston + auto-detect idioma navegador

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)
- [x] Copy nuevo en `en.ts` (líneas 286-287) y `es.ts` (líneas 286-287) para `errors.projectNotFoundTitle`/`projectNotFoundBody`, tono Houston/jugetón consistente con `domainMismatchTitle` ya aprobado en ronda 1.
- [x] Copy español usa puntos suspensivos ("Houston, tenemos un problema...") tal como se pidió, sin em dash.
- [x] `detectBrowserLocale()` nueva en `i18n/index.tsx` (líneas 11-18): guard `typeof navigator === 'undefined'` primero, no lanza nunca, siempre retorna `'en'` o `'es'` por rama controlada. Sin `throw`.
- [x] Lee `navigator.languages` con fallback a `[navigator.language]` si `languages` es vacío/no existe, `.some(lang => lang?.toLowerCase().startsWith('es'))` con optional chaining, coherente con la regla global de nunca lanzar.
- [x] TypeScript válido: `Locale` es `'en' | 'es'` (union de literales de string, no aplica la regla `Optional[X]`/`X | Y` de Python, que es exclusiva de type hints Python 3.9). No hay ningún type hint Python en este cambio.
- [x] `FloatingWidget.tsx`: `SuportumChatProps.locale?: Locale` sigue siendo opcional (línea 26), sin default hardcodeado en la desestructuración de `SuportumChat` (línea 265-270, ya no tiene `locale = 'en'`).
- [x] `resolvedLocale = locale ?? detectBrowserLocale()` (línea 272): usa `??` (nullish coalescing), por lo que solo entra la detección cuando `locale` es `undefined` o `null`, nunca pisa un valor explícito como `'en'` o `'es'` pasado por el integrador.
- [x] `apps/demo/src/App.tsx` línea 45 sigue pasando `locale="en"` explícito: con `??`, ese valor no nulo se respeta tal cual, `resolvedLocale` da `'en'` sin tocar `detectBrowserLocale()`. Sin regresión para el demo.
- [x] `ProjectNotFoundPlaceholder.tsx` no fue tocado, confirmado por lectura directa: solo consume `t('errors.projectNotFoundTitle')` y `t('errors.projectNotFoundBody')` vía `useI18n()`, ambas keys existen y resuelven correctamente en ambos locales.
- [x] `pnpm --filter suportum-chat typecheck` → OK, sin errores (`tsc --noEmit` limpio).
- [x] `pnpm --filter suportum-chat build` → OK (tsup ESM 209.54 KB / CJS 219.78 KB + `tsc --emitDeclarationOnly` sin errores).
- [x] R1: grep de em dash sobre los 4 archivos tocados esta ronda (`en.ts`, `es.ts`, `index.tsx`, `FloatingWidget.tsx`) → 0 resultados.
- [x] R4: sin `style={{}}` nuevo introducido por este cambio (el archivo `FloatingWidget.tsx` no agrega estilos inline en las líneas tocadas).
- [x] R2: sin strings de UI hardcodeadas nuevas, el copy nuevo va íntegramente por `i18n/en.ts`/`es.ts` como corresponde.

## Notas adicionales
- No se re-derivó manualmente cada rama de `detectBrowserLocale()` con distintos valores de `navigator.languages` (ej. `['es-AR', 'en-US']` vs `['fr-FR']`) más allá de leer la lógica; la implementación es lineal y trivial de verificar por lectura (`.some(...startsWith('es'))`), no amerita profundizar más en una ronda light.
- No se tocó ningún endpoint ni query de backend esta ronda, por lo que no aplica revisión de seguridad multi-tenant (IDOR, scope admin, etc.) según la sección "se puede saltear" de este agente.
- Sin issues encontrados.

---

## Review: f09, ronda 3 (light) — persistencia de locale en localStorage

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)
- [x] `I18nProvider` (`i18n/index.tsx` líneas 52-62) replica fielmente el patrón de `ThemeProvider.tsx` (líneas 29-39): mismo orden de prioridad dentro del lazy initializer de `useState` (prop explícito `initialLocale` primero, luego `localStorage.getItem(STORAGE_KEY)` envuelto en `try/catch`, luego fallback), y `useEffect` separado (líneas 64-70) que persiste en `localStorage` en cada cambio de `locale`, igual estructura que el `useEffect` de `ThemeProvider` (líneas 41-47).
- [x] Único delta funcional respecto a `ThemeProvider` (correcto y esperado): el fallback final no es una constante fija sino `detectBrowserLocale()` (línea 61), ya existente y validado en ronda 2, en vez de `DEFAULT_THEME`. Coherente con que locale sí tiene detección de navegador y theme no.
- [x] `STORAGE_KEY = 'suportum-locale'` (línea 50): grep sobre todo `frontend/` (`suportum_locale`/`suportum-locale`) devuelve un único hit, la propia declaración. Sin colisión con `suportum-theme` (`ThemeProvider.tsx`) ni con `suportum_api_key` (`apps/demo/src/App.tsx`, semántica de API key, no de locale).
- [x] `detectBrowserLocale()` sin cambios respecto a ronda 2 (líneas 11-18), sigue con guard `typeof navigator === 'undefined'` primero y sin ninguna rama que lance. El nuevo `try/catch` alrededor de `localStorage.getItem` en el lazy initializer está bien puesto: envuelve solo el acceso a `localStorage` (que sí puede lanzar en contextos con storage deshabilitado/iframes de terceros), captura sin re-lanzar, y cae a `detectBrowserLocale()` fuera del catch. Coherente con la regla global de nunca `throw`.
- [x] `FloatingWidget.tsx`: confirmado por lectura directa, el import de `../i18n` (línea 11) trae solo `useI18n, I18nProvider`, sin `detectBrowserLocale`. `SuportumChat` (líneas 265-282) pasa `initialLocale={locale}` directo a `I18nProvider` sin pre-resolver nada a mano; el comentario en líneas 271-272 documenta la nueva cadena de prioridad (prop > localStorage > browser > 'en'). Sin import muerto.
- [x] `apps/demo/src/App.tsx`: ya no pasa `locale` a `<SuportumChat>` (bloque líneas 40-47), y `SuportumChatProps.locale?: Locale` sigue siendo opcional (`templates/FloatingWidget.tsx` línea 26). `pnpm --filter suportum-chat typecheck` confirma que el JSX del demo sigue siendo válido sin ese prop.
- [x] `pnpm --filter suportum-chat typecheck` → OK, sin errores (`tsc --noEmit` limpio).
- [x] `pnpm --filter suportum-chat build` → OK (tsup ESM 209.71 KB / CJS 219.95 KB + `tsc --emitDeclarationOnly` sin errores).
- [x] R1: grep de em dash sobre los 3 archivos tocados esta ronda (`i18n/index.tsx`, `templates/FloatingWidget.tsx`, `apps/demo/src/App.tsx`) → 0 resultados.
- [x] R4: grep de `style={{` sobre los mismos 3 archivos → 0 resultados. Sin estilos inline nuevos.

## Notas adicionales
- No se tocó ningún endpoint ni query de backend esta ronda; no aplica revisión de seguridad multi-tenant.
- `.claude/CHECKPOINTS.md` no tiene entradas específicas para persistencia de locale (es un hotfix post-approval, no parte del spec original de f09); se validó contra el reporte del Implementer y el precedente directo de `ThemeProvider.tsx` en su lugar, según el proceso de esta ronda light.
- Sin issues encontrados.

---

## Review: f09, ronda 4 (prop locale='auto' explicita)

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)
- [x] `SuportumChatProps.locale` (`FloatingWidget.tsx` linea 32) cambio de `Locale` a `Locale | 'auto'`, con JSDoc nuevo (lineas 26-31) que documenta las 3 opciones: `'en'`/`'es'` fuerzan, `'auto'` u omitir delega en `I18nProvider` (localStorage -> navegador -> `'en'`).
- [x] Logica exacta confirmada por lectura linea por linea: `const forcedLocale = locale === 'auto' ? undefined : locale` (linea 280). Cuando `locale === 'auto'` da `undefined`; en cualquier otro caso (`'en'`, `'es'`, o `undefined` por prop omitida) pasa el valor tal cual sin transformacion. Se pasa `initialLocale={forcedLocale}` a `I18nProvider` (linea 283), reemplazando el `initialLocale={locale}` directo de la ronda 3.
- [x] Efecto: `locale="auto"` y omitir la prop llegan ambos a `I18nProvider` como `initialLocale={undefined}`, comportamiento identico (misma cadena localStorage -> browser -> `'en'` ya validada en rondas 2 y 3). `locale="en"`/`locale="es"` explicitos siguen forzando sin cambios.
- [x] Unico uso de la variable `locale` en todo el archivo: la desestructuracion en la firma de `SuportumChat` (linea 272) y la comparacion/asignacion de `forcedLocale` (linea 280). No hay ningun otro lugar del archivo que asuma `locale: Locale` sin el `'auto'`; `SuportumChatInner` no recibe `locale` en absoluto (se consume solo dentro de `SuportumChat`, no se propaga via `InnerProps` ni `...rest`).
- [x] `Locale` importado de `../i18n` (linea 15) no se toco esta ronda, sigue siendo `'en' | 'es'`; la union `Locale | 'auto'` compila correctamente confirmado por `tsc --noEmit` limpio.
- [x] `apps/demo/src/App.tsx`: confirmado por lectura directa, sigue sin pasar `locale` en el JSX de `<SuportumChat>` (lineas 40-47), sin necesidad de tocarlo ya que la prop sigue siendo opcional. Compila sin cambios.
- [x] `pnpm --filter suportum-chat typecheck` -> OK, sin errores (`tsc --noEmit` limpio).
- [x] `pnpm --filter suportum-chat build` -> OK (tsup CJS 219.97 KB / ESM 209.72 KB + `tsc --emitDeclarationOnly` sin errores).
- [x] R1: grep de em dash sobre `FloatingWidget.tsx` -> 0 resultados.
- [x] R4: grep de `style={{` sobre `FloatingWidget.tsx` -> 0 resultados. Sin estilos inline nuevos.

## Notas adicionales
- No se toco ningun endpoint ni query de backend esta ronda; no aplica revision de seguridad multi-tenant.
- Cambio acotado a un solo archivo (`FloatingWidget.tsx`), consistente con el alcance descrito por el Orchestrer.
- Sin issues encontrados.

## Review: f09, ronda 5 (copy sin dos puntos, light)

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)
- [x] `en.ts` linea 287 (`projectNotFoundBody`): confirmado, el conector es un punto (". No project is assigned...") en lugar del ":" anterior. Sin dos puntos en toda la linea.
- [x] `es.ts` linea 287 (`projectNotFoundBody`): confirmado, el conector es un punto (". No hay ningun proyecto asignado...") en lugar del ":" anterior. Sin dos puntos en toda la linea.
- [x] Resto de keys `errors.*` relevantes (`projectNotFoundTitle`, `domainMismatchTitle`, `domainMismatchBody`) en ambos archivos: sin ":" en ninguna, solo puntos suspensivos (`...`) en los titulos, que no cuentan como dos puntos. No hay hallazgo adicional que reportar sobre esta preferencia de estilo en estas cuatro keys.
- [x] R1 (cero em dash): `Select-String -Pattern "—"` sobre `en.ts` y `es.ts` -> 0 resultados.
- [x] Alcance del cambio: `git diff` sobre ambos archivos muestra unicamente las 4 lineas de `errors.projectNotFoundTitle/Body` y `errors.domainMismatchTitle/Body` (agregadas como bloque en rondas previas aun no commiteadas); dentro de ese bloque, la unica diferencia funcional de esta ronda es el ":" -> "." en `projectNotFoundBody` de ambos idiomas, ningun otro archivo ni componente fue tocado.
- [x] `pnpm --filter suportum-chat typecheck` -> OK, sin errores (`tsc --noEmit` limpio).

## Notas adicionales
- No se toco backend, ni JSX, ni ningun endpoint esta ronda; no aplica revision de seguridad ni de R2/R3/R4.
- El historial de git aun no tiene commiteadas las rondas 1-5 de f09 (todo sigue en working tree), por lo que `git diff` contra HEAD muestra el bloque completo de las 4 keys como adicion; se verifico el contenido linea por linea contra lo reportado por el Implementer para confirmar que el unico cambio de esta ronda especifica es el conector ":" -> "." en `projectNotFoundBody` (en y es).
- Sin issues encontrados.

---

## Review: f09, ronda 6 (split en 3 parrafos reales)

## Veredicto: APPROVED

## Checkpoints verificados (spot-check)
- [x] Key vieja `projectNotFoundBody` (singular, sin sufijo numerico) ya no existe en `en.ts` ni `es.ts`. Grep de `projectNotFoundBody[^0-9]` sobre todo `src/` (incluye fin de linea, ya que `$` no aplica a `[^0-9]`) devuelve 0 resultados: no quedo ninguna referencia colgante al key viejo en ningun componente.
- [x] `en.ts` lineas 287-289: `projectNotFoundBody1`, `projectNotFoundBody2`, `projectNotFoundBody3` presentes, cada una con una sola oracion, sin ":" (coherente con la preferencia de estilo aprobada en ronda 5).
- [x] `es.ts` lineas 287-289: mismo split en espanol, 3 keys nuevas, una oracion cada una.
- [x] `ProjectNotFoundPlaceholder.tsx`: confirmado por lectura directa, 3 elementos `<p className="text-sm">` separados (lineas 11-13) consumiendo `errors.projectNotFoundBody1`, `errors.projectNotFoundBody2` y `errors.projectNotFoundBody3` respectivamente, en el orden correcto. El titulo (`errors.projectNotFoundTitle`, linea 10) y el icono `PackageSearch` (linea 9) siguen intactos. Sin boton de accion/reset en el JSX, sin regresion respecto a rondas previas.
- [x] R1: `Select-String -Pattern "—"` sobre los 3 archivos tocados (`en.ts`, `es.ts`, `ProjectNotFoundPlaceholder.tsx`) -> 0 resultados.
- [x] R4: `Select-String -Pattern "style=\{\{"` sobre `ProjectNotFoundPlaceholder.tsx` -> 0 resultados, sin estilos inline nuevos.
- [x] `pnpm --filter suportum-chat typecheck` -> OK, sin errores (`tsc --noEmit` limpio).
- [x] `pnpm --filter suportum-chat build` -> OK (tsup ESM 209.96 KB / CJS 220.23 KB + `tsc --emitDeclarationOnly` sin errores).

## Notas adicionales
- No se toco backend ni ningun endpoint/query esta ronda; no aplica revision de seguridad multi-tenant.
- Cambio acotado a los 3 archivos declarados por el Implementer (`en.ts`, `es.ts`, `ProjectNotFoundPlaceholder.tsx`), sin efectos secundarios en otros consumidores de i18n.
- Sin issues encontrados.
