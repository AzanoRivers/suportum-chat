# 07 — Polish, Mobile UX y Auditoría Frontend

## 1. Objetivo
Revisión exhaustiva de calidad: mobile UX en iOS Safari, accesibilidad, performance,
errores de red, estados vacíos, animaciones, y auditoría final antes de publicar el paquete npm.

## 2. iOS Safari — Auditoría Completa

### Checklist de Propiedades CSS

```bash
# Buscar overflow-x: clip (prohibido en iOS Safari < 16)
Select-String -Path "frontend\packages\suportum-chat\src\**\*.{tsx,css}" -Pattern "overflow-x:\s*clip" -Recurse

# Buscar backdrop-filter sin webkit prefix
Select-String -Path "frontend\packages\suportum-chat\src\**\*.{tsx,css}" -Pattern "backdropFilter|backdrop-filter" -Recurse
# Verificar que cada uso tiene el prefijo webkit primero

# Buscar 100vh sin fallback (debe tener 100dvh también)
Select-String -Path "frontend\packages\suportum-chat\src\**\*.{tsx,css}" -Pattern "100vh" -Recurse
# Verificar que junto a cada 100vh hay un 100dvh

# Buscar text-sm en inputs (prohibido — mínimo text-base)
Select-String -Path "frontend\packages\suportum-chat\src\**\*.tsx" -Pattern "<input.*text-sm|<textarea.*text-sm" -Recurse
```

### Touch Targets
- [ ] Todo botón interactivo: `min-h-11 min-w-11` (44px — Apple HIG)
- [ ] Links en listas: `min-h-14` para touch cómodo
- [ ] Botón flotante: al menos `w-14 h-14` (56px)

### Keyboard Virtual (iOS)
Al enfocar un input, el teclado virtual reduce el viewport visible.
- [ ] Widget detecta que el input está en foco → scroll automático para que sea visible
- [ ] El panel de chat no queda oculto detrás del teclado

```tsx
// Hook para manejar el teclado virtual
function useVirtualKeyboard() {
  useEffect(() => {
    const onResize = () => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    window.visualViewport?.addEventListener('resize', onResize)
    return () => window.visualViewport?.removeEventListener('resize', onResize)
  }, [])
}
```

### Scroll Inercial
- [ ] Todos los contenedores con scroll: `-webkit-overflow-scrolling: touch`
- [ ] Message list, ticket list, order columns — verificar cada uno

## 3. Accesibilidad — Checklist

### ARIA y Semántica
- [ ] `<button>` para acciones, `<a>` para navegación — nunca `<div onClick>`
- [ ] Botones sin texto visible tienen `aria-label` (ej: botón × de cerrar)
- [ ] Botón flotante: `aria-label="Abrir chat de soporte"`
- [ ] Status badges: `aria-label="Estado: activo"` (no solo color)
- [ ] Loading state: `aria-busy="true"` en el contenedor que carga
- [ ] Error state: `role="alert"` en mensajes de error

### Foco y Teclado
- [ ] Tab order lógico: login form → botones → chat input
- [ ] Modales/drawers: focus trap dentro del modal mientras está abierto
- [ ] `Escape` cierra modales
- [ ] Al cerrar un modal: foco vuelve al elemento que lo abrió

### Contraste de Color (Dragon UI dark)
- [ ] Texto primario `#e8e8f0` sobre fondo `#111118`: ratio 9:1 ✓
- [ ] Texto secundario `#8888a8` sobre fondo `#111118`: verificar con herramienta (WCAG AA requiere 4.5:1)
- [ ] Texto muted `#44445a` solo para información no crítica — no para texto interactivo

## 4. Estados Vacíos — Checklist

Cada lista necesita un estado vacío elegante (no pantalla en blanco):

| Lista | Estado vacío |
|---|---|
| Message list | "Sé el primero en escribir en este chat." |
| Ticket list | "No hay tickets en este momento." |
| Orders board column | "(columna vacía)" — sin texto extra |
| Orders board (sin ninguna) | "No hay órdenes activas." |
| Users list | "No hay usuarios registrados." |

```tsx
function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon size={32} strokeWidth={1.5} className="text-text-muted" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  )
}
```

## 5. Estados de Error de Red

Cada fetch debe manejar:
- **Loading**: `Spinner` mientras carga
- **Error de red** (sin conexión): mensaje "Sin conexión — intenta de nuevo" + botón retry
- **Error del servidor** (`INTERNAL_ERROR`): mensaje genérico + botón retry
- **Error de permisos** (`FORBIDDEN`): `ForbiddenPlaceholder`
- **No encontrado** (`NOT_FOUND`): estado vacío específico

```tsx
function useQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'NETWORK_ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  return { data, error, isLoading, retry: load }
}
```

## 6. Performance

