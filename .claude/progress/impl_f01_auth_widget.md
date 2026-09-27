# F01 Auth Widget Frontend - Reporte de Implementacion

## Estado: DONE

## Resultado de verificacion

```
pnpm --filter suportum-chat typecheck  =>  exit 0 (sin errores)
pnpm --filter suportum-chat build      =>  exit 0 (CJS + ESM + DTS)
```

Build output:
- CJS dist/index.js: 24.53 KB
- ESM dist/index.mjs: 23.52 KB
- DTS dist/index.d.ts: 1.18 KB

## Archivos creados

| Archivo | Descripcion |
|---|---|
| `src/store/widgetStore.ts` | Zustand store: isOpen, isExpanded, open, close, expand, collapse |
| `src/hooks/useAutoRefreshOnMount.ts` | Restaura sesion via cookie en mount (fetch manual, no apiClient) |
| `src/hooks/useSessionVerifier.ts` | Verifica token via GET /auth/me cuando token cambia |
| `src/molecules/FormField.tsx` | label + Input + error (error display delegado a Input) |
| `src/molecules/StepIndicator.tsx` | Puntos de progreso + texto "current / total" |
| `src/molecules/ForbiddenPlaceholder.tsx` | ShieldOff + t('errors.FORBIDDEN'), centrado |
| `src/molecules/ErrorPlaceholder.tsx` | AlertCircle + t('errors.{code}'), fallback al code si falta clave |
| `src/organisms/LoginView.tsx` | Formulario de login completo con banner de error |
| `src/organisms/SetupWizard.tsx` | Wizard 3 pasos: nombre proyecto, cuenta admin, confirmacion con api_key |
| `src/organisms/LoadingScreen.tsx` | Spinner lg centrado con label via prop |
| `src/templates/ChatButton.tsx` | Boton flotante fixed, posicion configurable, MessageCircle |
| `src/templates/WidgetShell.tsx` | Routing por estado: setup, login, loading, rol |
| `src/templates/FloatingWidget.tsx` | REEMPLAZADO: implementacion real con hooks y WidgetShell |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/atoms/Spinner.tsx` | Agregado prop `label?: string` (aria-label, default 'Loading') |
| `src/i18n/en.ts` | Agregadas claves faltantes (ver seccion abajo) |
| `src/i18n/es.ts` | Agregadas claves faltantes (ver seccion abajo) |
| `src/molecules/index.ts` | Exports de FormField, StepIndicator, ForbiddenPlaceholder, ErrorPlaceholder |
| `src/organisms/index.ts` | Exports de LoginView, SetupWizard, LoadingScreen |
| `src/templates/index.ts` | Exports de FloatingWidget, SuportumChat, ChatButton, WidgetShell |
| `src/styles/globals.css` | Agregada clase .widget-full-height (100vh + 100dvh) |

## Claves i18n agregadas

Claves nuevas en `en.ts` y `es.ts`:

| Clave | en | es |
|---|---|---|
| `auth.signingIn` | Signing in... | Iniciando sesion... |
| `auth.verifyingSession` | Verifying session... | Verificando sesion... |
| `setup.copyApiKey` | Copy API key | Copiar clave de API |
| `setup.copied` | Copied | Copiado |
| `setup.openAdmin` | Open admin panel | Abrir panel de admin |
| `setup.creating` | Creating project... | Creando proyecto... |
| `errors.AUTH_INVALID_CREDENTIALS` | Invalid email or password. | Correo o contrasena incorrectos. |
| `errors.SETUP_ALREADY_DONE` | Project already configured. | El proyecto ya esta configurado. |
| `widget.support` | Support | Soporte |
| `widget.close` | Close | Cerrar |
| `widget.clientView` | Client View | Vista cliente |
| `widget.agentView` | Agent View | Vista agente |
| `widget.adminView` | Admin View | Vista admin |

## Decisiones de diseno

### FormField y error display
Input.tsx ya renderiza internamente el mensaje de error cuando recibe la prop `error`. FormField pasa la prop `error` a `<Input>` directamente. Esto cumple el spec (el error aparece debajo del input, estilizado con `text-sm text-[--color-status-cancelled]`) sin duplicar el mensaje. FormField no agrega un span extra para evitar duplicacion visual.

### useAutoRefreshOnMount
Usa `fetch` manual en vez de `apiClient` para evitar el interceptor de 401 que llamaria `clearSession()` durante el refresh inicial. El hook acepta `apiUrl` como parametro para ser independiente del entorno.

### widget-full-height vs inline style
El div del widget usa la clase CSS `widget-full-height` que declara `height: 100vh` (fallback) y luego `height: 100dvh` (override). Esto sigue la guia de context-iphone-bugs.md para iOS. En lg+ el Tailwind `lg:h-[600px]` tiene mayor especificidad y sobreescribe correctamente.

### WidgetShell: apiKey dinamico
WidgetShell maneja estado interno `currentApiKey` para poder actualizarse cuando el SetupWizard retorna un nuevo api_key via `onComplete`. Esto permite que el widget funcione sin api_key inicial (flujo de primer uso).

### Placeholders de rol
Los placeholders `clientView`, `agentView`, `adminView` usan claves i18n via `t()`. Texto visible nunca hardcodeado en JSX (cumple R2).

### Reglas iOS
- Inputs: `text-base` en Input.tsx (no modificado, ya lo tenia)
- `min-h-11` en todos los elementos clickeables
- `100dvh` via clase CSS con fallback `100vh`
- Sin `overflow-x: clip` en ningun lado
