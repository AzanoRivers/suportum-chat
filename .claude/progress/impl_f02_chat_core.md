# F02 Chat Core Frontend - Implementation Report

## Estado: DONE

## Resultados de verificacion

- `pnpm --filter suportum-chat typecheck`: exit 0, sin errores
- `pnpm --filter suportum-chat build`: exit 0, CJS + ESM + DTS generados (34-35 KB)

## Archivos creados

### Stores
- `src/store/chatStore.ts` - Zustand store con Message, messagesByRoom, typingByRoom. addMessage verifica duplicados por id. clearRoom usa delete sobre copia del objeto (evita variables _ no usadas).

### Hooks
- `src/hooks/useSocket.ts` - Obtiene token de authStore, llama getSocket si hay token, disconnectSocket en cleanup de useEffect al cambiar token o desmontar.
- `src/hooks/useChat.ts` - Join/leave room, suscripcion a message:new / message:history / typing con cleanup riguroso via socket.off por referencia. Typing debounce 1500ms. sendImage hace POST con Bearer token. Retorna handleTyping ademas de lo especificado en el spec (necesario para ChatPanel).
- `src/hooks/useChatRooms.ts` - Suscripcion basica a room:opened, retorna lista de rooms.

### Molecules
- `src/molecules/ImageAttachment.tsx` - img con lightbox overlay. Click fuera cierra, click en imagen hace stopPropagation. loading="lazy", alt vacio.
- `src/molecules/TypingIndicator.tsx` - 3 puntos animate-bounce con animationDelay escalonado (0/150/300ms). Texto interpolado con replace('{username}', ...).
- `src/molecules/MessageBubble.tsx` - Alineacion por isOwn, Avatar, contenido como texto plano (whitespace-pre-wrap break-words), timestamp HH:MM via toLocaleTimeString, ImageAttachment opcional.
- `src/molecules/MessageInput.tsx` - textarea text-base, resize:none, auto-expand hasta 96px. Preview imagen 64x64 con boton X. Spinner durante upload. Enter-to-send en desktop (navigator.maxTouchPoints > 0 para deteccion mobile). onSendImage tipado como Promise<void> para poder await y mostrar spinner correctamente.
- `src/molecules/DateDivider.tsx` - Compara fechas con isSameDay, muestra Hoy/Ayer/DD/MM/YYYY, lineas border-t a los costados.

### Organisms
- `src/organisms/ChatHeader.tsx` - 48px de alto via style, ChevronLeft opcional, X para cerrar. min-h-11 min-w-11 en botones.
- `src/organisms/MessageList.tsx` - buildList() agrupa mensajes por fecha YYYY-MM-DD para insertar DateDivider. Usa useAuthStore para isOwn. scrollIntoView smooth en cada cambio de messages. Clase message-list del CSS global.
- `src/organisms/ChatPanel.tsx` - Composicion de ChatHeader + MessageList + MessageInput. Pasa isConnected como disabled al input.

### Templates
- `src/templates/ClientView.tsx` - Monta ChatPanel con roomId='general' y roomName desde i18n chat.generalRoom.

## Archivos modificados

- `src/templates/WidgetShell.tsx` - Reemplaza placeholder client con `<ClientView />`. Importa ClientView.
- `src/molecules/index.ts` - Agrega exports: MessageBubble, MessageInput, TypingIndicator, ImageAttachment, DateDivider.
- `src/organisms/index.ts` - Agrega exports: ChatHeader, MessageList, ChatPanel.
- `src/templates/index.ts` - Agrega export: ClientView.
- `src/i18n/en.ts` - Agrega chat.typingOne, chat.typingMany, chat.today, chat.yesterday, chat.generalRoom.
- `src/i18n/es.ts` - Idem en espanol.
- `src/styles/globals.css` - Agrega clase .message-list con overflow-y:auto y -webkit-overflow-scrolling:touch.

## Claves i18n agregadas

| Clave | EN | ES |
|---|---|---|
| chat.typingOne | `{username} is typing...` | `{username} esta escribiendo...` |
| chat.typingMany | `Several users are typing...` | `Varios usuarios escriben...` |
| chat.today | `Today` | `Hoy` |
| chat.yesterday | `Yesterday` | `Ayer` |
| chat.generalRoom | `Support` | `Soporte` |

Nota: chat.placeholder, chat.send, chat.attach ya existian en ambos archivos.

## Decisiones de diseno

1. **onSendImage como Promise<void>**: El spec dice `(file: File) => void` pero para mostrar el Spinner correctamente durante el upload HTTP necesita ser awaitable. Se cambio a `Promise<void>` - TypeScript acepta esto y es mas correcto.

2. **handleTyping en retorno de useChat**: El spec lista el retorno como `{ messages, typingUsers, sendMessage, sendImage, isConnected }` pero ChatPanel necesita pasar el typing callback a MessageInput. Se agrego `handleTyping` al retorno.

3. **getSocket en render vs effect**: La funcion getSocket es idempotente (devuelve socket existente si conectado), por lo que llamarla en render es seguro. El cleanup de useEffect en useSocket desconecta al desmontar o cambiar token.

4. **buildList con dateKey YYYY-MM-DD**: Se usa slice(0,10) del ISO string para agrupar por fecha sin depender de timezone del servidor, consistente con lo que el componente DateDivider compara via new Date().

5. **MessageList con WebkitOverflowScrolling via style**: La clase CSS message-list ya aplica -webkit-overflow-scrolling:touch pero se agrega tambien via style inline para garantizar compatibilidad en React (context-iphone-bugs.md).

6. **clearRoom sin variables _**: Se usa delete sobre copia del objeto en lugar de destructuring con _ para evitar advertencias de TypeScript sobre variables no usadas.

7. **Sin em dashes**: Verificado en todos los archivos. Se usan : y , como alternativas.
