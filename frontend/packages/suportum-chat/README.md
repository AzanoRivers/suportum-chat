# suportum-chat

[English](#suportum-chat) | [Español](#suportum-chat-español)

Real-time support widget for web applications built with React, Socket.IO and Zustand. Connects to a [Suportum](https://chat.azanolabs.com) backend and renders a floating chat panel with role-based views for clients, agents and admins.

**Features:**
- Real-time messaging via WebSocket (Socket.IO)
- Role-based UI: `client`, `agent`, `admin`
- Ticket management and order tracking
- Direct chat between agents and clients
- Minimizable floating widget with animations
- Dark and light themes
- English and Spanish UI, auto-detected from the visitor's browser
- Optional custom logo per project
- Mobile-friendly (iOS Safari safe)

---

## Installation

```bash
pnpm add suportum-chat
# or
npm install suportum-chat
```

React and React DOM are required as peer dependencies:

```bash
pnpm add react react-dom
```

---

## Usage

```tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <>
      {/* rest of your app */}
      <SuportumChat
        apiUrl="https://chat.azanolabs.com"
        apiKey="your-api-key"
      />
    </>
  )
}
```

The widget mounts a floating button fixed to the screen. When clicked it opens a full panel that connects to the Suportum backend via WebSocket. Users can log in or register directly inside the widget. The UI adapts based on the authenticated user's role.

---

## Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `apiUrl` | `string` | - | Yes | Base URL of your Suportum backend (e.g. `https://chat.azanolabs.com`) |
| `apiKey` | `string` | - | Yes | Project API key from the Suportum dashboard |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | No | Screen position of the floating button |
| `theme` | `'dark-dragon' \| 'light-clean'` | `'dark-dragon'` | No | Visual theme. Persisted in `localStorage` |
| `locale` | `'en' \| 'es' \| 'auto'` | `'auto'` | No | `'en'`/`'es'` force that language. `'auto'` (or omitting the prop) detects the visitor's browser language, falling back to English if it's not Spanish. Manual language switches from the widget's own EN/ES toggle are remembered in `localStorage` across reloads |
| `buttonLabel` | `string` | `'Support'` | No | Label shown on the floating button |
| `userToken` | `string` | - | No | Pre-load an existing JWT to skip the login screen |
| `onSetupComplete` | `(apiKey: string) => void` | - | No | Callback fired after first-time project setup is completed |
| `onProjectReset` | `() => void` | - | No | Callback fired when there's no `apiKey` to work with. Use it to clear any key your app may have stored (e.g. in `localStorage`), so the next load starts clean |

---

## Framework examples

### Astro

Wrap in a React component and use `client:load` so the widget hydrates in the browser (required for Socket.IO and Zustand).

```tsx
// src/components/SupportWidget.tsx
import { SuportumChat } from 'suportum-chat'

export default function SupportWidget() {
  return (
    <SuportumChat
      apiUrl="https://chat.azanolabs.com"
      apiKey="your-api-key"
    />
  )
}
```

```astro
---
// src/pages/index.astro
import SupportWidget from '../components/SupportWidget.tsx'
---

<SupportWidget client:load />
```

### Next.js (App Router)

Mark the component as a Client Component because the widget uses browser-only APIs.

```tsx
// app/components/SupportWidget.tsx
'use client'

import { SuportumChat } from 'suportum-chat'

export default function SupportWidget() {
  return (
    <SuportumChat
      apiUrl="https://chat.azanolabs.com"
      apiKey="your-api-key"
    />
  )
}
```

```tsx
// app/layout.tsx
import SupportWidget from './components/SupportWidget'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SupportWidget />
      </body>
    </html>
  )
}
```

### Vite + React

```tsx
// src/App.tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <>
      <YourApp />
      <SuportumChat
        apiUrl="https://chat.azanolabs.com"
        apiKey="your-api-key"
        theme="light-clean"
        locale="es"
        position="bottom-left"
      />
    </>
  )
}
```

---

## How it works

1. The widget renders a floating button fixed to the screen corner.
2. On click, it opens a panel and establishes a WebSocket connection to `apiUrl/{apiKey}` using Socket.IO.
3. If `apiKey` isn't set at all, the widget shows a first-time setup wizard to create a project (name, admin account, and an optional logo: PNG/JPG/GIF/WebP, max 2MB, auto-resized to 512px). It returns a new `apiKey` via `onSetupComplete`.
4. If `apiKey` doesn't match any project on the backend, or belongs to a different domain than the one it was originally registered from, the widget shows an explanatory screen instead of the login form, it never fails silently.
5. Otherwise, the user logs in or registers inside the widget. The JWT is stored in memory (Zustand) and not persisted beyond the session.
6. The UI switches between three role-based views:
   - **Client**: general chat, tickets, orders, profile
   - **Agent**: general chat, direct messages, ticket queue, orders board, profile
   - **Admin**: all agent views plus user management and settings (including changing the project logo)
7. Closing the widget disconnects the socket. Minimizing keeps the connection alive and shows a compact bar on desktop or the floating button on mobile.

---

## License

MIT

---

---

# suportum-chat (Español)

[English](#suportum-chat) | [Español](#suportum-chat-español)

Widget de soporte en tiempo real para aplicaciones web, construido con React, Socket.IO y Zustand. Se conecta a un backend [Suportum](https://chat.azanolabs.com) y renderiza un panel de chat flotante con vistas por rol para clientes, agentes y administradores.

**Funcionalidades:**
- Mensajería en tiempo real via WebSocket (Socket.IO)
- UI adaptada por rol: `client`, `agent`, `admin`
- Gestión de tickets y seguimiento de órdenes
- Chat directo entre agentes y clientes
- Widget flotante minimizable con animaciones
- Temas oscuro y claro
- UI en inglés y español, auto-detectado del navegador del visitante
- Logo personalizado opcional por proyecto
- Compatible con mobile (iOS Safari)

---

## Instalación

```bash
pnpm add suportum-chat
# o
npm install suportum-chat
```

React y React DOM son peer dependencies requeridos:

```bash
pnpm add react react-dom
```

---

## Uso

```tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <>
      {/* resto de tu app */}
      <SuportumChat
        apiUrl="https://chat.azanolabs.com"
        apiKey="tu-api-key"
      />
    </>
  )
}
```

El widget monta un botón flotante fijo en la pantalla. Al hacer click abre un panel completo que se conecta al backend via WebSocket. Los usuarios pueden iniciar sesión o registrarse directamente dentro del widget. La UI se adapta según el rol del usuario autenticado.

---

## Props

| Prop | Tipo | Default | Requerido | Descripción |
|------|------|---------|-----------|-------------|
| `apiUrl` | `string` | - | Si | URL base del backend Suportum (ej. `https://chat.azanolabs.com`) |
| `apiKey` | `string` | - | Si | API key del proyecto desde el panel de Suportum |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | No | Posición en pantalla del botón flotante |
| `theme` | `'dark-dragon' \| 'light-clean'` | `'dark-dragon'` | No | Tema visual. Se persiste en `localStorage` |
| `locale` | `'en' \| 'es' \| 'auto'` | `'auto'` | No | `'en'`/`'es'` fuerzan ese idioma. `'auto'` (o no pasar el prop) detecta el idioma del navegador del visitante, y cae a inglés si no es español. El toggle EN/ES propio del widget se recuerda en `localStorage` entre recargas |
| `buttonLabel` | `string` | `'Support'` | No | Etiqueta del botón flotante |
| `userToken` | `string` | - | No | JWT pre-cargado para saltear la pantalla de login |
| `onSetupComplete` | `(apiKey: string) => void` | - | No | Callback que se dispara al completar la configuración inicial del proyecto |
| `onProjectReset` | `() => void` | - | No | Callback que se dispara cuando no hay ningún `apiKey` para trabajar. Usalo para limpiar cualquier clave que tu app haya guardado (ej. en `localStorage`), así la próxima carga arranca limpia |

---

## Ejemplos por framework

### Astro

Envolvé el componente en React y usá `client:load` para que el widget se hidrate en el browser (requerido para Socket.IO y Zustand).

```tsx
// src/components/SupportWidget.tsx
import { SuportumChat } from 'suportum-chat'

export default function SupportWidget() {
  return (
    <SuportumChat
      apiUrl="https://chat.azanolabs.com"
      apiKey="tu-api-key"
    />
  )
}
```

```astro
---
// src/pages/index.astro
import SupportWidget from '../components/SupportWidget.tsx'
---

<SupportWidget client:load />
```

### Next.js (App Router)

Marcá el componente como Client Component porque el widget usa APIs exclusivas del browser.

```tsx
// app/components/SupportWidget.tsx
'use client'

import { SuportumChat } from 'suportum-chat'

export default function SupportWidget() {
  return (
    <SuportumChat
      apiUrl="https://chat.azanolabs.com"
      apiKey="tu-api-key"
    />
  )
}
```

```tsx
// app/layout.tsx
import SupportWidget from './components/SupportWidget'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SupportWidget />
      </body>
    </html>
  )
}
```

### Vite + React

```tsx
// src/App.tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <>
      <TuApp />
      <SuportumChat
        apiUrl="https://chat.azanolabs.com"
        apiKey="tu-api-key"
        theme="light-clean"
        locale="es"
        position="bottom-left"
      />
    </>
  )
}
```

---

## Como funciona

1. El widget renderiza un botón flotante fijo en la esquina de la pantalla.
2. Al hacer click abre un panel y establece una conexión WebSocket a `apiUrl/{apiKey}` via Socket.IO.
3. Si no se pasa ningún `apiKey`, el widget muestra un asistente de configuración inicial para crear un proyecto (nombre, cuenta admin, y un logo opcional: PNG/JPG/GIF/WebP, máx 2MB, redimensionado automáticamente a 512px). Devuelve un `apiKey` nuevo via `onSetupComplete`.
4. Si el `apiKey` no corresponde a ningún proyecto en el backend, o pertenece a un dominio distinto al que se registró originalmente, el widget muestra una pantalla explicativa en vez del formulario de login, nunca falla en silencio.
5. Si no, el usuario inicia sesión o se registra dentro del widget. El JWT se almacena en memoria (Zustand) y no se persiste más allá de la sesión.
6. La UI cambia entre tres vistas por rol:
   - **Client**: chat general, tickets, órdenes, perfil
   - **Agent**: chat general, mensajes directos, cola de tickets, tablero de órdenes, perfil
   - **Admin**: todas las vistas de agente más gestión de usuarios y configuración (incluyendo cambiar el logo del proyecto)
7. Cerrar el widget desconecta el socket. Minimizarlo mantiene la conexión activa y muestra una barra compacta en desktop o el botón flotante en mobile.

---

## Licencia

MIT
