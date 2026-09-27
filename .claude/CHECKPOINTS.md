# CHECKPOINTS.md: Criterios de Done por Feature

> Este archivo es la fuente de verdad para el Reviewer.
> Cada feature tiene sus checkpoints específicos + los globales que aplican siempre.

---

## Checkpoints Globales (todas las features)

### Backend
- [ ] No hay `time.sleep()`, solo `await asyncio.sleep()`
- [ ] No hay `import requests`, solo `httpx` o `aiosqlite`
- [ ] Todas las funciones tienen type hints Python
- [ ] Toda dependencia nueva tiene wheel `linux/arm64` en PyPI
- [ ] Nada en `requirements.txt` fue escrito manualmente con versión
- [ ] Type hints estilo Python 3.9: `Optional[X]` / `Union[X, Y]` de `typing`, nunca `X | Y` ni `X | None` (VPS Oracle Cloud corre Python 3.9)

### Frontend
- [ ] No hay `overflow-x: clip` en ningún archivo CSS
- [ ] Todo `backdrop-filter` en CSS tiene `-webkit-backdrop-filter` precedente
- [ ] Todo inline style React con `backdropFilter` tiene `WebkitBackdropFilter`
- [ ] **R4. CERO `style={{ ... }}` con propiedades CSS directas en JSX**, la única excepción
      permitida es CSS custom properties dinámicas con prefijo `--` (ej. `'--tc-bg': color`).
      Verificar con `Select-String -Path "frontend\packages\**\*.tsx" -Pattern "style=\{\{" -Recurse`
      y validar manualmente que cada hit sea solo CSS vars.
- [ ] Inputs con mínimo `text-base` (16px), nunca `text-sm` en `<input>`
- [ ] Elementos full-height usan `100dvh` + fallback `100vh`
- [ ] Átomos no importan de molecules, organisms ni templates
- [ ] Solo Lucide React para iconos
- [ ] `package.json` no contiene versiones escritas manualmente

---

## F01: Foundation

### Backend
- [ ] `app/main.py` exporta `socket_app` (no `app`) para Gunicorn
- [ ] `suportum.service` usa `--timeout 0` y bind `127.0.0.1:8001`
- [ ] `suportum.conf` tiene headers `Upgrade` y `Connection upgrade` para WebSocket
- [ ] `migrations/001_initial.sql` incluye `PRAGMA journal_mode=WAL` y `PRAGMA foreign_keys=ON`
- [ ] Tablas: `users`, `messages`, `tickets`, `orders` con UUID v4 como PK
- [ ] Índices en `messages(room_id, created_at)`, `orders(status)`, `tickets(status, agent_id)`
- [ ] `POST /api/v1/auth/login` devuelve access_token en body + refresh_token en HttpOnly cookie
- [ ] `POST /api/v1/auth/refresh` renueva access_token usando refresh cookie
- [ ] `GET /` responde con name, version, status, uptime
- [ ] Socket.IO `connect` event rechaza con `ConnectionRefusedError` si token inválido o ausente

### Frontend
- [ ] Monorepo `pnpm workspaces` con `packages/suportum-chat` y `apps/demo`
- [ ] `packages/suportum-chat/src/styles/globals.css` tiene `@import "tailwindcss"` y `@theme {}` con todos los tokens del design system Dragon UI
- [ ] `atoms/Button.tsx`: variant (`primary` | `ghost` | `danger`), size, disabled
- [ ] `atoms/Input.tsx`: `text-base` obligatorio, `type="text"` por defecto
- [ ] `atoms/Badge.tsx`: colores por status
- [ ] `atoms/Avatar.tsx`: iniciales del usuario + fallback icon
- [ ] `atoms/Spinner.tsx`: loading indicator
- [ ] `ThemeProvider` aplica clase `theme-<nombre>` en el wrapper `<div>` del widget (NO en `<html>` - es widget embebible en paginas de terceros)
- [ ] `ThemeProvider` carga tema desde `localStorage` key `suportum-theme` sin flash (lazy initializer en useState)
- [ ] `index.ts` exporta `{ SuportumChat }` como export nombrado

---

## F02: Chat Core

