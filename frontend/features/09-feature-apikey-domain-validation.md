# 09 — Validación de API Key + Dominio — Frontend

> **Feature ID:** f09
> **Contraparte:** `backend/features/09-feature-apikey-domain-validation.md` (b09)
> **Dependencias:** f00 (Foundation), f01 (Auth Widget), b09 (endpoint de verify)
> **Rama sugerida:** `feature/f09-apikey-domain-validation`

## 1. Objetivo

Hoy `WidgetShell.tsx` decide setup-vs-login mirando solo si `apiKey` no está vacío
(`if (initialApiKey) setShellStatus('ready') else setup`), sin preguntarle nada al
backend. Esto rompe si pegás una key de otro ambiente/proyecto: el widget muestra
login igual, aunque esa key no exista en la DB a la que apunta.

Este feature agrega una consulta a `GET /projects/verify` (b09) antes de decidir la
pantalla, y agrega un estado nuevo para cuando la key simplemente no existe (distinto
del estado de dominio bloqueado).

## 2. Estados del `WidgetShell`

`ShellStatus` pasa de `'checking' | 'setup' | 'ready'` a:

```ts
type ShellStatus = 'checking' | 'setup' | 'ready' | 'not_found' | 'blocked'
```

| Estado | Cuándo | Qué se muestra |
|---|---|---|
| `checking` | Mientras se resuelve la verificación | `LoadingScreen` (igual que hoy) |
| `setup` | No hay `apiKey` configurado en absoluto | `SetupWizard` (igual que hoy, sin cambios) |
| `not_found` | Hay `apiKey`, pero `verify` devuelve `not_found` | **Nuevo:** pantalla de error informativa (ver sección 4) |
| `blocked` | Hay `apiKey`, `verify` devuelve `domain_mismatch` | **Nuevo:** pantalla "Houston" (ver sección 5) |
| `ready` | Hay `apiKey`, `verify` devuelve `ready` | Flujo normal (`LoginView` / app), sin cambios |

**Importante — no confundir `not_found` con `setup`:** cuando la key no existe, el
widget **no** debe auto-redirigir al Setup Wizard ni auto-limpiar nada guardado
(`localStorage`, etc.). El wizard solo se muestra cuando no hay `apiKey` de entrada.
Si la key está mal, la corrección es manual del lado del integrador (ver copy en
sección 4) — así una key mal tipeada por error de un solo caracter no dispara sin
querer la creación de un proyecto nuevo.

## 3. Cambios en `WidgetShell.tsx`

Reemplazar el `useEffect` actual (líneas ~50-57):
```tsx
useEffect(() => {
  if (initialApiKey) {
    setShellStatus('ready')
  } else {
    onProjectReset?.()
    setShellStatus('setup')
  }
}, [])
```

por una verificación async contra el backend:
```tsx
useEffect(() => {
  let cancelled = false
  async function check() {
    if (!initialApiKey) {
      onProjectReset?.()
      setShellStatus('setup')
      return
    }
    const result = await verifyProject(apiUrl, initialApiKey)
    if (cancelled) return
    setShellStatus(result.status === 'ready' ? 'ready' : result.status)
  }
  check()
  return () => { cancelled = true }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Nuevo cliente en `lib/api.ts` (seguir el mismo wrapper fetch que ya usa el resto del
package, mismo manejo de errores de red):
```ts
type VerifyStatus = 'not_found' | 'ready' | 'domain_mismatch'

export async function verifyProject(apiUrl: string, apiKey: string): Promise<{ status: VerifyStatus }> {
  // GET /api/v1/projects/verify?api_key=...
  // Si la request de red falla (backend caído, sin conexión): NO mapear a 'domain_mismatch'
  // ni a 'not_found' — ver seccion 6 (estado de error de conexión, distinto de los otros dos).
}
```

## 4. Pantalla "proyecto no encontrado" (`not_found`)

Nuevo estado, nueva pantalla dedicada, full-screen dentro del widget (mismo patrón que
`LoadingScreen`: se renderiza dentro de `widget-shell__full-body` en `WidgetShell.tsx`,
con `WidgetFooter` debajo, igual que los estados `checking`/`setup` actuales).

**Requisitos de diseño** (pedido explícito 2026-09-26): que seteo el look del resto
del widget (Dragon UI / light-clean, tokens de `tailwind-v4`), con un ícono acorde,
prolijo, no un simple texto de error crudo.

Nuevo molecule `molecules/ProjectNotFoundPlaceholder.tsx`, mismo patrón que
`ErrorPlaceholder`/`ForbiddenPlaceholder` (feature f01) pero con su propio ícono y copy:

```tsx
import { PackageSearch } from 'lucide-react'
import { useI18n } from '../i18n'

export function ProjectNotFoundPlaceholder() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-6 text-(--color-text-secondary)">
      <PackageSearch size={40} className="text-(--color-accent)" />
      <p className="text-base font-medium text-(--color-text-primary)">{t('errors.projectNotFoundTitle')}</p>
      <p className="text-sm">{t('errors.projectNotFoundBody')}</p>
    </div>
  )
}
```

Ícono: `PackageSearch` de Lucide (buscar algo que no aparece, coherente con la
metáfora "no encontramos tu proyecto"). Color con los tokens del theme activo, no
hardcodear hex.

**Copy** (i18n, ver sección 7): título corto tipo "No encontramos ningún proyecto con
esta API Key", cuerpo explicando que la clave configurada no corresponde a ningún
proyecto existente en este servidor y que hay que revisar/reemplazarla manualmente en
la integración (prop `apiKey`, variable de entorno, o lo que corresponda del lado de
quien instaló el widget) para poder arrancar de cero con una nueva. **Sin botón de
acción** — es a propósito solo informativo, no se ofrece un "reset" con un click (ver
sección 2, para no auto-limpiar por error).

## 5. Pantalla de dominio bloqueado (`blocked` / domain_mismatch)

Mismo patrón de componente, ícono distinto para diferenciar visualmente del caso
anterior: `ShieldAlert` de Lucide (ya existe el precedente `ForbiddenPlaceholder` con
`ShieldOff` para 403 genérico — este es un caso específico, ícono distinto para no
confundir ambos significados).

Nuevo molecule `molecules/DomainBlockedPlaceholder.tsx`:
```tsx
import { ShieldAlert } from 'lucide-react'
import { useI18n } from '../i18n'

