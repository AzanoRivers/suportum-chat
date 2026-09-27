# Historial de Sesiones — Suportum

> Archivo append-only. El Orchestrer agrega una entrada al cerrar cada sesión.
> No borrar ni editar entradas anteriores.

---

## 2026-06-08 — f01 backend Foundation — APPROVED

**Scope:** backend solamente
**Archivos creados:** `app/core/auth.py`, `app/core/guards.py`, `app/core/project.py`, `app/core/project.py`, `app/api/v1/setup.py`, `app/api/v1/auth.py`, `app/models/setup.py`, `app/models/auth.py`
**Archivos modificados:** `app/api/v1/router.py`, `app/config.py`, `app/database.py`, `.env`, `.env.example`

**Correcciones post-review:**
- `app/config.py`: model_validator `mode="before"` para tratar `DATABASE_URL=""` como no definido y usar default de `tempfile.gettempdir()`
- `app/core/guards.py`: `HTTPAuthorizationCredentials | None` → `Optional[HTTPAuthorizationCredentials]` (Python 3.9)
- `app/core/project.py`: `dict | None` → `Optional[dict]` (Python 3.9)
- `app/database.py`: `Connection | None` → `Optional[aiosqlite.Connection]` (Python 3.9)

**Restricciones documentadas:**
- Python 3.9 en VPS: usar `Optional[X]` de `typing`, no `X | Y`
- Datos en `tempfile.gettempdir()/suportum/` (Windows: `%TEMP%`, Linux: `/tmp`)

---

## 2026-06-08 — f02 backend Chat Core — APPROVED

**Archivos creados:** `app/sockets/rooms.py`, `app/sockets/events.py`, `app/api/v1/messages.py`
**Archivos modificados:** `app/api/v1/router.py`, `app/main.py`

**Correcciones post-review:**
- `events.py`: `on_direct_open` ahora une al target al room usando dict `_connected` (namespace -> {user_id: sid}), actualizado en connect/disconnect
- `main.py`: em dash en comentario reemplazado por guion simple

---

## 2026-06-08 — f03 backend Tickets — APPROVED

**Archivos creados:** `app/api/v1/tickets.py`
**Archivos modificados:** `app/api/v1/router.py`, `.env` (fix BOM UTF-8)

**Correcciones post-review:**
- Docstring: em dash reemplazado por `:` en las 5 lineas del modulo
- Transicion invalida: `error_response("FORBIDDEN", 403)` corregido a `error_response("INVALID_TRANSITION", 400)`
- `agent_id`: agent puede asignarse a si mismo; admin puede asignar a cualquier agent
- Validacion al cambiar `agent_id`: verifica que el usuario existe en el proyecto con `role = agent` e `is_active = 1`

**Fix adicional:** `.env` tenia BOM UTF-8 que causaba que pydantic-settings leyera la primera clave como `﻿project_name`, bloqueando todos los imports.

---

## 2026-06-08 — f04 backend Orders — APPROVED

**Archivos creados:** `app/api/v1/orders.py`
**Archivos modificados:** `app/api/v1/router.py`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Implementado:**
- Maquina de estados: `pending/active/taken/completed/cancelled`, `completed` es terminal
- `details` como JSON serializado (TEXT en SQLite), max 50KB, fallback `{}`
- Filtros GET: `?status=a,b,c`, `?agent_id=me`, `?client_id=` (solo agent/admin)
- Socket.IO: `order:updated` con `action=created|updated` a `orders:board`
- IDOR: client solo ve sus ordenes, get individual con doble filtro `id + project_id`

---

## 2026-06-08 — f05 backend Users — APPROVED