### Backend
- [ ] `sio.AsyncServer` con `async_mode="asgi"`, sin `cors_allowed_origins` (CORS en Nginx)
- [ ] Evento `connect`: valida token, guarda `user_id` y `role` en sesión Socket.IO
- [ ] Evento `join_room`: une el socket al room_id especificado
- [ ] Evento `chat_message`: persiste en DB, emite a todos en el room con UUID v4 como id
- [ ] Evento `typing_start` / `typing_stop`: emite al room sin persistir
- [ ] Evento `open_direct`: crea room_id canónico `direct:{min(a,b)}:{max(a,b)}`
- [ ] `GET /api/v1/messages?room_id=<id>&before=<cursor>`: paginación por cursor

### Frontend
- [ ] `organisms/shared/ChatPanel.tsx`: Client Component con `'use client'`
- [ ] `organisms/shared/MessageList.tsx`: scroll automático al último mensaje (iOS: `scrollIntoView` con `behavior: smooth`)
- [ ] `molecules/MessageBubble.tsx`: burbuja izquierda (otros) / derecha (yo)
- [ ] `molecules/MessageInput.tsx`: `<input type="text" className="text-base ...">`
- [ ] `molecules/TypingIndicator.tsx`: "usuario está escribiendo..." con animación
- [ ] `hooks/useSocket.ts`: singleton global, no desconectar en unmount
- [ ] `hooks/useChat.ts`: join_room al montar, leave_room al desmontar

---

## F03: Tickets

### Backend
- [ ] `POST /api/v1/tickets`: crea ticket (client)
- [ ] `GET /api/v1/tickets`: lista filtrada por rol (client: solo los suyos, agent: asignados, admin: todos)
- [ ] `PATCH /api/v1/tickets/{id}`: actualiza status, priority, agent_id (guards por rol)
- [ ] `GET /api/v1/tickets/{id}`: detalle
- [ ] Socket.IO emite `ticket_updated` al room `ticket:{id}` y al room `orders:board`

### Frontend
- [ ] `molecules/TicketRow.tsx`: fila de ticket con StatusBadge y prioridad
- [ ] `organisms/client/ClientTickets.tsx`: lista de tickets del cliente con estados
- [ ] `organisms/agent/AgentTickets.tsx`: lista de tickets asignados al agente con acciones
- [ ] `organisms/admin/AdminTickets.tsx`: todos los tickets con filtros

---

## F04: Orders

### Backend
- [ ] `POST /api/v1/orders`: crea orden (client)
- [ ] `GET /api/v1/orders`: filtrado por rol
- [ ] `PATCH /api/v1/orders/{id}/status`: estado machine: pending→active→taken→completed|cancelled
- [ ] Socket.IO emite `order_updated` a room `orders:board` en cada cambio de estado

### Frontend
- [ ] `molecules/OrderCard.tsx`: tarjeta con status color-coded (tokens de status)
- [ ] `organisms/agent/AgentOrders.tsx`: board kanban: columnas PENDING / ACTIVE / TAKEN / COMPLETED
- [ ] `organisms/client/ClientOrders.tsx`: lista de órdenes del cliente
- [ ] Panel expandible: `templates/FloatingWidget` soporta modo expandido donde el board ocupa el viewport
- [ ] Mobile: columnas del kanban en scroll horizontal dentro de una bottom sheet

---

## F05: Users

### Backend
- [ ] `GET /api/v1/users`: solo admin
- [ ] `POST /api/v1/users`: solo admin (crear agent o admin)
- [ ] `PATCH /api/v1/users/{id}`: solo admin (rol, is_active)
- [ ] `DELETE /api/v1/users/{id}`: solo admin (soft delete: is_active=0)
- [ ] Guards: `Depends(require_role("admin"))` en todos los endpoints de usuarios

### Frontend
- [ ] `molecules/UserRow.tsx`: fila con avatar, username, rol, estado activo
- [ ] `organisms/admin/AdminUsers.tsx`: tabla CRUD con acciones inline

---

## F06: Themes

### Frontend
- [ ] `styles/themes/dark-dragon.css`: todos los tokens de la sección 4.5 del plan maestro
- [ ] `styles/themes/light-clean.css`: override completo de los mismos tokens
- [ ] `ThemeProvider` carga el tema desde `localStorage` en mount sin flash
- [ ] `organisms/admin/AdminSettings.tsx`: incluye `ThemePicker` con preview de colores
- [ ] Cambio de tema es instantáneo (sin recarga de página)

