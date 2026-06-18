import { create } from 'zustand'

export interface Message {
  id: string
  room_id: string
  user_id: string
  username: string
  role?: string
  content: string
  created_at: string
  attachment?: {
    url: string
    width: number
    height: number
    size_bytes: number
  }
}

interface ChatState {
  messagesByRoom: Record<string, Message[]>
  typingByRoom: Record<string, string[]>
  addMessage: (roomId: string, msg: Message) => void
  setHistory: (roomId: string, msgs: Message[]) => void
  setTyping: (roomId: string, username: string, active: boolean) => void
  removeMessage: (roomId: string, messageId: string) => void
  clearRoom: (roomId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByRoom: {},
  typingByRoom: {},

  addMessage: (roomId, msg) =>
    set((state) => {
      const existing = state.messagesByRoom[roomId] ?? []
      if (existing.some((m) => m.id === msg.id)) return state
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: [...existing, msg],
        },
      }
    }),

  setHistory: (roomId, msgs) =>
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: msgs,
      },
    })),

  setTyping: (roomId, username, active) =>
    set((state) => {
      const current = state.typingByRoom[roomId] ?? []
      const updated = active
        ? current.includes(username)
          ? current
          : [...current, username]
        : current.filter((u) => u !== username)
      return {
        typingByRoom: {
          ...state.typingByRoom,
          [roomId]: updated,
        },
      }
    }),

  removeMessage: (roomId, messageId) =>
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: (state.messagesByRoom[roomId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  clearRoom: (roomId) =>
    set((state) => {
      const newMessages = { ...state.messagesByRoom }
      const newTyping = { ...state.typingByRoom }
      delete newMessages[roomId]
      delete newTyping[roomId]
      return {
        messagesByRoom: newMessages,
        typingByRoom: newTyping,
      }
    }),
}))
