# 01 — Auth Widget Frontend

## 1. Objetivo
Flujo de autenticación completo dentro del widget: login, setup wizard para primer uso,
verificación de sesión con el backend, recuperación de sesión al recargar (via cookie refresh),
y el shell del widget con routing por rol.

## 2. Componentes a Implementar

### Atoms (nuevos/extender de F00)
- `Spinner` con prop `label` para accesibilidad

### Molecules
- `FormField` — `label` + `Input` + mensaje de error
- `StepIndicator` — puntos de progreso para el wizard (paso 1/3, 2/3, 3/3)
- `ForbiddenPlaceholder` — ícono `ShieldOff` + texto de acceso denegado
- `ErrorPlaceholder` — ícono `AlertCircle` + texto de error con código

### Organisms
- `LoginView` — formulario email/password + botón submit + link "primer uso"
- `SetupWizard` — 3 pasos: nombre del proyecto → cuenta admin → confirmación
- `LoadingScreen` — full screen con Spinner mientras se verifica sesión

### Templates
- `FloatingWidget` — shell principal: botón flotante + panel expansible
- `WidgetShell` — routing por rol: LoginView / Spinner / ClientView / AgentView / AdminView
- `ChatButton` — botón flotante con `MessageCircle` de Lucide

## 3. Stores Zustand

### `store/authStore.ts` (ya creado en F00 skeleton)
```ts
interface AuthState {
  token: string | null
  role: 'client' | 'agent' | 'admin' | null
  userId: string | null
  projectId: string | null
  isVerified: boolean
  setSession: (token, role, userId, projectId) => void
  clearSession: () => void
  setVerified: () => void
}
```

### `store/widgetStore.ts` (nuevo)
```ts
interface WidgetState {
  isOpen: boolean
  isExpanded: boolean
  open: () => void
  close: () => void
  expand: () => void
  collapse: () => void
}
```

## 4. Hooks

### `hooks/useAuth.ts`
```ts
export function useAuth(apiUrl: string, apiKey: string) {
  // 1. Al montar: llamar /auth/refresh con cookie para recuperar sesión
  // 2. Si token en store: llamar /auth/me para verificar
  // 3. Retornar { user, isLoading, login, logout }
}
```

### `hooks/useAutoRefreshOnMount.ts`
Intenta `POST /api/v1/auth/refresh` con cookie al montar. Si OK → `setSession + setVerified`. Si falla → sin sesión (mostrar login).

### `hooks/useSessionVerifier.ts`
Cuando `token` cambia: llama `/auth/me` → si OK → `setVerified()`; si falla → `clearSession()`.

## 5. UI/UX — Login

### Maquetación Login (mobile)
```
┌─────────────────────────┐
│ Soporte              [×] │
├─────────────────────────┤
│                          │
│   ◉ Suportum             │  ← logo/brand del widget
│                          │
│   Email                  │
│   [___________________]  │
│                          │
│   Contraseña             │
│   [___________________]  │
│                          │
│   [    Iniciar sesión   ] │  ← primary button full width
│                          │
│   Primera vez? Configura  │  ← link al setup wizard
│                          │
└─────────────────────────┘
```

### Colores (Dragon UI)
- Fondo: `bg-bg-surface`
- Input border normal: `border-border-default`
- Input border focus: `border-accent`
- Input border error: `border-status-cancelled`
- Botón primary: `bg-accent text-bg-base` hover `bg-accent-hover`

### Estado de error
- Under cada input en `text-status-cancelled text-sm`
- Error general (credenciales incorrectas): banner en `bg-status-cancelled/10 border-status-cancelled`

## 6. UI/UX — Setup Wizard

### Paso 1: Nombre del proyecto
```
┌─────────────────────────┐
│ Configurar Soporte   1/3 │
├─────────────────────────┤
│                          │
│   Nombre del proyecto    │
│   [___________________]  │
│                          │
│   Slug (URL)             │
│   [___________________]  │
│   ✓ Disponible           │  ← verificación async al escribir
│                          │
│            [   Siguiente →] │
└─────────────────────────┘
```

### Paso 2: Cuenta de admin
```
Email admin + username + password
```

### Paso 3: Confirmación
```
¡Listo! Tu api_key es:
sproj_xxxxxxxxxxxxxxxxxx

Copia esta clave y úsala como:
<SuportumChat apiKey="sproj_xxx..." />

[  Abrir panel de admin  ]
```

