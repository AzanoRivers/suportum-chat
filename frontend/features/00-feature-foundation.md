# 00 — Foundation Frontend

## 1. Objetivo
Setup completo del monorepo pnpm: paquete `suportum-chat` + app `demo` de desarrollo.
Tailwind v4 con `@theme`, atoms base, ThemeProvider, y la estructura atómica lista para recibir componentes.

## 2. Estructura del Monorepo

```
frontend/
├── pnpm-workspace.yaml
├── packages/
│   └── suportum-chat/
│       ├── package.json         # name: "suportum-chat", main: dist/index.js
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── src/
│           ├── index.ts
│           ├── atoms/
│           ├── molecules/
│           ├── organisms/
│           ├── templates/
│           ├── hooks/
│           ├── lib/
│           ├── store/
│           └── styles/
└── apps/
    └── demo/
        ├── package.json         # name: "demo", vite app
        ├── vite.config.ts
        ├── index.html
        ├── .env.example
        └── src/
            ├── main.tsx
            └── App.tsx
```

## 3. Demo App — Página de Prueba Local

La app `demo` no es solo un entorno vacío: simula el sitio web del cliente donde se embebe el widget.
Al correr `pnpm dev`, debe abrirse una página que represente fielmente ese contexto.

### 3.1 Diseño de la Demo Page

Inspirado en el sitio AzanoLabs (`azanolabs-web`):

**Fondo:**
- Color base: `#041528` (azul marino profundo)
- Patrón CSS grid: dos `linear-gradient` perpendiculares de `rgba(255,255,255,0.06)` con celda de `25px×25px`
- Sin librerías externas: puro CSS

**Centro de la página:**
- Logo AzanoLabs centrado vertical y horizontalmente
- Fuente de verdad del logo: `C:\DevCode\Repositories\01_AzanoLabs\azanolabs-web\public\images\og-azanolabs-comp.png`
- Copiar el PNG a `apps/demo/public/azanolabs-logo.png`
- Tamaño responsive: 160px (< 360px), 200px (360-439px), 280px (>= 440px)
- Efecto neon glow con `filter: drop-shadow` en capas (azul + rosa, igual que el original)

**Widget:**
- `SupportWidget` renderizado desde el paquete local `suportum-chat`
- Posición: `bottom-right` (default)
- Visible desde el primer frame: el botón flotante aparece sobre el fondo

### 3.2 Implementación — `apps/demo/src/App.tsx`

```tsx
import { SupportWidget } from 'suportum-chat'
import './demo.css'

export default function App() {
  return (
    <div className="demo-root">
      <div className="demo-center">
        <div className="demo-logo-wrap">
          <img
            src="/azanolabs-logo.png"
            alt="AzanoLabs"
            className="demo-logo"
          />
        </div>
        <p className="demo-hint">Widget de prueba activo</p>
      </div>
      <SupportWidget
        apiUrl={import.meta.env.VITE_API_URL ?? 'http://localhost:8001'}
        apiKey={import.meta.env.VITE_API_KEY ?? 'demo-key'}
        position="bottom-right"
        theme="dark-dragon"
        locale="en"
      />
    </div>
  )
}
```

### 3.3 `apps/demo/src/demo.css`

CSS puro, sin Tailwind (la demo app es independiente del paquete):

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: #041528;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
}

.demo-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #041528;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 25px 25px;
  position: relative;
}

.demo-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  user-select: none;
  pointer-events: none;
}

.demo-logo-wrap {
  width: 160px;
  height: 160px;
  position: relative;
}

.demo-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter:
    drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))
    drop-shadow(0 -3px 8px rgba(255, 105, 180, 0.7))
    drop-shadow(0 3px 8px rgba(11, 210, 255, 0.8))
    drop-shadow(0 4px 14px rgba(11, 210, 255, 0.6));
  animation: neonFlicker 7.4s ease-in-out infinite;
}

