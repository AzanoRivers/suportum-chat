# 02 — Chat Core Frontend

## 1. Objetivo
Implementar el panel de chat en tiempo real: mensajes, typing indicators, rooms (general y directo),
upload de imágenes, e integración con Socket.IO. Todos los roles usan el mismo ChatPanel base,
con diferencias de funcionalidad por rol.

## 2. Componentes a Implementar

### Atoms (nuevos)
- Ninguno nuevo — usar los de F00

### Molecules
- `MessageBubble` — burbuja con avatar, username, contenido, timestamp, imagen opcional
- `TypingIndicator` — animación 3 puntos con username "está escribiendo..."
- `MessageInput` — textarea expandible + botón enviar + botón adjuntar imagen
- `ImageAttachment` — imagen con lightbox al click
- `DateDivider` — separador de fecha entre grupos de mensajes

### Organisms
- `ChatHeader` — header del panel: room name + info + cerrar
- `MessageList` — lista scrollable de mensajes con scroll-to-bottom automático
- `ChatPanel` — composición: ChatHeader + MessageList + MessageInput
- `DirectChatList` — lista de chats directos activos (para agent/admin)

### Templates (extensión del shell)
- `ClientView` — ChatPanel general + lista de tickets propios + lista de órdenes propias
- (AgentView y AdminView se implementan en features posteriores)

## 3. Hooks

### `hooks/useSocket.ts`
```ts
export function useSocket(apiKey: string): Socket | null
// Retorna el socket singleton conectado al namespace /{apiKey}
// Toma token del authStore automáticamente
// Maneja connect_error con limpieza de sesión si es auth error
```

### `hooks/useChat.ts`
```ts
export function useChat(roomId: string, apiKey: string) {
  // Hace room:join al montar, room:leave al desmontar
  // Suscribe a "message:new" y "typing"
  // Retorna: { messages, typingUsers, sendMessage, sendImage, isConnected }
}
```

### `hooks/useChatRooms.ts`
```ts
export function useChatRooms(apiKey: string) {
  // Para agents: obtiene lista de rooms/conversaciones activas
  // Suscribe a "room:opened" para rooms nuevos en tiempo real
}
```

## 4. Store

### `store/chatStore.ts`
```ts
interface ChatState {
  messagesByRoom: Record<string, Message[]>
  typingByRoom: Record<string, string[]>  // usernames escribiendo
  addMessage: (roomId: string, msg: Message) => void
  setHistory: (roomId: string, msgs: Message[]) => void
  setTyping: (roomId: string, username: string, active: boolean) => void
}
```

## 5. UI/UX — Chat Panel

### Maquetación Desktop
```
┌───────────────────────────────┐
│ # general                [⟵] │  ← ChatHeader 48px
├───────────────────────────────┤
│                                │
│  [Ava]  andres                 │  ← MessageBubble recibido (izquierda)
│         Hola, necesito ayuda   │
│         14:32                  │
│                                │
│           Hola! En qué puedo   │  ← MessageBubble propio (derecha)
│           ayudarte?  [Ava]    │
│           14:33                │
│                                │
│  andres está escribiendo...    │  ← TypingIndicator
├───────────────────────────────┤
│ [📎] [Escribe un mensaje...] [→] │  ← MessageInput 56px
└───────────────────────────────┘
```

### MessageBubble — Colores
- Mensaje propio: `bg-accent-dim border border-accent/20` alineado a la derecha
- Mensaje ajeno: `bg-bg-elevated border border-border-default` alineado a la izquierda
- Timestamp: `text-text-muted text-xs font-mono`
- Username: `text-text-secondary text-xs`

### TypingIndicator
```tsx
// Animación CSS: 3 puntos con delay escalonado
<div className="flex gap-1">
  {[0,1,2].map(i => (
    <span
      key={i}
      className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
      style={{ animationDelay: `${i * 150}ms` }}
    />
  ))}
  <span className="text-text-muted text-xs ml-1">{username} está escribiendo...</span>
</div>
```

### MessageInput
- `<textarea>` auto-expandible (max 4 líneas)
- `text-base` obligatorio en iOS
- Botón adjuntar: `<input type="file" accept="image/*" hidden>` + trigger con botón
- Envío con Enter (no Shift+Enter)
- En mobile: Enter en teclado no envía (usar botón)

## 6. Imagen Upload desde el Frontend

```ts
// hooks/useChat.ts — sendImage
async function sendImage(roomId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/api/v1/upload/${roomId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  })
  // El backend emite message:new via Socket.IO — no añadir el mensaje localmente
  // Solo manejar errores de upload aquí
}
```

