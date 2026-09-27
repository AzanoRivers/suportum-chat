---
name: socketio-client
description: >
  Patrones de Socket.IO v4 client para Suportum: conexión tipada con JWT auth,
  reconexión, event subscriptions, y cleanup en React hooks. Usar cuando se
  implementen hooks de Socket.IO o el cliente en lib/socket.ts.
---

# Socket.IO v4 Client — Patterns para Suportum

## Cliente tipado con auth JWT

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types/events'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>
let socket: TypedSocket | null = null

export function getSocket(token: string): TypedSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  } else if (!socket.connected) {
    // Actualizar token en reconexión
    socket.auth = { token }
    socket.connect()
  }
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
```

## Event map tipado

```typescript
// types/events.ts
export interface ServerToClientEvents {
  'message:new': (msg: Message) => void
  'typing:start': (data: { roomId: string; userId: string; username: string }) => void
  'typing:stop':  (data: { roomId: string; userId: string }) => void
  'ticket:update': (ticket: Ticket) => void
  'order:update':  (order: Order) => void
  'user:join':  (data: { roomId: string; userId: string }) => void
  'user:leave': (data: { roomId: string; userId: string }) => void
}

export interface ClientToServerEvents {
  'message:send': (
    data: { roomId: string; content: string },
    ack: (result: { ok: boolean; messageId?: string; error?: string }) => void
  ) => void
  'room:join':    (roomId: string) => void
  'room:leave':   (roomId: string) => void
  'typing:start': (roomId: string) => void
  'typing:stop':  (roomId: string) => void
}
```

## Hook de Socket.IO con cleanup

```typescript
// hooks/useSocket.ts
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getSocket } from '../lib/socket'

export function useSocket() {
  const { accessToken } = useAuthStore()
  const socketRef = useRef(accessToken ? getSocket(accessToken) : null)

  useEffect(() => {
    if (!accessToken) return
    const socket = getSocket(accessToken)
    socketRef.current = socket

    return () => {
      // NO desconectar aquí — la conexión es compartida entre hooks
      // disconnectSocket() sólo al hacer logout
    }
  }, [accessToken])

  return socketRef.current
}
```

## Cleanup al logout

```typescript
// En useAuth hook, al hacer logout:
export function useAuth() {
  const { clearAuth } = useAuthStore()
  const logout = useCallback(async () => {
    await api.fetch('/auth/logout', { method: 'POST' })
    disconnectSocket()   // ← limpiar socket al logout
    clearAuth()
  }, [clearAuth])
  return { logout }
}
```
