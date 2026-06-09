# Suportum Chat Frontend — Contexto de Agentes

## Nombre del paquete npm
`suportum-chat` (una sola 'p')

## Stack
- React (latest)
- Tailwind CSS v4 — tokens via `@theme` en globals.css
- Socket.IO client (latest)
- Zustand (latest) — estado global
- Lucide React (latest) — iconografía (única librería de iconos)
- tsup (latest) — bundler del paquete npm
- pnpm workspaces — monorepo de desarrollo

## Estructura del monorepo
```
frontend/
├── packages/
│   └── suportum-chat/        # Paquete npm publicable
│       └── src/
│           ├── atoms/        # Primitivos sin lógica de negocio
│           ├── molecules/    # 2-5 átomos + lógica de presentación
│           ├── organisms/    # Secciones completas con estado
│           ├── templates/    # Composición final por rol
│           ├── hooks/        # useSocket, useChat, useAuth, useOrders
│           ├── lib/          # api.ts, auth.ts, socket.ts
│           ├── store/        # Zustand stores
│           └── styles/       # globals.css + themes/
├── apps/
│   └── demo/                 # App Vite mínima para desarrollo local (no se despliega)
├── features/                 # specs de cada feature a implementar
├── pnpm-workspace.yaml
└── .gitignore
```

## REGLAS ABSOLUTAS — NUNCA VIOLAR

### Guion medio largo prohibido
JAMAS usar el guion medio largo (—, em dash, U+2014) en ningún texto de la aplicación:
labels, placeholders, tooltips, mensajes vacíos, confirmaciones, comentarios, archivos `.md`.
No existe en español ni en inglés como puntuación correcta para interfaces.
Usar `:` para introducir, `,` para paralelas, `.` para separar ideas.

### i18n obligatorio: cero strings hardcodeados en JSX
Todo texto visible en la UI va en `packages/suportum-chat/src/i18n/en.ts` y `i18n/es.ts`.
Estructura de acceso: `const { t } = useI18n()` → `t('seccion.clave')`.
Nunca: `<p>Iniciar sesión</p>`. Siempre: `<p>{t('auth.signIn')}</p>`.
El idioma del widget se configura durante el setup wizard (paso 1) como `project.settings.language`.
Default: `'en'` (inglés). Soportados: `'en'` y `'es'`.

### Errores del backend son códigos, no mensajes
Las respuestas de error del backend tienen forma: `{ "error": { "code": "SCREAMING_SNAKE_CASE" } }`.
No existe campo `message` proveniente del backend.
En la UI: `t(\`errors.${error.code}\`)` para mostrar el mensaje localizado al usuario.

---

## Reglas críticas para agentes implementadores

### Diseño Atómico
- Átomo NUNCA importa de molecules/organisms/templates
- Molécula NUNCA importa de organisms/templates
- Cada nivel importa solo del nivel inmediatamente inferior

### Tailwind v4
- Tokens declarados en `@theme {}` dentro de globals.css
- Nunca en tailwind.config.js
- Clases nativas sobre arbitrarias (ej: `w-2.5` no `w-[10px]`)
- `@import "tailwindcss"` al tope de globals.css

### iOS Safari (OBLIGATORIO antes de escribir cualquier CSS)
- `overflow-x: hidden` nunca `overflow-x: clip`
- `backdrop-filter` siempre con `-webkit-backdrop-filter` primero
- `height: 100dvh` con fallback `100vh`
- Inputs: `font-size` mínimo 16px (`text-base`)
- Touch targets: mínimo 44x44px (`min-h-11 min-w-11`)
- Inline styles React: `WebkitBackdropFilter` antes de `backdropFilter`

### Iconos
- SOLO Lucide React. Sin otras librerías de iconos.

### Estado
- Access token: Zustand en memoria (sin persistir en localStorage)
- Refresh token: cookie HttpOnly gestionada por el servidor
- `isVerified: false` hasta que /auth/me confirme el rol

### Socket.IO
- Namespace = `/{apiKey}` del proyecto
- Un socket singleton por sesión del widget
- auth: `{ token: accessToken }` en el handshake

## Variables de entorno
Solo `.env` (gitignored) y `.env.example` (en repo). Nunca otros archivos `.env.*`.

---

## Publicación npm — Modelo de Distribución

**pnpm no es un registro separado.** pnpm es solo un gestor de paquetes. El registro es siempre `registry.npmjs.org` (npm), el mismo que usa npm, yarn, o cualquier otro gestor.

### El paquete se publica en npm y se instala/actualiza desde cualquier proyecto:

```bash
# Instalar (primera vez)
pnpm add suportum-chat

# Actualizar a la versión más reciente publicada
pnpm update suportum-chat
```

Eso es todo lo que necesita hacer el usuario. Sin pasos adicionales, sin re-importar CSS, sin cambios de configuración.

### Flujo de release (quién publica):

```powershell
# 1. Login en npm (una sola vez por máquina)
npm login

# 2. Bump de versión ANTES de publicar (npm rechaza si la versión ya existe)
npm version patch   # fix / ajuste visual:  0.1.0 -> 0.1.1
npm version minor   # nueva feature:        0.1.1 -> 0.2.0
npm version major   # cambio de API pública: 0.2.0 -> 1.0.0

# 3. Build + publicar
pnpm --filter suportum-chat build
pnpm --filter suportum-chat publish --no-git-checks
```

### Alpha y versiones tempranas funcionan igual:

```json
"version": "0.1.0-alpha.1"
```

El usuario instala y actualiza con los mismos comandos desde el primer alpha. No hay diferencia de mecanismo entre alpha y producción, solo el número de versión.

### Regla para los agentes: no inventar otros mecanismos de distribución

El único canal de distribución es el registro npm público. No proponer:
- git submodules
- instalación por URL de GitHub
- workspaces cruzados entre proyectos
- copiar archivos manualmente

Si el usuario pregunta cómo instalar el paquete, la respuesta es siempre `pnpm add suportum-chat`.