## 7. `FloatingWidget.tsx` — Shell Principal

```tsx
export function SuportumChat({ apiUrl, apiKey, ...props }: SuportumChatProps) {
  const { isOpen, open, close } = useWidgetStore()
  const { token, isVerified, role } = useAuthStore()
  useAutoRefreshOnMount()
  useSessionVerifier()

  if (!isOpen) return <ChatButton onClick={open} label={props.buttonLabel ?? 'Soporte'} />

  return (
    <div className="fixed inset-0 lg:fixed lg:bottom-6 lg:right-6 lg:inset-auto lg:w-96">
      <WidgetShell apiUrl={apiUrl} apiKey={apiKey} onClose={close} />
    </div>
  )
}
```

## 8. `WidgetShell.tsx` — Routing por Rol

```tsx
export function WidgetShell({ apiUrl, apiKey, onClose }) {
  const { token, role, isVerified } = useAuthStore()

  if (!apiKey) return <SetupWizard apiUrl={apiUrl} />
  if (!token)  return <LoginView apiUrl={apiUrl} apiKey={apiKey} />
  if (!isVerified) return <Spinner label="Verificando sesión…" />

  return (
    <>
      {role === 'client' && <ClientView apiUrl={apiUrl} apiKey={apiKey} />}
      {role === 'agent'  && <AgentView  apiUrl={apiUrl} apiKey={apiKey} />}
      {role === 'admin'  && <AdminView  apiUrl={apiUrl} apiKey={apiKey} />}
    </>
  )
}
```

## 9. iOS Safari — Reglas

```tsx
// Widget container: usar dvh con fallback
<div
  className="fixed inset-0 lg:..."
  style={{ height: '100vh' }}
  // clase CSS que sobreescribe con dvh:
>
```

```css
/* En globals.css o componente */
.widget-full {
  height: 100vh;
  height: 100dvh;
}
```

```tsx
// Inputs: SIEMPRE text-base (16px)
<Input className="text-base" ... />  // ← nunca text-sm en inputs
```

## 10. Desarrollo — Pasos

1. Implementar `store/widgetStore.ts`
2. Implementar `hooks/useAutoRefreshOnMount.ts`
3. Implementar `hooks/useSessionVerifier.ts`
4. Implementar `atoms/` que falten para login (ya están los base de F00)
5. Implementar `molecules/FormField`, `StepIndicator`, `ForbiddenPlaceholder`, `ErrorPlaceholder`
6. Implementar `organisms/LoginView`
7. Implementar `organisms/SetupWizard` (3 pasos)
8. Implementar `templates/ChatButton`
9. Implementar `templates/WidgetShell`
10. Implementar `templates/FloatingWidget`
11. Exportar todo desde `index.ts`
12. Probar en demo: login → sesión activa → `isVerified=true` → rol correcto visible

## 11. Auditoría

### 11.1 Checklist de Seguridad
- [ ] Access token solo en Zustand (sin `localStorage.setItem('token', ...)`)
- [ ] `isVerified=false` hasta `/auth/me` exitoso — UI protegida nunca flashea antes
- [ ] `clearSession()` en 401/403 → LoginView se muestra
- [ ] Setup Wizard no expone api_key en URL

### 11.2 Checklist iOS Safari
- [ ] Inputs del login: `text-base` (16px)
- [ ] Botones: `min-h-11` (44px touch target)
- [ ] Widget container: `100dvh` con fallback `100vh`
- [ ] Sin `overflow-x: clip` en ningún componente de este feature

### 11.3 Checklist de Funcionalidad
- [ ] Login con credenciales incorrectas → error visible bajo el form
- [ ] Login exitoso → `isVerified=true` → rol correcto → vista correcta
- [ ] Recargar página → `useAutoRefreshOnMount` recupera sesión sin re-login
- [ ] Cookie refresh expirada → LoginView sin error
- [ ] Setup Wizard step 1: slug verifica disponibilidad async
- [ ] Setup Wizard step 3: muestra api_key copiable

## 12. Criterios de Aprobación (Done)
- [ ] Login funciona, setea token en Zustand, verifica con /auth/me
- [ ] Recarga de página recupera sesión via cookie
- [ ] Wizard crea proyecto y muestra api_key
- [ ] Routing por rol correcto (client/agent/admin ve su vista)
- [ ] Inputs son text-base (verificar con DevTools → 16px)
- [ ] Reviewer confirma APPROVED
