# suportum-chat

**English** | [Español](#español)

---

## English

### Overview

`suportum-chat` is a React widget package for embedding real-time support, ticket management, and order tracking into any web application. It connects to a Suportum backend and automatically adapts its interface based on the authenticated user's role.

### Installation

```bash
npm install suportum-chat
# or
pnpm add suportum-chat
```

### Keeping Up to Date

The widget is updated frequently with fixes and improvements. To get the latest version, run a single command in your project:

```bash
# npm
npm update suportum-chat

# pnpm
pnpm update suportum-chat

# yarn
yarn upgrade suportum-chat
```

No configuration changes needed after updating. Styles, logic, and components are always bundled together, so the update is atomic.

### Basic Usage

```tsx
import { SupportWidget } from 'suportum-chat'
import 'suportum-chat/styles'

export default function App() {
  return (
    <SupportWidget
      apiUrl="https://your-backend.example.com"
      apiKey="your-project-api-key"
    />
  )
}
```

The widget renders a floating button. When opened, users are asked to sign in. The UI adapts to their role: `client` sees the chat, `agent` sees tickets and direct messages, `admin` sees full management panels.

### Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `apiUrl` | `string` | Yes | | Base URL of the Suportum backend |
| `apiKey` | `string` | Yes | | Project API key from the admin panel |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | No | `'bottom-right'` | Widget button position |
| `theme` | `'dark-dragon' \| 'light-clean'` | No | `'dark-dragon'` | Visual theme |
| `locale` | `'en' \| 'es'` | No | `'en'` | Language for the widget interface |

### Theming

The package ships with two built-in themes. You can override design tokens by targeting CSS custom properties:

```css
:root {
  --color-accent: #ff6b35;
  --color-bg-base: #ffffff;
}
```

### Development Setup

```bash
# Clone and install workspace dependencies
pnpm install

# Start the demo app (connects to a local backend on port 8001)
pnpm dev

# Build the package
pnpm build

# Type check
pnpm typecheck
```

### Project Structure

```
frontend/
├── packages/
│   └── suportum-chat/        # Publishable npm package
│       └── src/
│           ├── atoms/        # Base UI primitives
│           ├── molecules/    # Composed components
│           ├── organisms/    # Feature sections with state
│           ├── templates/    # Role-specific layouts
│           ├── hooks/        # Business logic hooks
│           ├── lib/          # API client, socket, auth
│           ├── store/        # Zustand global stores
│           ├── i18n/         # en.ts, es.ts, hook
│           └── styles/       # globals.css + themes
└── apps/
    └── demo/                 # Vite development sandbox
```

---

## Español

### Descripción general

`suportum-chat` es un paquete de widget React para embeber soporte en tiempo real, gestión de tickets y seguimiento de órdenes en cualquier aplicación web. Se conecta a un backend Suportum y adapta su interfaz automáticamente según el rol del usuario autenticado.

### Instalación

```bash
npm install suportum-chat
# o
pnpm add suportum-chat
```

### Uso básico

```tsx
import { SupportWidget } from 'suportum-chat'
import 'suportum-chat/styles'

export default function App() {
  return (
    <SupportWidget
      apiUrl="https://tu-backend.ejemplo.com"
      apiKey="tu-clave-de-api-del-proyecto"
    />
  )
}
```

El widget renderiza un botón flotante. Al abrirlo, se solicita al usuario que inicie sesión. La interfaz se adapta a su rol: `client` ve el chat, `agent` ve tickets y mensajes directos, `admin` ve los paneles de gestión completos.

### Props

| Prop | Tipo | Requerido | Por defecto | Descripción |
|---|---|---|---|---|
| `apiUrl` | `string` | Si | | URL base del backend Suportum |
| `apiKey` | `string` | Si | | Clave de API del proyecto desde el panel de admin |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | No | `'bottom-right'` | Posición del botón del widget |
| `theme` | `'dark-dragon' \| 'light-clean'` | No | `'dark-dragon'` | Tema visual |
| `locale` | `'en' \| 'es'` | No | `'en'` | Idioma de la interfaz del widget |

### Temas

El paquete incluye dos temas integrados. Se pueden sobreescribir los tokens de diseño apuntando a las propiedades CSS personalizadas:

```css
:root {
  --color-accent: #ff6b35;
  --color-bg-base: #ffffff;
}
```

### Configuración de Desarrollo

```bash
# Clonar e instalar dependencias del workspace
pnpm install

# Iniciar la app demo (conecta a un backend local en el puerto 8001)
pnpm dev

# Compilar el paquete
pnpm build

# Verificación de tipos
pnpm typecheck
```

### Estructura del Proyecto

```
frontend/
├── packages/
│   └── suportum-chat/        # Paquete npm publicable
│       └── src/
│           ├── atoms/        # Primitivos base de UI
│           ├── molecules/    # Componentes compuestos
│           ├── organisms/    # Secciones de feature con estado
│           ├── templates/    # Layouts por rol
│           ├── hooks/        # Hooks de lógica de negocio
│           ├── lib/          # Cliente API, socket, auth
│           ├── store/        # Stores globales Zustand
│           ├── i18n/         # en.ts, es.ts, hook
│           └── styles/       # globals.css + temas
└── apps/
    └── demo/                 # Sandbox de desarrollo con Vite
```
