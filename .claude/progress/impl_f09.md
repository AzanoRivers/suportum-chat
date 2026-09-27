# Impl: f09 - Validación de API Key + Dominio (Frontend)

## Estado: DONE

## Archivos Creados/Modificados
- `frontend/packages/suportum-chat/src/lib/api.ts` - agrega `verifyProject(apiUrl, apiKey)`, tipo `VerifyStatus`
- `frontend/packages/suportum-chat/src/molecules/ProjectNotFoundPlaceholder.tsx` - nuevo, ícono `PackageSearch`
- `frontend/packages/suportum-chat/src/molecules/DomainBlockedPlaceholder.tsx` - nuevo, ícono `ShieldAlert`
- `frontend/packages/suportum-chat/src/molecules/index.ts` - exporta ambos molecules nuevos
- `frontend/packages/suportum-chat/src/templates/WidgetShell.tsx` - `ShellStatus` extendido, nuevo `useEffect` de verificación async, 3 branches de render nuevos (`not_found`, `blocked`, `error`)
- `frontend/packages/suportum-chat/src/i18n/en.ts` - strings `errors.projectNotFoundTitle/Body`, `errors.domainMismatchTitle/Body`
- `frontend/packages/suportum-chat/src/i18n/es.ts` - idem en español

## Checkpoints Implementados
- [x] `WidgetShell` llama a `verifyProject()` antes de decidir setup/login cuando hay `apiKey`
- [x] Estado `not_found`: `ProjectNotFoundPlaceholder` (ícono `PackageSearch`), sin botón de reset, sin auto-limpiar `localStorage` (no se llama `onProjectReset()` en este branch)
- [x] Estado `blocked`: `DomainBlockedPlaceholder` (ícono `ShieldAlert`), copy exacto "Houston, tenemos un problema... Los datos se ven raros." (ES) / "Houston, we have a problem... something looks off." (EN)
- [x] Error de red del propio `verify` usa `ErrorPlaceholder` genérico (`code="NETWORK_ERROR"`), nunca se confunde con `not_found`/`blocked`
- [x] Caso sin `apiKey` sigue mostrando `SetupWizard` sin regresión (mismo `onProjectReset()` + `setShellStatus('setup')` que antes, solo movido dentro del `check()` async)
- [x] Strings nuevas en `en.ts` y `es.ts`
- [x] R1: cero em dash en todo el código nuevo (verificado con grep)
- [x] R4: cero `style={{}}` con props CSS directas en los archivos nuevos/modificados (verificado, los 3 hits preexistentes de CSS custom properties siguen siendo los mismos 3, nada nuevo)
- [x] i18n: todo el copy nuevo vive en `en.ts`/`es.ts`, nada hardcodeado en JSX
- [x] Solo Lucide React (`PackageSearch`, `ShieldAlert`)

## Verificación

```
pnpm --filter suportum-chat typecheck   -> OK, sin errores
pnpm --filter suportum-chat build       -> OK (tsup ESM 209.34 KB / CJS 219.59 KB, tsc --emitDeclarationOnly sin errores)
Grep "style=\{\{" en **/*.tsx           -> 3 hits, todos preexistentes (AppLauncher.tsx, FadeTransition.tsx, ThemeCard.tsx), todos CSS custom properties con prefijo --, nada nuevo agregado por f09
Grep "—" (em dash) en **/*.ts,*.tsx     -> 0 resultados
```

## Decisiones de diseño (por ambigüedad del spec)

1. **`VerifyStatus` con 4to valor interno `'connection_error'` en `lib/api.ts`, y `ShellStatus` extendido con `'error'` (no solo los 5 estados listados en la sección 3 del spec).**
   El spec (sección 3) define `ShellStatus` como `'checking' | 'setup' | 'ready' | 'not_found' | 'blocked'`, sin un 5to estado explícito para el fallo de red. Pero la sección 6 y el criterio de aprobación #4 exigen que el error de conexión de `verifyProject()` renderice el `ErrorPlaceholder` genérico, distinto de `not_found`/`blocked`. No hay forma de cumplir ambos requisitos sin un estado adicional (no se puede reusar `not_found`/`blocked` sin violar la sección 6, ni reusar `checking` sin dejar el widget colgado en un loading infinito). Agregué `'error'` al union de `ShellStatus` y un branch de render dedicado que reusa `ErrorPlaceholder` con `code="NETWORK_ERROR"`. Esto no contradice ningún criterio del spec, solo lo completa donde había un vacío.

2. **`verifyProject()` nunca lanza (`throw`), siempre retorna `{ status }` incluso ante fallo de red (try/catch interno).**
   El spec propone la firma `Promise<{ status: VerifyStatus }>` con un comentario de que el error de red "no debe mapearse a domain_mismatch ni not_found", pero no especifica si debe hacerlo devolviendo un valor o lanzando una excepción que el llamador debe atrapar. Seguí la regla global del usuario (nunca `throw` salvo un caso muy particular donde una librería de terceros solo pueda fallar lanzando, y ahí sí envolver en try/catch inmediato y convertir a un retorno controlado, nunca relanzar). `fetch()` es justamente ese caso: se envuelve en try/catch dentro de `verifyProject()` y se resuelve siempre a un `status` explícito (`'connection_error'` en el caso de excepción o respuesta HTTP no-ok), nunca se relanza hacia `WidgetShell`. Esto también simplifica el `useEffect` en `WidgetShell.tsx`, que queda con un solo `if/else` sin necesidad de `try/catch` propio.

3. **`errors.CONNECTION_ERROR` no se creó como key nueva: se reusó `errors.NETWORK_ERROR`, que ya existía con el mismo significado** ("Connection error. Check your internet connection." / "Error de conexión. Verifica tu conexión a internet."). El spec (sección 7) dice explícitamente "reusar si ya existe una key equivalente en `errors.*`, si no, crearla", y `NETWORK_ERROR` ya cubre exactamente ese caso (se usa igual en `LoginView.tsx` para el catch de red del login). Evita duplicar copy casi idéntico bajo dos keys distintas.

4. **`verifyProject()` usa `fetch()` directo con `apiUrl` explícito como parámetro, no `apiClient` de `lib/api.ts`.**
   `apiClient`/`request()` resuelve su base URL desde `getBaseUrl()` (estado de módulo global seteado en otro punto de bootstrap) y siempre agrega `Authorization: Bearer` si hay token en el store, ninguno de los dos aplica a este endpoint (público, sin JWT, y llamado antes de que exista sesión). Seguí el mismo patrón ya usado en el proyecto para el otro endpoint público equivalente (`useProjectBrandingPublic.ts`, que hace `fetch(\`${apiUrl}/api/v1/setup/branding\`)` directo), y es exactamente lo que sugiere la firma propuesta en el spec (`verifyProject(apiUrl: string, apiKey: string)`).

## Notas
Sin bloqueos. No se tocó ningún archivo de f08 (branding) más allá de lo que ya estaba modificado en el working tree antes de esta sesión; `lib/api.ts` solo recibió la función nueva, sin tocar `apiClient`/`request()` existentes.