### Bundle Size
- [ ] `tsup build` con `--minify`
- [ ] Verificar que `lucide-react` se importa por icono (tree-shaking): `import { X } from 'lucide-react'` ✓
- [ ] Sin imports barrel de todo Lucide: `import * as Icons from 'lucide-react'` ❌
- [ ] `socket.io-client` no se bundlea con el paquete — es `peerDependency`? No, va en `dependencies` pero instanciado solo cuando se conecta

### Renders Innecesarios
- [ ] `chatStore` usa selectors para evitar re-renders de todo el mensaje list
- [ ] `MessageBubble` es `React.memo` — no re-renderiza si las props no cambian
- [ ] `TypingIndicator` solo re-renderiza cuando `typingUsers` cambia

### Imágenes
- [ ] `ImageAttachment` usa `loading="lazy"` para imágenes del historial
- [ ] Dimensiones máximas en el CSS para evitar layout shift

## 7. Animaciones — Guidelines Dragon UI

Regla: animaciones mínimas, funcionales, no decorativas.

| Interacción | Animación | Duración |
|---|---|---|
| Abrir widget | fade-in + slide-up | 200ms ease |
| Cerrar widget | fade-out + slide-down | 120ms ease |
| Nuevo mensaje | fade-in | 120ms ease |
| TypingIndicator | bounce escalonado | loop |
| Expand panel | width + height transition | 200ms ease |
| Error banner | shake | 300ms ease |

```css
@keyframes widget-open {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.widget-enter { animation: widget-open 200ms ease forwards; }
```

```tsx
// Reducir movimiento para accesibilidad
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const animation = prefersReducedMotion ? 'none' : 'widget-enter'
```

## 8. Swipe Down para Cerrar (Mobile)

En mobile, el widget full-screen permite cerrar con swipe down:

```tsx
function useSwipeDown(onClose: () => void) {
  const startY = useRef(0)

  return {
    onTouchStart: (e: React.TouchEvent) => { startY.current = e.touches[0].clientY },
    onTouchEnd: (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY.current
      if (deltaY > 80) onClose()  // swipe down > 80px → cerrar
    },
  }
}
```

## 9. Estrategia de Releases y Actualizaciones

El paquete se publica en npm. El usuario final actualiza con un solo comando y recibe todos los cambios: estilos, lógica y componentes actualizados a la vez, sin tocar su código.

### 9.1 Contrato de Versiones (Semver)

| Tipo de cambio | Versión | Ejemplo |
|---|---|---|
| Bug fix, ajuste visual, nueva traducción, corrección iOS | `patch` (0.x.**Y**) | `0.2.1` |
| Nueva feature, nuevo prop opcional, nuevo idioma | `minor` (0.**X**.0) | `0.3.0` |
| Cambio en props requeridos, remoción de export, cambio de comportamiento | `major` (**X**.0.0) | `1.0.0` |

**Regla práctica:** si el usuario no cambia nada en su código y la app sigue funcionando, es `patch` o `minor`. Si necesita adaptar su integración, es `major`.

### 9.2 Flujo de Release (el equipo publica una actualización)

**Aclaración importante:** pnpm no es un registro. El registro es `registry.npmjs.org` (npm), el mismo que usa npm, yarn, o cualquier otro gestor. Se necesita cuenta en npmjs.com y hacer `npm login` una vez por máquina.

```powershell
# Desde frontend/packages/suportum-chat/

# Primera vez en la máquina: autenticarse en npm
npm login

# 1. Build limpio
pnpm --filter suportum-chat build

# 2. Verificar el contenido que se va a publicar (dry run)
pnpm --filter suportum-chat publish --dry-run

# 3. Bump de versión ANTES de publicar
#    npm rechaza el publish si la versión ya existe en el registro
npm version patch   # fix / ajuste visual:     0.2.0 -> 0.2.1
npm version minor   # nueva feature:           0.2.0 -> 0.3.0
npm version major   # cambio de API publica:   0.2.0 -> 1.0.0

# Alpha (desde el principio funciona igual que cualquier version):
# Editar manualmente "version": "0.1.0-alpha.1" en package.json

# 4. Publicar al registro npm
pnpm --filter suportum-chat publish --no-git-checks

# 5. Tag en git
git tag v0.2.1
git push origin v0.2.1
```

### 9.3 Comando de Actualización para el Usuario Final

Una vez publicada la nueva versión, el usuario solo necesita:

```bash
pnpm update suportum-chat     # gestor recomendado
npm update suportum-chat      # también válido
yarn upgrade suportum-chat    # también válido
```

Sin más pasos. El CSS viene embebido en el bundle (`injectStyle: true`), por lo que no hay archivos separados que re-importar ni configuración que tocar. La actualización es atómica: JS + estilos + lógica en un solo comando.

Después del update, sin reiniciar nada ni tocar configuración, el widget ya corre la nueva versión. El CSS actualizado viene embebido en el bundle gracias a `injectStyle: true` en tsup — no hay archivos CSS separados que re-importar.

### 9.4 API Pública Estable (superficie de breaking change)

