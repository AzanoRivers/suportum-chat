---
name: zustand-patterns
description: >
  Patrones de Zustand v5 para Suportum: stores con Immer middleware, slices,
  persist, y acceso fuera de componentes. Usar cuando se implementan stores de
  estado global (authStore, chatStore, ticketStore, orderStore).
---

# Zustand v5 — Patterns para Suportum

## Store base con Immer

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Message } from '../types/domain'

interface ChatState {
  messages: Record<string, Message[]>
  activeRoom: string | null
  typing: Record<string, string[]>
  addMessage: (roomId: string, msg: Message) => void
  setActiveRoom: (roomId: string | null) => void
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void
  clearRoom: (roomId: string) => void
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: {},
    activeRoom: null,
    typing: {},

    addMessage: (roomId, msg) => set((state) => {
      if (!state.messages[roomId]) state.messages[roomId] = []
      state.messages[roomId].push(msg)
    }),

    setActiveRoom: (roomId) => set((state) => {
      state.activeRoom = roomId
    }),

    setTyping: (roomId, userId, isTyping) => set((state) => {
      if (!state.typing[roomId]) state.typing[roomId] = []
      if (isTyping) {
        if (!state.typing[roomId].includes(userId)) state.typing[roomId].push(userId)
      } else {
        state.typing[roomId] = state.typing[roomId].filter(id => id !== userId)
      }
    }),

    clearRoom: (roomId) => set((state) => {
      delete state.messages[roomId]
      delete state.typing[roomId]
    }),
  }))
)
```

## Acceso fuera de componentes (para Socket.IO handlers)

```typescript
// ✅ Usar .getState() fuera de React
function onSocketMessage(msg: Message) {
  useChatStore.getState().addMessage(msg.roomId, msg)
}

// ✅ Subscribir a cambios sin React
const unsub = useChatStore.subscribe(
  (state) => state.activeRoom,
  (room) => { /* react to change */ }
)
```

## Auth Store con persist

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface AuthState {
  accessToken: string | null
  user: User | null
  role: 'client' | 'agent' | 'admin' | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      accessToken: null,
      user: null,
      role: null,
      setAuth: (token, user) => set((state) => {
        state.accessToken = token
        state.user = user
        state.role = user.role
      }),
      clearAuth: () => set((state) => {
        state.accessToken = null
        state.user = null
        state.role = null
      }),
    })),
    {
      name: 'suportum-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    }
  )
)
```