---

## F07: Polish

### Backend
- [ ] Rate limiting por socket: máximo N mensajes por segundo configurable via `.env`
- [ ] Logging estructurado: cada request y evento Socket.IO con timestamp y user_id

### Frontend
- [ ] Swipe down para minimizar el widget en mobile
- [ ] Touch targets mínimo 44×44px en todos los botones (`min-h-11 min-w-11`)
- [ ] Atributos ARIA en todos los controles interactivos
- [ ] `<ChatButton>` tiene `aria-label` configurable
- [ ] Performance: `React.memo` en `MessageBubble` y `OrderCard`

---

## F08: Project Branding (logo del proyecto)

> Spec dividido: `backend/features/08-feature-project-branding.md` (b08) y
> `frontend/features/08-feature-project-branding.md` (f08). No mezclar ambos scopes
> en un mismo PR/sesión de Implementer.

### Backend (b08)
- [ ] `POST /api/v1/projects/me/logo`: solo admin, valida MIME por magic bytes, comprime a WebP, ≤2MB, ≤512x512px
- [ ] `DELETE /api/v1/projects/me/logo`: solo admin, borra archivo y limpia `settings.logo_url`
- [ ] `POST /api/v1/setup` acepta `logo_data` opcional (base64) sin romper el flujo si falla
- [ ] `image/svg+xml` explícitamente rechazado (XSS)
- [ ] IDOR: admin de proyecto A no puede tocar el logo de proyecto B

### Frontend (f08)
- [ ] `atoms/ProjectLogo.tsx` con fallback al logo default (SVG inline)
- [ ] `SetupWizard` paso 1 permite subir logo opcional con preview
- [ ] `LoginView`, `RegisterView`, `LoadingScreen`, `ChatHeader` muestran el logo del proyecto o el default
- [ ] `AdminSettings`: sección "Branding" con subir/eliminar logo
- [ ] Cero `style={{}}` fuera de CSS custom properties (R4)
- [ ] Strings nuevas en `i18n/en.ts` y `i18n/es.ts`

---

## F09: Validación de API Key + Dominio

> Spec dividido: `backend/features/09-feature-apikey-domain-validation.md` (b09) y
> `frontend/features/09-feature-apikey-domain-validation.md` (f09). No mezclar ambos scopes
> en un mismo PR/sesión de Implementer.

### Backend (b09)
- [ ] `run_migrations()` itera todos los `migrations/*.sql` ordenados, no solo `001_initial.sql`
- [ ] `migrations/002_add_project_domain.sql` agrega columna `projects.domain`
- [ ] `GET /api/v1/projects/verify?api_key=...` devuelve `not_found` | `ready` | `domain_mismatch`
- [ ] Dominio extraído de `Origin`/`Referer` con `urlparse().hostname` (nunca comparación cruda del header)
- [ ] Fail closed: sin `Origin`/`Referer` resoluble → `domain_mismatch`, nunca `ready`
- [ ] `POST /api/v1/setup` bindea `domain` al crear el proyecto
- [ ] Sin excepción para localhost/dev, mismo trato de dominio siempre
- [ ] Respuesta de `/projects/verify` no filtra nombre/id del proyecto
- [ ] Rate limiting aplicado (reusar el de F07)

### Frontend (f09)
- [ ] `WidgetShell` llama a `verifyProject()` antes de decidir setup/login cuando hay `apiKey`
- [ ] Estado `not_found`: `ProjectNotFoundPlaceholder` (ícono `PackageSearch`), sin botón de reset, sin auto-limpiar `localStorage`
- [ ] Estado `blocked`: `DomainBlockedPlaceholder` (ícono `ShieldAlert`), copy "Houston, tenemos un problema... Los datos se ven raros."
- [ ] Error de red del propio `verify` usa `ErrorPlaceholder` genérico, nunca se confunde con `not_found`/`blocked`
- [ ] Caso sin `apiKey` sigue mostrando `SetupWizard` sin regresión
- [ ] Strings nuevas en `i18n/en.ts` y `i18n/es.ts`