**Archivos creados:** `app/api/v1/users.py`, `app/core/utils.py`
**Archivos modificados:** `app/api/v1/router.py`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Implementado:**
- CRUD completo con permisos por rol (admin todo, agent/client perfil propio)
- `password` nunca en respuestas; `SELECT` siempre lista campos explicitamente
- Soft delete: `is_active = 0`, no DELETE fisico
- IntegrityError capturado para `409 EMAIL_TAKEN` / `409 USERNAME_TAKEN`
- Proteccion anti-lockout: admin no puede desactivarse ni cambiar su propio rol
- `app/core/utils.py` con `now_iso()`

---

## 2026-06-08 — f05 backend Upload Images — APPROVED

**Archivos creados:** `app/api/v1/upload.py`, `app/core/upload.py`
**Archivos modificados:** `app/api/v1/router.py`, `requirements.txt` (Pillow agregado)

**Correcciones post-review:**
- Codigos de error: `IMAGE_TOO_LARGE` → `UPLOAD_TOO_LARGE`, `IMAGE_MIME_NOT_ALLOWED` → `UPLOAD_TYPE_NOT_SUPPORTED`, `IMAGE_PROCESS_ERROR` → `UPLOAD_CORRUPT`
- RGBA aplanado a RGB sobre fondo blanco (`Image.new("RGB")` + `paste` con mask)
- Segmento `chat/` agregado al path en disco y a la URL publica
- Response shape corregida a `{ "message_id", "attachment": { url, width, height, size_bytes } }`

---

## 2026-06-08 — f07 backend Polish — APPROVED

**Scope:** backend solamente
**Archivos creados:** `app/core/logging_config.py`, `app/core/request_logger.py`
**Archivos modificados:** `app/config.py`, `app/main.py`, `app/sockets/events.py`, `.env`, `.env.example`

**Implementado:**
- `SOCKET_MSG_RATE_MAX` y `SOCKET_MSG_RATE_WINDOW` en `config.py` + `.env` / `.env.example`
- `events.py` usa `settings.SOCKET_MSG_RATE_MAX/WINDOW` en lugar de valores hardcodeados
- `logging_config.py`: `setup_logging(level)` configura root logger con formato estructurado `timestamp | level | name | message`
- `request_logger.py`: middleware `RequestLoggerMiddleware` que loguea cada HTTP request con `method`, `path`, `status`, `duration_ms`, `user` (extraido del JWT si presente)
- `main.py`: llama `setup_logging(settings.LOG_LEVEL)` al arrancar + agrega `RequestLoggerMiddleware`
- `events.py`: logging estructurado agregado a `room:join`, `room:leave`, `message:send`, `direct:open`
- `python -c "from app.main import socket_app; print('OK')"` pasa sin errores

**Notas:**
- `LOG_LEVEL` configurable via `.env` (default: INFO)
- uvicorn.access, socketio y engineio silenciados para reducir ruido en logs


**Archivos creados:** `app/api/v1/projects.py`
**Archivos modificados:** `app/api/v1/router.py`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Implementado:**
- `GET /projects/me`: admin-only, retorna todos los campos del proyecto incluyendo api_key
- `PATCH /projects/me`: merge de settings (no reemplaza), actualiza name y/o settings
- `POST /projects/me/rotate-key`: genera nuevo `sproj_{uuid4().hex}`, invalida namespace viejo en Socket.IO
- `_row_to_project`: deserializa `settings` JSON a dict, convierte `is_active` a bool
- Proteccion SQL: SET clause construida con claves literales del codigo, valores siempre con `?`

---

## 2026-06-09 - F00 frontend Foundation - APPROVED

**Scope:** frontend solamente
**Archivos creados:**
- `frontend/package.json` - root monorepo
- `frontend/packages/suportum-chat/package.json` (version 0.1.0, publishConfig, files con README.md), `tsconfig.json`, `tsup.config.ts`
- `frontend/apps/demo/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/demo.css`
- `frontend/apps/demo/public/azanolabs-logo.png` (copiado desde azanolabs-web, ignorado en git)
- `frontend/packages/suportum-chat/src/atoms/Button.tsx`, `Input.tsx`, `Badge.tsx`, `Avatar.tsx`, `Spinner.tsx`
- `frontend/packages/suportum-chat/src/providers/ThemeProvider.tsx`
- `frontend/packages/suportum-chat/src/templates/FloatingWidget.tsx` (placeholder, implementacion completa en F01)