Lo siguiente es la API pública del paquete. Cualquier cambio aquí es un `major`:

```ts
// Props del componente raíz — contrato estable
interface SupportWidgetProps {
  apiUrl: string          // requerido
  apiKey: string          // requerido
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  theme?: 'dark-dragon' | 'light-clean'
  locale?: 'en' | 'es'
}

// Export nombrado estable
export { SupportWidget } from './templates/SupportWidget'
```

Regla de implementación: nunca remover ni renombrar una prop sin subir major. Agregar props opcionales con default es siempre `minor`.

### 9.5 CHANGELOG

Mantener `frontend/packages/suportum-chat/CHANGELOG.md` con formato simple:

```markdown
## [0.2.1] — 2026-06-15
- Fix: botón de cierre no respondía en iOS 15

## [0.2.0] — 2026-06-10
- Add: soporte de idioma español
- Add: prop `locale`
```

Nunca incluir detalles de implementación interna ni referencias a tickets. Solo lo que impacta al usuario.

### 9.6 Checklist Pre-Publicación

```powershell
# Build limpio
pnpm --filter suportum-chat build

# Verificar archivos del paquete (solo dist/ y README.md)
pnpm --filter suportum-chat publish --dry-run

# Verificar que injectStyle funciona: abrir demo sin ningún import CSS externo
pnpm --filter demo dev
# Abrir localhost:5173 — el widget debe verse con estilos correctos
```

- [ ] `"name": "suportum-chat"` (una sola 'p')
- [ ] `"version"` bumpeado correctamente según semver
- [ ] `"main"`, `"module"`, `"types"` apuntan a `dist/`
- [ ] `"peerDependencies"`: `react >= 18`, `react-dom >= 18`
- [ ] `"files"`: solo `["dist", "README.md"]`
- [ ] `dist/` tiene el CSS embebido en el JS (no hay `.css` suelto)
- [ ] `CHANGELOG.md` actualizado con los cambios de esta versión
- [ ] Sin `node_modules`, `src/`, `features/` en el paquete publicado
- [ ] `README` tiene el ejemplo de uso mínimo actualizado

## 10. Auditoría Final del Paquete npm

### Antes de `pnpm publish`
```powershell
# Build limpio
pnpm --filter suportum-chat build

# Verificar contenido del paquete
ls frontend\packages\suportum-chat\dist\

# Verificar exports en package.json
# main, module, types deben apuntar a dist/
```

### Checklist de package.json
- [ ] `"name": "suportum-chat"` (una sola 'p')
- [ ] `"version"` semver correcto
- [ ] `"main"`, `"module"`, `"types"` apuntan a `dist/`
- [ ] `"peerDependencies"`: `react >= 18`
- [ ] Sin `node_modules` ni `src/` en el paquete publicado (campo `"files"` en package.json)
- [ ] `README` con ejemplo de uso mínimo

## 10. Desarrollo — Pasos

1. Ejecutar grep de auditoría iOS (sección 2)
2. Corregir cada finding
3. Implementar `EmptyState` y aplicar en todas las listas
4. Implementar estados de error de red en todos los hooks de fetch
5. Implementar `useVirtualKeyboard` e integrar en `ChatPanel` y `LoginView`
6. Implementar swipe-down en mobile
7. Añadir `aria-label` donde falten
8. Verificar contraste de colores con herramienta (ej: axe DevTools)
9. `pnpm --filter suportum-chat build` — verificar `dist/` correctamente generado
10. Test en iPhone físico o simulador iOS

## 11. Test en Dispositivos

### Test Mínimo Obligatorio
- [ ] iPhone 14 (iOS 16) — Safari: login, enviar mensaje, ver notificación de typing
- [ ] iPhone 13 (iOS 15) — Safari: verificar dvh funciona
- [ ] Android Chrome: login, chat, upload imagen
- [ ] Desktop Chrome/Firefox: todas las funcionalidades

### Fallback para iOS < 15.4 (sin dvh)
```css
.widget-full {
  height: 100vh;          /* fallback universal */
  height: 100dvh;         /* iOS 15.4+ — sobreescribe si está disponible */
}
```

## 12. Criterios de Aprobación (Done)
- [ ] Cero findings en grep de auditoría iOS (clip, backdrop sin webkit, 100vh sin dvh, text-sm en inputs)
- [ ] Todos los estados vacíos implementados
- [ ] Todos los errores de red manejados con retry
- [ ] Test en iPhone: login y chat funcionan sin bugs de layout
- [ ] `aria-label` en todos los botones icónicos
- [ ] `pnpm build` produce `dist/` con CSS embebido (sin archivo `.css` suelto)
- [ ] Demo app abre sin ningún `import '...css'` y el widget se ve con estilos correctos
- [ ] `pnpm publish --dry-run` muestra solo `dist/` y `README.md`
- [ ] `CHANGELOG.md` existe y tiene la entrada de la versión actual
- [ ] Reviewer confirma APPROVED