### Previsualización antes de enviar
```tsx
// Al seleccionar imagen: mostrar thumbnail 64x64 sobre el input
// Con botón × para cancelar
// Al confirmar envío: mostrar spinner de carga en lugar del thumbnail
```

## 7. Socket.IO — Suscripciones en useChat

```ts
useEffect(() => {
  if (!socket) return
  socket.emit('room:join', { room_id: roomId })

  socket.on('message:new', (msg) => {
    if (msg.room_id === roomId) chatStore.addMessage(roomId, msg)
    scrollToBottom()
  })

  socket.on('message:history', ({ room_id, messages }) => {
    if (room_id === roomId) chatStore.setHistory(roomId, messages)
  })

  socket.on('typing', ({ room_id, username, active }) => {
    if (room_id === roomId) chatStore.setTyping(roomId, username, active)
  })

  return () => {
    socket.emit('room:leave', { room_id: roomId })
    socket.off('message:new')
    socket.off('message:history')
    socket.off('typing')
  }
}, [socket, roomId])
```

## 8. Scroll to Bottom

```tsx
const bottomRef = useRef<HTMLDivElement>(null)
const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

// Auto-scroll al recibir mensaje nuevo
useEffect(() => { scrollToBottom() }, [messages])
```

## 9. Typing Debounce

```ts
// Enviar typing:start al usuario empieza a escribir
// Enviar typing:stop 1500ms después del último keystroke
const typingTimeout = useRef<NodeJS.Timeout>()

function onInputChange(value: string) {
  socket.emit('typing:start', { room_id: roomId })
  clearTimeout(typingTimeout.current)
  typingTimeout.current = setTimeout(() => {
    socket.emit('typing:stop', { room_id: roomId })
  }, 1500)
}
```

## 10. iOS Safari — Reglas

- `textarea`: `text-base` (16px), sin resize manual (css `resize: none`)
- Chat container scroll: `overflow-y: auto` con `-webkit-overflow-scrolling: touch`
- Teclado virtual en iOS empuja el viewport → usar `dvh` para la altura
- Imagen adjunta: `max-w-[240px] max-h-[200px] object-cover`

```css
/* Scroll suave en iOS */
.message-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

## 11. Desarrollo — Pasos

1. Implementar `store/chatStore.ts`
2. Implementar `hooks/useSocket.ts`
3. Implementar `hooks/useChat.ts`
4. Implementar molecules: `MessageBubble`, `TypingIndicator`, `MessageInput`, `ImageAttachment`, `DateDivider`
5. Implementar organisms: `ChatHeader`, `MessageList`, `ChatPanel`
6. Integrar `ChatPanel` en `templates/ClientView`
7. Probar en demo: 2 pestañas del navegador → mensajes en tiempo real
8. Probar upload de imagen → thumbnail llega a ambas pestañas
9. Verificar typing indicator entre las 2 pestañas

## 12. Auditoría

### 12.1 Checklist de Seguridad
- [ ] `sendMessage` no llama directamente al socket — va por `useChat.sendMessage`
- [ ] Contenido del mensaje renderizado como texto plano (no `dangerouslySetInnerHTML`)
- [ ] Token no expuesto en URLs ni logs del navegador
- [ ] Cleanup de socket listeners en `useEffect` return

### 12.2 Checklist iOS Safari
- [ ] `textarea`: `text-base`
- [ ] `-webkit-overflow-scrolling: touch` en scroll containers
- [ ] Altura del panel: `dvh` con fallback `vh`
- [ ] Imágenes: `max-w-[240px]` para que no rompan el layout en mobile

### 12.3 Checklist de Funcionalidad
- [ ] Historial de 50 mensajes carga al hacer join al room
- [ ] Nuevo mensaje aparece sin recargar en ambas pestañas
- [ ] Typing indicator: aparece al escribir, desaparece 1.5s después de parar
- [ ] Scroll auto al fondo al recibir mensaje nuevo
- [ ] Upload imagen: previsualización → spinner → thumbnail en chat
- [ ] Disconnect → reconnect → historial se recarga

### 12.4 Errores Comunes
- Listeners duplicados: verificar que el cleanup en useEffect remove todos los listeners
- Mensajes duplicados: si `message:new` llega 2 veces → revisar doble suscripción
- Typing sin cleanup: al cerrar el widget sin `room:leave` → typing queda activo

## 13. Criterios de Aprobación (Done)
- [ ] 2 usuarios en el mismo room se reciben mensajes en tiempo real
- [ ] Typing indicator funciona y se limpia automáticamente
- [ ] Historial carga al entrar al room
- [ ] Upload de imagen funciona: aparece en el chat de ambos usuarios
- [ ] Contenido de mensajes es texto plano (sin XSS posible)
- [ ] Reviewer confirma APPROVED