**Correcciones aplicadas:**
- `tsup.config.ts`: `injectStyle: true`, `minify: true`, `treeshake: true`, `sourcemap: false` (bundle JS lleva CSS embebido, cero imports extra para el usuario)
- `package.json`: version `0.1.0`, description, script `dev: tsup --watch`, `publishConfig`, `files: [dist, README.md]`
- `App.tsx`: demo page completa - fondo navy `#041528` + grid CSS, logo AzanoLabs centrado, efecto neon glow 4 capas, animacion `neonFlicker`
- `demo.css`: CSS puro, sin Tailwind, responsive (160px / 200px / 280px), `100dvh` + fallback `100vh`
- Avatar.tsx: fallback Lucide `<User />` cuando username vacio, no caracter `?`
- Guiones largos (U+2014) reemplazados por guion simple en todos los archivos .ts/.tsx

**Resultado verificacion:**
- `pnpm --filter suportum-chat typecheck`: exit 0
- `pnpm --filter suportum-chat build`: exit 0 (ESM 10.80KB, CJS 10.87KB, DTS 1.11KB) con injectStyle
- `pnpm --filter demo dev`: Vite listo en 336ms en localhost:5173

**Notas:**
- ThemeProvider aplica clase en wrapper div (NO en document.documentElement) - correcto para widget embebible
- TypeScript 6.0.3 con ignoreDeprecations en tsconfig para DTS build
- Logo en apps/demo/public/ esta en .gitignore - cada dev lo copia desde su proyecto


---

## 2026-06-09 - F01 frontend Foundation - APPROVED

