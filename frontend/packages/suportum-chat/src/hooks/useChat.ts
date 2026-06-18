import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore, type Message } from '../store/chatStore'
import { useSocket } from './useSocket'

export function useChat(roomId: string, apiUrl: string, apiKey: string) {
  const socket = useSocket(apiKey)
  const token = useAuthStore((s) => s.token)
  const { addMessage, setHistory, setTyping, removeMessage, messagesByRoom, typingByRoom } = useChatStore()

  const messages = messagesByRoom[roomId] ?? []
  const typingUsers = typingByRoom[roomId] ?? []
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!socket) return

    socket.emit('room:join', { room_id: roomId })

    const onMessageNew = (msg: Message) => {
      if (msg.room_id === roomId) {
        addMessage(roomId, msg)
      }
    }

    const onMessageHistory = (data: { room_id: string; messages: Message[] }) => {
      if (data.room_id === roomId) {
        setHistory(roomId, data.messages)
      }
    }

    const onTyping = (data: { username: string; active: boolean }) => {
      setTyping(roomId, data.username, data.active)
    }

    const onMessageDeleted = (data: { message_id: string; room_id: string }) => {
      if (data.room_id === roomId) removeMessage(roomId, data.message_id)
    }

    socket.on('message:new', onMessageNew)
    socket.on('message:history', onMessageHistory)
    socket.on('typing', onTyping)
    socket.on('message:deleted', onMessageDeleted)

    return () => {
      socket.emit('room:leave', { room_id: roomId })
      socket.off('message:new', onMessageNew)
      socket.off('message:history', onMessageHistory)
      socket.off('typing', onTyping)
      socket.off('message:deleted', onMessageDeleted)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [socket, roomId, addMessage, setHistory, setTyping, removeMessage])

  const sendMessage = (content: string) => {
    socket?.emit('message:send', { room_id: roomId, content })
  }

  const sendImage = async (file: File): Promise<void> => {
    if (!token) return
    const form = new FormData()
    form.append('file', file)
    await fetch(`${apiUrl}/api/v1/upload/${roomId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  }

  const handleTyping = () => {
    if (!socket) return
    socket.emit('typing:start', { room_id: roomId })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { room_id: roomId })
    }, 1500)
  }

  const deleteMessage = (messageId: string) => {
    socket?.emit('message:delete', { room_id: roomId, message_id: messageId })
  }

  return {
    messages,
    typingUsers,
    sendMessage,
    sendImage,
    handleTyping,
    deleteMessage,
    isConnected: socket?.connected ?? false,
  }
}