.demo-hint {
  font-family: system-ui, sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (min-width: 360px) {
  .demo-logo-wrap { width: 200px; height: 200px; }
  .demo-root { background-size: 35px 35px; }
}

@media (min-width: 440px) {
  .demo-logo-wrap { width: 280px; height: 280px; }
  .demo-root { background-size: 40px 40px; }
}

@keyframes neonFlicker {
  0%, 55%, 59%, 74%, 78%, 100% { opacity: 1; }
  56%, 58%                       { opacity: 0.7; }
  75%, 77%                       { opacity: 0.85; }
}
```

### 3.4 `apps/demo/.env.example`

```
VITE_API_URL=http://localhost:8001
VITE_API_KEY=tu-clave-de-api
```

### 3.5 Paso de Setup — Logo PNG

```powershell
# Desde la raíz del monorepo (suportum-chat/)
Copy-Item `
  "C:\DevCode\Repositories\01_AzanoLabs\azanolabs-web\public\images\og-azanolabs-comp.png" `
  "frontend\apps\demo\public\azanolabs-logo.png"
```

> Este archivo NO se versiona en git (añadir a `.gitignore` de la demo app).
> Cada desarrollador que clone el repo debe copiarlo o reemplazarlo con el logo de su propio proyecto.

---

## 4. Archivos de Configuración a Crear

### `packages/suportum-chat/package.json`

Diseñado para actualizaciones sin fricción: el usuario corre un solo comando y obtiene la versión más reciente con todos los cambios, sin tocar imports ni configuración.

```json
{
  "name": "suportum-chat",
  "version": "0.1.0",
  "description": "Real-time support widget for web applications",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": { "react": ">=18", "react-dom": ">=18" },
  "dependencies": {
    "socket.io-client": "latest",
    "zustand": "latest",
    "lucide-react": "latest"
  },
  "publishConfig": { "access": "public" }
}
```

**Campo `files`:** solo `dist/` y `README.md` van al registro npm. El código fuente, la demo y las features nunca se publican.

**Sin versiones fijas en `dependencies`**: el paquete declara `"latest"` durante desarrollo; al publicar se usa `pnpm publish` con el lockfile del workspace que congela versiones reales. Esto permite que `pnpm update suportum-chat` tire siempre del último build publicado.

### `packages/suportum-chat/tsup.config.ts`

La clave es `injectStyle: true`: los estilos CSS compilados de Tailwind se inyectan automáticamente en el DOM cuando el widget monta, sin que el usuario tenga que importar un archivo CSS separado. Cuando actualice el paquete, los estilos actualizados vienen incluidos.

```ts
import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react', 'react-dom'],
  clean: true,
  injectStyle: true,        // CSS embebido en el bundle JS — cero imports extra
  minify: true,
  sourcemap: false,
  treeshake: true,
})
```

**Por qué `injectStyle`:** el usuario solo hace `import { SupportWidget } from 'suportum-chat'` y listo. No hay `import 'suportum-chat/styles'` que se pueda olvidar o romper en una actualización. El CSS está versionado junto con el JS, así que siempre están sincronizados.

### `apps/demo/vite.config.ts`
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
```

## 4. Instalación de Dependencias

```powershell
# Desde frontend/
pnpm add -w react@latest react-dom@latest
pnpm add -w socket.io-client@latest zustand@latest lucide-react@latest
pnpm add -w -D tsup@latest typescript@latest @types/react@latest @types/react-dom@latest vite@latest @vitejs/plugin-react@latest tailwindcss@latest
```

## 5. Atoms Base a Implementar

### `src/atoms/Button.tsx`
Props: `variant: 'primary'|'ghost'|'danger'`, `size: 'sm'|'md'`, `disabled`, `loading`, `icon?`, `children`
- Dragon UI: sin bordes redondeados excesivos (`rounded-sm` = 2px)
- Touch target mínimo `min-h-11` en mobile
- Estado `loading`: spinner inline, botón deshabilitado

### `src/atoms/Input.tsx`
Props: `type`, `placeholder`, `value`, `onChange`, `error?`, `label?`
- **`text-base` (16px) SIEMPRE** para evitar auto-zoom iOS
- Border `border-border-default`, focus `border-accent`
- Error state: border rojo + mensaje debajo

### `src/atoms/Badge.tsx`
Props: `variant: 'pending'|'active'|'taken'|'completed'|'cancelled'|'default'`, `children`
- Colores Dragon UI: `--color-status-*`

### `src/atoms/Avatar.tsx`
Props: `username`, `size: 'sm'|'md'|'lg'`
- Genera color determinista desde username (hash)
- Muestra iniciales del username

### `src/atoms/Spinner.tsx`
Props: `size: 'sm'|'md'`, `label?`
- CSS animation, sin dependencias de iconos

### `src/atoms/ThemeProvider.tsx`
- `createContext({ theme, setTheme })`
- `useEffect` lee `localStorage('spt-theme')` al montar
- `applyTheme(theme)` añade clase `theme-{name}` al `document.documentElement`
- `export const useTheme = () => useContext(ThemeContext)`

## 6. `styles/globals.css`
Ver archivo ya creado. Incluye `@import "tailwindcss"` y `@theme {}` con todos los tokens Dragon UI.

## 7. UI/UX — Dragon UI Principios

### Paleta de colores
```
Fondo base:    #0a0a0f   (casi negro azulado)
Superficie:    #111118   (cards, panels)
Elevado:       #1a1a24   (modales, dropdowns)
Acento:        #00d4ff   (cian eléctrico — único color de acento)
```

### Tipografía
- UI: `Inter` (sistema)
- Monospace: `JetBrains Mono` para IDs, timestamps, estados