**Scope:** frontend solamente
**Archivos creados:**
- `frontend/package.json` - root monorepo
- `frontend/packages/suportum-chat/package.json`, `tsconfig.json`, `tsup.config.ts`
- `frontend/apps/demo/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- `frontend/packages/suportum-chat/src/atoms/Button.tsx`, `Input.tsx`, `Badge.tsx`, `Avatar.tsx`, `Spinner.tsx`
- `frontend/packages/suportum-chat/src/providers/ThemeProvider.tsx`
- `frontend/packages/suportum-chat/src/templates/FloatingWidget.tsx` (placeholder, implementacion completa en F02)
- `frontend/packages/suportum-chat/src/vite-env.d.ts`

**Archivos modificados:**
- `src/atoms/index.ts`, `templates/index.ts`, `src/index.ts` - exports activados
- `src/i18n/en.ts` + `es.ts` - `users.profile` (string) renombrado a `users.profileMenu` para eliminar clave duplicada (TS1117)
- `src/i18n/index.ts` renombrado a `index.tsx` (JSX requiere .tsx)
- `src/lib/socket.ts` - guion largo reemplazado por guion simple en comentario
- `.claude/CHECKPOINTS.md` - ThemeProvider: especificacion corregida de `<html>` a `<div>` wrapper

**Correcciones post-review (primera ronda REJECTED):**
- `Avatar.tsx`: fallback de `'?'` reemplazado por `<User />` de lucide-react
- Todos los guiones largos (U+2014) en archivos .ts/.tsx reemplazados por guion simple

**Resultado verificacion:**
- `pnpm --filter suportum-chat typecheck`: exit 0
- `pnpm --filter suportum-chat build`: exit 0 (ESM 14.52KB, CJS 15.75KB, DTS 1.11KB)

**Notas:**
- ThemeProvider aplica clase `theme-<nombre>` en wrapper `<div>` (NO en `<html>`) - correcto para widget embebible en paginas de terceros
- TypeScript 6.0.3 instalado (latest). Requiere `ignoreDeprecations: "6.0"` en tsconfig para build DTS de tsup
- `users.profileMenu` es la clave correcta para el label del menu de perfil (no `users.profile`)

---

## 2026-06-09 - F01 frontend Auth Widget - APPROVED

**Scope:** frontend solamente
**Archivos creados:**
- `src/store/widgetStore.ts` - Zustand store: isOpen, isExpanded, open/close/expand/collapse
- `src/hooks/useAutoRefreshOnMount.ts` - restaura sesion via cookie HttpOnly al montar
- `src/hooks/useSessionVerifier.ts` - verifica token via /auth/me reactivamente
- `src/molecules/FormField.tsx` - label + Input + mensaje de error
- `src/molecules/StepIndicator.tsx` - puntos de progreso + "1 / 3"
- `src/molecules/ForbiddenPlaceholder.tsx` - ShieldOff + i18n
- `src/molecules/ErrorPlaceholder.tsx` - AlertCircle + codigo de error localizado
- `src/organisms/LoginView.tsx` - formulario login con banner de error
- `src/organisms/SetupWizard.tsx` - wizard 3 pasos (proyecto, admin, api_key copiable)
- `src/organisms/LoadingScreen.tsx` - spinner centrado con label
- `src/templates/ChatButton.tsx` - boton flotante fixed, MessageCircle, posicion configurable
- `src/templates/WidgetShell.tsx` - routing por rol: setup/login/loading/client/agent/admin
- `src/templates/FloatingWidget.tsx` - implementacion real (reemplaza placeholder de F00)

**Archivos modificados:**
- `src/atoms/Spinner.tsx` - prop label agregada para aria-label accesible
- `src/i18n/en.ts` + `es.ts` - 13 claves nuevas (auth.*, setup.*, widget.*, errors.*)
- `src/molecules/index.ts`, `organisms/index.ts`, `templates/index.ts` - exports actualizados
- `src/styles/globals.css` - clase .widget-full-height con 100dvh + fallback 100vh

**Correcciones post-review (primera ronda REJECTED):**
- `molecules/ErrorPlaceholder.tsx:12` - guion largo reemplazado por guion simple en comentario

**Resultado verificacion:**
- `pnpm --filter suportum-chat typecheck`: exit 0
- `pnpm --filter suportum-chat build`: exit 0 (CJS 24.53KB, ESM 23.52KB, DTS 1.18KB)

**Notas de seguridad verificadas:**
- Access token solo en Zustand, nunca en localStorage
- isVerified=false hasta /auth/me exitoso - UI protegida no flashea
- clearSession() en 401/403 de /auth/me
- api_key del Setup Wizard se pasa via callback, nunca por URL

---

## 2026-06-09 - F02 frontend Chat Core - APPROVED

**Scope:** frontend solamente
**Archivos creados (13):**
- `store/chatStore.ts` - mensajes por room, typing por room, sin duplicados por id
- `hooks/useSocket.ts` - socket singleton via getSocket, disconnectSocket en cleanup
- `hooks/useChat.ts` - join/leave room, suscripciones con cleanup riguroso, typing debounce 1500ms
- `hooks/useChatRooms.ts` - suscripcion basica a room:opened
- `molecules/MessageBubble.tsx` - burbuja con alineacion por isOwn, texto plano, ImageAttachment opcional
- `molecules/TypingIndicator.tsx` - 3 puntos animate-bounce escalonados, texto via i18n
- `molecules/MessageInput.tsx` - textarea text-base, preview imagen, spinner upload, Enter-to-send desktop
- `molecules/ImageAttachment.tsx` - img con lightbox overlay
- `molecules/DateDivider.tsx` - Hoy/Ayer/DD-MM-YYYY con lineas horizontales
- `organisms/ChatHeader.tsx` - 48px, ChevronLeft opcional, X de cierre
- `organisms/MessageList.tsx` - grupos por fecha, scroll to bottom, .message-list CSS
- `organisms/ChatPanel.tsx` - composicion ChatHeader + MessageList + MessageInput
- `templates/ClientView.tsx` - ChatPanel conectado a room 'general'

**Archivos modificados:**
- `templates/WidgetShell.tsx` - placeholder client reemplazado por ClientView real
- `molecules/index.ts`, `organisms/index.ts`, `templates/index.ts` - exports
- `i18n/en.ts` + `es.ts` - 5 claves nuevas (chat.typingOne, typingMany, today, yesterday, generalRoom)
- `styles/globals.css` - .message-list con -webkit-overflow-scrolling: touch

**Resultado verificacion:** typecheck exit 0, build exit 0 (ESM ~34KB)

**Notas:**
- Cleanup socket usa referencias nombradas a handlers (no socket.off generico) - evita remover listeners ajenos
- addMessage verifica duplicados por msg.id antes de agregar al store
- sendImage usa solo Authorization header; backend emite message:new via socket (no agregar localmente)

---

## 2026-06-09 — f04 frontend Orders Board — APPROVED

**Archivos creados:** `store/orderStore.ts`, `store/boardStore.ts`, `hooks/useOrders.ts`, `molecules/OrderStatusBadge.tsx`, `molecules/OrderCard.tsx`, `organisms/OrdersColumn.tsx`, `organisms/OrdersBoard.tsx`, `organisms/OrderDetail.tsx`, `organisms/OrderCreateForm.tsx`, `organisms/ClientOrders.tsx`
**Archivos modificados:** `molecules/index.ts`, `organisms/index.ts`, `templates/AgentView.tsx`, `templates/AdminView.tsx`, `templates/ClientView.tsx`

**Correcciones post-review:**
- `OrderCard`: inlinado el badge de status con `_STATUS_COLOR` map, eliminado import de `OrderStatusBadge` (molecule no debe importar molecule)

**Implementado:**
- Kanban 5 columnas (pending/active/taken/completed/cancelled) para agent/admin
- Expand/collapse a fullscreen via `boardStore` (`fixed inset-0 z-50`)
- iOS: `WebkitOverflowScrolling: touch` + `scrollSnapType: x mandatory` en columnas
- `ClientOrders`: lista vertical con modal `OrderCreateForm`
- Socket `order:updated` actualiza board en tiempo real via `useOrders`
- `AgentView`, `AdminView`, `ClientView` con tercer tab Orders

---

## 2026-06-09 — f07 frontend Polish & Mobile UX — APPROVED

**Archivos creados:** `hooks/useVirtualKeyboard.ts`, `hooks/useSwipeDown.ts`, `CHANGELOG.md`
**Archivos modificados:** `templates/ChatButton.tsx`, `molecules/ImageAttachment.tsx`, `styles/globals.css`, `templates/FloatingWidget.tsx`, `organisms/ChatPanel.tsx`, `molecules/MessageBubble.tsx`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Corregidos (bugs pre-existentes descubiertos en auditoria):**
- `ChatButton.tsx`: `color="white"` en prop Lucide reemplazado por `className="text-[--color-text-on-accent]"` (R_CSS)
- `ImageAttachment.tsx`: `bg-black/80` en lightbox overlay reemplazado por `bg-[--color-overlay-heavy]` (R_CSS)

**Implementado:**
- `@keyframes widget-open` + `.widget-enter` en `globals.css` (fade-in + slide-up 200ms)
- `FloatingWidget.tsx`: clase `widget-enter` aplicada al panel con guard `prefersReducedMotion`; swipe-down > 80px cierra el widget via `useSwipeDown`
- `ChatPanel.tsx`: `useVirtualKeyboard()` hace scroll al input activo cuando el teclado virtual redimensiona el viewport
- `MessageBubble.tsx`: envuelto en `React.memo` para evitar re-renders innecesarios
- `CHANGELOG.md`: creado con entrada v0.1.0

**Verificacion final:**
- `pnpm typecheck`: exit 0
- `pnpm build`: exit 0 (ESM 94.01KB, CJS 100.28KB, sin .css suelto en dist/)

---

## 2026-06-09 — f06 frontend Themes — APPROVED

**Archivos creados:** `molecules/ThemeCard.tsx`, `hooks/useProjectSettings.ts`, `organisms/AdminSettings.tsx`
**Archivos modificados:** `styles/globals.css` (@import light-clean.css), `molecules/index.ts`, `organisms/index.ts`, `templates/AdminView.tsx` (5to tab settings), `i18n/en.ts`, `i18n/es.ts`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Implementado:**
- `ThemeCard`: molecula de preview visual con hex hardcodeados en THEME_PREVIEWS (excepcion deliberada a R_CSS para representacion visual)
- `useProjectSettings`: hook que consume `GET /api/v1/projects/me`, `PATCH /api/v1/projects/me`, `POST /api/v1/projects/me/rotate-key`; aplica tema via `setTheme()` al montar
- `AdminSettings`: formulario de configuracion de proyecto (nombre, tema, posicion, label); selector de temas via ThemeCard con preview en vivo; seccion API key con copy y rotate con confirmacion
- `AdminView`: 5to tab "Settings" + `<AdminSettings>` como contenido
- `globals.css`: `@import './themes/light-clean.css'` agregado (fix: light-clean era huerfano sin este import)
- `settings.tab` / `settings.themes.*` / `settings.positions.*` agregados a en.ts y es.ts

**Notas:**
- live theme preview: `handleThemeSelect` aplica `applyTheme()` inmediatamente; solo persiste al backend en form submit
- `initialized` flag en AdminSettings: hidrata el form desde `project` solo una vez, evita reset en re-renders

---

## 2026-06-09 — Gaps audit frontend (post f07) — APPROVED

**Scope:** frontend solamente — 5 gaps identificados en audit completo post f07
**Archivos creados:** `organisms/DirectChatList.tsx`
**Archivos modificados:** `organisms/index.ts`, `templates/FloatingWidget.tsx`, `templates/WidgetShell.tsx`, `organisms/UserDetail.tsx`, `templates/AgentView.tsx`, `templates/AdminView.tsx`, `i18n/en.ts`, `i18n/es.ts`, `apps/demo/src/App.tsx`

**Aprobado en primera ronda.** Sin correcciones necesarias.

**Implementado:**
- `DirectChatList`: organism que filtra rooms con `id.startsWith('direct:')` de `useChatRooms`; estado vacío con MessageCircle; click → callback `onSelectRoom`
- `FloatingWidget`: split outer (`SuportumChat`) / inner (`SuportumChatInner`); outer wraps `I18nProvider` + `ThemeProvider` internamente; props nuevos: `theme`, `locale`, `userToken`, `onSetupComplete`
- `userToken` pre-auth: `useEffect` en mount llama `setSession(userToken, null, '', '')` si no hay token activo; `useSessionVerifier` resuelve rol/userId via `/auth/me`
- `WidgetShell`: prop `onSetupComplete` pipe-through hasta `handleSetupComplete`
- `UserDetail`: prop `onStartDirectChat`; botón "Iniciar chat directo" (solo si `canManage && onStartDirectChat`); roomId = `direct:{sorted[0]}:{sorted[1]}`
- `AgentView` + `AdminView`: tab 'direct' con `DirectChatList` y navegación a `ChatPanel` con back chevron; AdminView pasa `onStartDirectChat` a UserDetail que navega al room directo
- `i18n`: claves `chat.noDirectRooms`, `chat.startDirect` en en.ts y es.ts
- `demo/App.tsx`: removidos wrappers externos `ThemeProvider` e `I18nProvider`

**Resultado verificación:**
- `pnpm --filter suportum-chat typecheck`: exit 0
- `pnpm --filter suportum-chat build`: exit 0

**Observación del reviewer (no bloqueante):**
- `useChatRooms` solo acumula rooms via evento socket `room:opened`; la lista de direct chats estará vacía en primer render frío hasta que llegue el evento del backend

---

## 2026-06-09 — f05 frontend User Management — APPROVED

**Archivos creados:** `store/userStore.ts`, `hooks/useUsers.ts`, `molecules/RoleBadge.tsx`, `molecules/UserActions.tsx`, `molecules/UserRow.tsx`, `organisms/AdminUsers.tsx`, `organisms/UserCreateForm.tsx`, `organisms/UserEditForm.tsx`, `organisms/UserDetail.tsx`, `organisms/ProfilePanel.tsx`
**Archivos modificados:** `molecules/index.ts`, `organisms/index.ts`, `templates/AdminView.tsx`, `templates/AgentView.tsx`, `templates/ClientView.tsx`, `i18n/en.ts`, `i18n/es.ts`, `styles/globals.css`, `lib/api.ts`

**Correcciones post-review:**
- R_CSS: `text-white`, `bg-black/40`, `bg-white` reemplazados por CSS vars; tokens `--color-text-on-accent`, `--color-toggle-knob`, `--color-overlay` agregados a `globals.css`
- R_I18N: `'All'`, `'Email'`, `'Created'` hardcodeados reemplazados; claves `common.all`, `common.createdAt` agregadas a en.ts y es.ts
- `lib/api.ts`: fix para respuestas 204 (DELETE users): guard antes de `response.json()` evita SyntaxError en body vacio

**Implementado:**
- `AdminUsers`: lista con filtros de rol + estado, botones crear/editar/desactivar (admin only, anti-lockout)
- `UserCreateForm`: email + username + password + rol; manejo de `EMAIL_TAKEN` y `USERNAME_TAKEN`
- `UserEditForm`: cambio de rol y estado; guard `user.id === userId` retorna null (anti-lockout)
- `UserDetail`: vista de detalle del usuario; botones edit/deactivate solo para non-self
- `ProfilePanel`: cambio de username y password (sin selector de rol); iOS-safe con text-base
- `AdminView`: 4to tab "Users" + routing a UserDetail via `selectedUser`
- `AgentView` y `ClientView`: 4to tab "Profile" + ProfilePanel

---

## 2026-09-26 — Reorganizacion de features + b08/b09/f08/f09 — APPROVED (las 4)

**Contexto de la sesion:** arranco como debugging de un bug de produccion (DB/uploads
guardados en `tempfile.gettempdir()`, que en el VPS Linux resuelve a `/tmp` y se
puede borrar en cualquier reboot). Al arreglarlo, se detecto un segundo bug real:
`WidgetShell.tsx` decidia mostrar Setup Wizard vs Login mirando solo si `apiKey` no
estaba vacio, sin validar nada contra el backend, lo cual permitia que una key de
otro ambiente pasara como valida. Al planificar el fix como feature nueva, se
detecto ademas que `features/f08-project-branding.md` vivia en la raiz del repo
como spec full-stack unico (backend+frontend mezclados), inconsistente con el
resto de features (separadas por proyecto en `backend/features/` y
`frontend/features/`).

**Reorganizacion de specs (sin cambios de codigo):**
- `features/f08-project-branding.md` (raiz) dividido en `backend/features/08-feature-project-branding.md`
  (b08) y `frontend/features/08-feature-project-branding.md` (f08). La raiz `features/`
  ahora solo tiene el plan maestro (`fundation-suportum-plan.md`).
- Nueva feature de validacion creada ya separada desde el inicio:
  `backend/features/09-feature-apikey-domain-validation.md` (b09) y
  `frontend/features/09-feature-apikey-domain-validation.md` (f09).
- `.claude/CHECKPOINTS.md` actualizado con checkpoints especificos de F08 y F09, mas
  un checkpoint global nuevo (Python 3.9 en VPS: `Optional[X]`, nunca `X | None`).

**b08 — Project Branding (backend) — APPROVED:**
Ya estaba completamente implementado desde el commit foundation. Unico cambio: fix
de un em dash preexistente en `app/core/upload.py`.

**b09 — Validacion API Key + Dominio (backend) — APPROVED:**
**Archivos creados:** `backend/migrations/002_add_project_domain.sql`, `backend/app/core/domain.py`,
`backend/tests/test_project_verify.py`
**Archivos modificados:** `backend/app/database.py` (`run_migrations()` generalizado para
correr todos los `migrations/*.sql`, con manejo acotado de `OperationalError` porque
`ALTER TABLE ADD COLUMN` no es idempotente en SQLite), `backend/app/models/setup.py`
(`ProjectVerifyResponse`), `backend/app/api/v1/projects.py` (`GET /projects/verify`,
publico, rate limit 30/60s por IP), `backend/app/api/v1/setup.py` (bind de `domain`
al crear el proyecto).
Decisiones clave: fail closed (sin Origin/Referer resoluble → `domain_mismatch`,
nunca `ready`), sin bypass de localhost/dev (decision explicita del usuario), dominio
comparado solo por hostname (sin protocolo/puerto).

**f08 — Project Branding (frontend) — APPROVED (ronda 2, rechazado en ronda 1):**
Ya estaba casi completo desde una sesion anterior. Ronda 1 rechazada por 3 issues:
(1) logo default era un PNG de marca real en base64 (106 KB, triplicaba el bundle a
310 KB) en vez del SVG inline que pedia el spec, (2) boton "Quitar logo" con touch
target menor a 44px, (3) `useProjectBranding.ts` reimplementaba `fetch()` a mano en
vez de usar `apiClient` (sin interceptor de refresh/401).
**Decision del usuario:** usar el SVG placeholder generico en vez del PNG de marca
real, priorizando bundle liviano sobre fidelidad de marca.
Ronda 2: `atoms/AzanoLogo.tsx` reescrito como `<svg>` JSX inline; `.setup-logo-remove`
con `min-height/width: 44px`; `lib/api.ts` `request()` extendido para detectar
`FormData` y omitir `Content-Type` sin perder el interceptor de 401; se agrego
`apiClient.postForm()`; `useProjectBranding.ts` reescrito para usarlo. Bundle bajo de
310 KB a 206 KB ESM.

**f09 — Validacion API Key + Dominio (frontend) — APPROVED:**
**Archivos creados:** `molecules/ProjectNotFoundPlaceholder.tsx` (icono `PackageSearch`,
sin boton de reset), `molecules/DomainBlockedPlaceholder.tsx` (icono `ShieldAlert`,
copy "Houston, tenemos un problema... Los datos se ven raros.")
**Archivos modificados:** `lib/api.ts` (`verifyProject()`, nunca lanza), `templates/WidgetShell.tsx`
(`ShellStatus` extendido a 6 valores: `checking|setup|ready|not_found|blocked|error`;
el 6to no estaba en la tabla resumen del spec original pero si en su seccion 6),
`i18n/en.ts` y `es.ts`.
**Regla de negocio critica implementada:** cuando `verify` devuelve `not_found`, el
widget NO auto-redirige a Setup Wizard ni llama `onProjectReset()` — requiere
correccion manual de la key por parte de quien integro el widget. Error de red del
propio `verify` usa `ErrorPlaceholder` generico (`errors.NETWORK_ERROR`, reusada de
`LoginView.tsx`), nunca se confunde con `not_found` ni `blocked`.

**Deuda tecnica senalada (no resuelta esta sesion, fuera de scope):**
- Em dashes preexistentes en `backend/app/guide_ai.py`, `backend/app/services/email.py`,
  `backend/app/api/v1/users.py` (del commit foundation, no relacionados a b08/b09).
- `SetupWizard.tsx` no renderiza `<ProjectLogo>` en su propio header (el spec original
  de f08 lo mencionaba como uno de los 3 lugares, pero el contrato detallado y los
  criterios de aprobacion solo pedian el uploader del paso 1).