export function DomainBlockedPlaceholder() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-6 text-(--color-status-cancelled)">
      <ShieldAlert size={40} />
      <p className="text-base font-medium">{t('errors.domainMismatchTitle')}</p>
      <p className="text-sm text-(--color-text-secondary)">{t('errors.domainMismatchBody')}</p>
    </div>
  )
}
```

Copy pedido por el usuario (2026-09-26), en el título: **"Houston, tenemos un
problema... Los datos se ven raros."** (mantener el tono tal cual, es intencional).
Cuerpo: aclarar brevemente que esta API Key está asociada a otro dominio.

## 6. Estado de error de conexión (no confundir con los anteriores)

Si `verifyProject()` falla por un problema de red/backend caído (no por una respuesta
de negocio), **no** se debe mostrar ni "not_found" ni "Houston" — esos dos implican que
el backend sí respondió con info. Mostrar en su lugar el `ErrorPlaceholder` genérico ya
existente (feature f01) con un código tipo `CONNECTION_ERROR`, ya que la causa es
distinta y el usuario no debe pensar que su api_key está mal cuando en realidad el
backend no está disponible.

## 7. Strings i18n a agregar

**`errors.*`:**
- `errors.projectNotFoundTitle` — "Project not found" / "No encontramos ningún proyecto"
- `errors.projectNotFoundBody` — "The configured API Key doesn't match any project on this server. Check your widget setup and use a valid key, or remove it manually to start a new project." / "La API Key configurada no corresponde a ningún proyecto en este servidor. Revisá la configuración del widget y usá una clave válida, o eliminala manualmente para empezar un proyecto nuevo desde cero."
- `errors.domainMismatchTitle` — "Houston, we have a problem... something looks off." / "Houston, tenemos un problema... Los datos se ven raros."
- `errors.domainMismatchBody` — "This API Key is registered to a different domain." / "Esta API Key está registrada para otro dominio."
- `errors.CONNECTION_ERROR` — "Couldn't reach the server. Try again in a moment." / "No pudimos conectar con el servidor. Intentá de nuevo en un momento." (reusar si ya existe una key equivalente en `errors.*`, si no, crearla)

## 8. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/lib/api.ts` | Modificar — agregar `verifyProject()` |
| `src/molecules/ProjectNotFoundPlaceholder.tsx` | Crear |
| `src/molecules/DomainBlockedPlaceholder.tsx` | Crear |
| `src/molecules/index.ts` | Modificar — exportar ambos |
| `src/templates/WidgetShell.tsx` | Modificar — nuevo `ShellStatus`, nueva lógica de verificación, nuevos branches de render |
| `src/i18n/en.ts` / `src/i18n/es.ts` | Modificar — strings de sección 7 |

## 9. Reglas críticas (no negociables)

- **R4 (inline styles):** los dos molecules nuevos usan clases/tokens (`text-(--color-...)`), cero `style={{}}`.
- **i18n:** todo el copy nuevo en `en.ts`/`es.ts`, nada hardcodeado en JSX.
- **No auto-reset en `not_found`:** ver sección 2 — es la regla de negocio más importante de este feature, no aplicar el mismo `onProjectReset()` que se usa para el caso "sin apiKey".

## 10. Desarrollo — Pasos

1. Agregar `verifyProject()` en `lib/api.ts`.
2. Crear `molecules/ProjectNotFoundPlaceholder.tsx` + export.
3. Crear `molecules/DomainBlockedPlaceholder.tsx` + export.
4. Modificar `WidgetShell.tsx`: nuevo `ShellStatus`, nuevo `useEffect` de verificación, nuevos branches (`not_found`, `blocked`), branch de error de conexión reusando `ErrorPlaceholder`.
5. Agregar strings i18n.
6. Verificar: `pnpm typecheck` + `pnpm build`.
7. Probar manualmente los 4 casos end-to-end (requiere b09 ya implementado):
   - Sin apiKey → Setup Wizard (sin cambios de comportamiento).
   - apiKey inexistente en la DB → pantalla `ProjectNotFoundPlaceholder`.
   - apiKey válida, mismo dominio → login normal.
   - apiKey válida, dominio distinto (probar con `Origin` distinto vía DevTools o dos hosts locales) → pantalla `DomainBlockedPlaceholder` con el mensaje Houston.

## 11. Criterios de Aprobación (Done)

- [ ] `WidgetShell` llama a `verifyProject()` antes de decidir la pantalla cuando hay `apiKey`.
- [ ] Estado `not_found`: pantalla dedicada, ícono `PackageSearch`, sin botón de reset, sin auto-limpiar `localStorage`.
- [ ] Estado `blocked`: pantalla "Houston..." con ícono `ShieldAlert`.
- [ ] Error de red del propio `verify` no se confunde con `not_found` ni `blocked` (usa `ErrorPlaceholder` genérico).
- [ ] Caso sin `apiKey` sigue mostrando `SetupWizard` exactamente igual que antes (no regresión).
- [ ] Todas las strings nuevas en `en.ts` y `es.ts`.
- [ ] Reviewer confirma APPROVED.
