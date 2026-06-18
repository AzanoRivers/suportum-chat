# suportum-chat

**English** | [Español](#español)

---

## English

### Overview

`suportum-chat` is a React widget package for embedding real-time support, ticket management, and order tracking into any web application. It connects to a Suportum backend and automatically adapts its interface based on the authenticated user role.

---

### Why are there 3 `package.json` files?

This folder is a **pnpm monorepo**: a single repository that holds 3 separate projects, each with its own `package.json`:

```
frontend/                          <-- (1) Monorepo root
├── package.json                       Only has scripts: build, dev, typecheck
│                                      Never published. Just coordinates the workspace.
│
├── packages/
│   └── suportum-chat/             <-- (2) THE npm package (what gets published)
│       ├── package.json               name: "suportum-chat", version: "0.1.0"
│       └── src/                       This is what users install with: pnpm add suportum-chat
│
└── apps/
    └── demo/                      <-- (3) Local development sandbox (never published)
        ├── package.json               name: "demo", private: true
        └── src/                       Vite app that simulates a real site embedding the widget
```

**In short:**
- `(1)` is plumbing: run commands from here, nothing more.
- `(2)` is the real product: the npm package with all React components.
- `(3)` is your local browser preview: open `localhost:5173` and see the widget live while developing.

Only `(2)` ever gets published to npm. Projects `(1)` and `(3)` exist only to make development easier.

---

### Installation (for end users)

```bash
npm install suportum-chat
# or
pnpm add suportum-chat
```

### Keeping Up to Date

```bash
npm update suportum-chat
# or
pnpm update suportum-chat
```

No configuration changes needed after updating. Styles, logic, and components are bundled together in one JS file; the update is atomic.

---

### First-time setup

If no `apiKey` is provided, the widget displays a built-in Setup Wizard that creates the project and generates the key.

```tsx
// First run: omit apiKey to trigger the Setup Wizard
<SuportumChat apiUrl="https://your-backend.example.com" />

// After setup: pass the key you received from the wizard
<SuportumChat
  apiUrl="https://your-backend.example.com"
  apiKey="sproj_4f3a..."
/>
```

The wizard covers three steps: project name and logo, admin account creation, and key display. Once complete, the widget transitions directly to the login screen.

---

### About the API key

The `apiKey` is a **public project identifier**, not a secret. It is safe and intentional to embed it in client-side code.

With the API key alone, nobody can:
- Read messages, tickets, or orders from your project
- Impersonate any user
- Access data from another project

The key only identifies which project the widget belongs to. All data access requires a valid user account (email and password). This is the same model used by Firebase, Intercom, Crisp, and Pusher: all embed a public project identifier in client-side JavaScript.

---

### Basic Usage

```tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <SuportumChat
      apiUrl="https://your-backend.example.com"
      apiKey="your-project-api-key"
    />
  )
}
```

> No CSS import needed. Styles are injected automatically when the widget mounts.

The widget renders a floating button. When opened, users sign in and the UI adapts to their role: `client` sees the chat, `agent` sees tickets and direct messages, `admin` sees full management panels.

---

### Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `apiUrl` | `string` | Yes | | Base URL of the Suportum backend |
| `apiKey` | `string` | No | | Project API key. Omit to show the first-time Setup Wizard |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | No | `'bottom-right'` | Widget button position |
| `theme` | `'dark-dragon' \| 'light-clean'` | No | `'dark-dragon'` | Visual theme |
| `locale` | `'en' \| 'es'` | No | `'en'` | Language for the widget interface |

---

### Theming

Override any design token via CSS custom properties:

```css
:root {
  --color-accent: #ff6b35;
  --color-bg-base: #ffffff;
}
```

---

### Development Setup (contributors)

All commands run from the **monorepo root** (`frontend/`):

```bash
# 1. Install all workspace dependencies (run once after cloning)
pnpm install

# 2. Start the demo app at localhost:5173 to see the widget live
pnpm dev

# 3. Build the publishable package (output: packages/suportum-chat/dist/)
pnpm build

# 4. Type check without building
pnpm typecheck
```

> You never need to `cd` into `packages/suportum-chat/` or `apps/demo/` to run these commands.
> pnpm routes everything automatically via the workspace.

#### First-time local setup

The demo app uses the AzanoLabs logo as a placeholder background. Copy it manually (it is gitignored):

```powershell
Copy-Item `
  "C:\DevCode\Repositories\01_AzanoLabs\azanolabs-web\public\images\og-azanolabs-comp.png" `
  "apps\demo\public\azanolabs-logo.png"
```

Then create your local env file:

```bash
cp apps/demo/.env.example apps/demo/.env
# Edit .env and set VITE_API_URL and VITE_API_KEY
```

---

### Publishing a new version

```powershell
# 1. Bump version (choose one)
npm version patch   # bug fix:     0.1.0 -> 0.1.1
npm version minor   # new feature: 0.1.1 -> 0.2.0
npm version major   # breaking:    0.2.0 -> 1.0.0

# 2. Build
pnpm build

# 3. Publish
pnpm --filter suportum-chat publish --no-git-checks
```

---

### Component Architecture

The package follows Atomic Design. Each level only imports from the level immediately below it:

```
atoms/        Button, Input, Badge, Avatar, Spinner
    |
molecules/    MessageBubble, MessageInput, TypingIndicator, OrderCard...
    |
organisms/    ChatPanel, AgentInbox, ClientOrders, AdminUsers...
    |
templates/    FloatingWidget (the root component)
```

Supporting layers (no hierarchy restriction):

```
hooks/        useSocket, useChat, useAuth, useOrders
lib/          api.ts, socket.ts
store/        authStore (Zustand)
i18n/         en.ts, es.ts, useI18n hook
styles/       globals.css (Tailwind v4 @theme tokens), themes/
```

---

## Español

### Descripcion general

`suportum-chat` es un paquete de widget React para embeber soporte en tiempo real, gestion de tickets y seguimiento de ordenes en cualquier aplicacion web. Se conecta a un backend Suportum y adapta su interfaz automaticamente segun el rol del usuario autenticado.

---

### Por que hay 3 archivos `package.json`?

Esta carpeta es un **monorepo pnpm**: un solo repositorio que contiene 3 proyectos separados, cada uno con su propio `package.json`:

```
frontend/                          <-- (1) Raiz del monorepo
├── package.json                       Solo tiene scripts: build, dev, typecheck
│                                      Nunca se publica. Solo coordina el workspace.
│
├── packages/
│   └── suportum-chat/             <-- (2) EL paquete npm (lo que se publica)
│       ├── package.json               name: "suportum-chat", version: "0.1.0"
│       └── src/                       Esto es lo que instalan los usuarios: pnpm add suportum-chat
│
└── apps/
    └── demo/                      <-- (3) Sandbox de desarrollo local (nunca se publica)
        ├── package.json               name: "demo", private: true
        └── src/                       App Vite que simula un sitio real embebiendo el widget
```

**En resumen:**
- `(1)` es fontaneria: corre comandos desde aqui, nada mas.
- `(2)` es el producto real: el paquete npm con todos los componentes React.
- `(3)` es tu preview en el browser: abre `localhost:5173` y ve el widget en vivo mientras desarrollas.

Solo `(2)` se publica en npm. Los proyectos `(1)` y `(3)` existen solo para facilitar el desarrollo.

---

### Instalacion (usuarios finales)

```bash
npm install suportum-chat
# o
pnpm add suportum-chat
```

### Mantenerlo actualizado

```bash
npm update suportum-chat
# o
pnpm update suportum-chat
```

No hacen falta cambios de configuracion al actualizar. Estilos, logica y componentes van en un solo archivo JS.

---

### Primer setup

Si no se pasa `apiKey`, el widget muestra un Setup Wizard integrado que crea el proyecto y genera la clave.

```tsx
// Primer uso: omitir apiKey para mostrar el Setup Wizard
<SuportumChat apiUrl="https://tu-backend.ejemplo.com" />

// Despues del setup: pasar la clave que recibiste del wizard
<SuportumChat
  apiUrl="https://tu-backend.ejemplo.com"
  apiKey="sproj_4f3a..."
/>
```

El wizard cubre tres pasos: nombre y logo del proyecto, creacion de la cuenta admin, y visualizacion de la clave. Al terminar, el widget pasa directamente a la pantalla de login.

---

### Sobre la API key

La `apiKey` es un **identificador publico del proyecto**, no un secreto. Es seguro e intencional incluirla en el codigo del cliente.

Solo con la API key, nadie puede:
- Leer mensajes, tickets ni ordenes de tu proyecto
- Suplantar a ningun usuario
- Acceder a datos de otro proyecto

La clave solo identifica a que proyecto pertenece el widget. Todo acceso a datos requiere una cuenta de usuario valida (email y contrasena). Este es el mismo modelo que usan Firebase, Intercom, Crisp y Pusher: todos incluyen un identificador publico de proyecto en el JavaScript del cliente.

---

### Uso basico

```tsx
import { SuportumChat } from 'suportum-chat'

export default function App() {
  return (
    <SuportumChat
      apiUrl="https://tu-backend.ejemplo.com"
      apiKey="tu-clave-de-api"
    />
  )
}
```

> No hace falta importar CSS. Los estilos se inyectan automaticamente cuando el widget monta.

---

### Props

| Prop | Tipo | Requerido | Por defecto | Descripcion |
|---|---|---|---|---|
| `apiUrl` | `string` | Si | | URL base del backend Suportum |
| `apiKey` | `string` | No | | Clave de API del proyecto. Omitir para mostrar el Setup Wizard |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | No | `'bottom-right'` | Posicion del boton flotante |
| `theme` | `'dark-dragon' \| 'light-clean'` | No | `'dark-dragon'` | Tema visual |
| `locale` | `'en' \| 'es'` | No | `'en'` | Idioma de la interfaz |

---

### Configuracion de desarrollo (contribuidores)

Todos los comandos se corren desde la **raiz del monorepo** (`frontend/`):

```bash
# 1. Instalar dependencias del workspace (una vez al clonar)
pnpm install

# 2. Iniciar la app demo en localhost:5173
pnpm dev

# 3. Compilar el paquete publicable (salida: packages/suportum-chat/dist/)
pnpm build

# 4. Verificacion de tipos sin compilar
pnpm typecheck
```

> Nunca necesitas hacer `cd` a `packages/suportum-chat/` ni a `apps/demo/` para estos comandos.
> pnpm enruta todo automaticamente via el workspace.

#### Setup inicial

La app demo usa el logo de AzanoLabs como fondo. Copialo manualmente (esta en .gitignore):

```powershell
Copy-Item `
  "C:\DevCode\Repositories\01_AzanoLabs\azanolabs-web\public\images\og-azanolabs-comp.png" `
  "apps\demo\public\azanolabs-logo.png"
```

Luego crea tu archivo de entorno local:

```bash
cp apps/demo/.env.example apps/demo/.env
# Edita .env con VITE_API_URL y VITE_API_KEY
```

---

### Arquitectura de componentes

El paquete sigue Atomic Design. Cada nivel solo importa del nivel inmediatamente inferior:

```
atoms/        Button, Input, Badge, Avatar, Spinner
    |
molecules/    MessageBubble, MessageInput, TypingIndicator, OrderCard...
    |
organisms/    ChatPanel, AgentInbox, ClientOrders, AdminUsers...
    |
templates/    FloatingWidget (componente raiz)
```

Capas de soporte (sin restriccion de jerarquia):

```
hooks/        useSocket, useChat, useAuth, useOrders
lib/          api.ts, socket.ts
store/        authStore (Zustand)
i18n/         en.ts, es.ts, hook useI18n
styles/       globals.css (tokens Tailwind v4 @theme), themes/
```