### Border radius
- Máximo `4px` en paneles (`rounded-md`)
- `2px` en elementos de datos (`rounded-sm`)

### Espaciado
- Clases nativas Tailwind: `p-3`, `gap-2`, `mt-4`
- Sin valores arbitrarios excepto cuando no hay clase nativa equivalente

## 8. Maquetación

### Widget cerrado (mobile y desktop)
```
[●] Soporte        ← botón flotante bottom-right, 48x48px
```

### Widget abierto — Mobile (full screen)
```
┌─────────────────────────┐
│ Soporte              [×] │  ← header 48px
├─────────────────────────┤
│                          │
│   [mensajes / contenido] │  ← scroll area
│                          │
├─────────────────────────┤
│ [input texto]    [enviar] │  ← fixed bottom 56px
└─────────────────────────┘
```

### Widget abierto — Desktop (panel flotante)
```
┌────────────────────┐
│ Soporte        [×] │  48px header
├────────────────────┤
│                    │  scroll area
│ [mensajes]         │  384px height
│                    │
├────────────────────┤
│ [input]   [enviar] │  56px
└────────────────────┘
```

## 9. Mobile-First — Reglas Críticas

```tsx
// Widget abierto: full screen en mobile, flotante en desktop
<div className="
  fixed inset-0
  lg:fixed lg:bottom-6 lg:right-6 lg:inset-auto lg:w-96 lg:h-[600px]
  bg-bg-surface border border-border-default
">
```

```css
/* iOS full height */
.widget-open {
  height: 100vh;
  height: 100dvh;   /* iOS 15.4+ */
}
```

## 10. Desarrollo — Pasos

1. Crear `pnpm-workspace.yaml` ✓
2. Crear `packages/suportum-chat/package.json` y `tsup.config.ts`
3. Crear `apps/demo/package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`
4. `pnpm install` desde `frontend/`
5. Implementar atoms: Button, Input, Badge, Avatar, Spinner, ThemeProvider
6. Implementar `styles/globals.css` ✓
7. Verificar `pnpm --filter suportum-chat build` compila sin errores
8. Verificar `pnpm --filter demo dev` levanta el servidor

## 11. Auditoría

### 11.1 Checklist de Estructura
- [ ] Un átomo no importa de molecules/organisms/templates
- [ ] `export` de atoms via `src/atoms/index.ts`
- [ ] `tsup build` produce `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`

### 11.2 Checklist iOS Safari
- [ ] `Input.tsx`: `className="text-base ..."` (16px, nunca text-sm)
- [ ] `Button.tsx`: `min-h-11` en mobile para touch target 44px
- [ ] `globals.css`: no usa `overflow-x: clip`
- [ ] ThemeProvider no usa `window.location` sin verificar server-side

### 11.3 Checklist Tailwind v4
- [ ] `@import "tailwindcss"` al tope de globals.css
- [ ] `@theme {}` contiene todos los tokens Dragon UI
- [ ] Sin `tailwind.config.js`
- [ ] Clases nativas: `w-2.5` no `w-[10px]`

### 11.4 Checklist Demo App
- [ ] Fondo `#041528` con grid CSS visible (no imagen, no librería)
- [ ] Logo centrado con drop-shadow neon (4 capas en desktop, 2 en mobile)
- [ ] Animación `neonFlicker` aplicada al logo
- [ ] `SupportWidget` renderizado y visible sin interacción previa
- [ ] Botón flotante en `bottom-right` desde el primer frame
- [ ] `azanolabs-logo.png` en `apps/demo/public/` (no en git)
- [ ] `demo.css` sin clases Tailwind (es CSS puro, independiente del paquete)
- [ ] `body` y `.demo-root` usan `100dvh` con fallback `100vh`

### 11.5 Checklist i18n
- [ ] `I18nProvider` wrappea el árbol en el `main.tsx` de la demo
- [ ] Cero strings hardcodeados en JSX dentro de `packages/suportum-chat/`
- [ ] Todos los códigos de error del backend tienen traducción en `en.ts` y `es.ts`

## 12. Criterios de Aprobación (Done)
- [ ] `pnpm --filter suportum-chat build` exitoso
- [ ] `pnpm --filter demo dev` levanta en localhost:5173
- [ ] Al abrir localhost:5173 se ve: fondo navy con grid, logo AzanoLabs centrado con glow, botón flotante del widget en bottom-right
- [ ] El logo parpadea suavemente con la animación `neonFlicker`
- [ ] Atoms renderizan correctamente en el demo
- [ ] ThemeProvider aplica clase al `<html>` al cambiar tema
- [ ] globals.css tokens accesibles como clases Tailwind en JSX
- [ ] Reviewer confirma APPROVED
