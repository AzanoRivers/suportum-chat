import { useState, useEffect } from 'react'
import { useSocket } from './useSocket'

interface Room {
  id: string
  name: string
}

export function useChatRooms(apiKey: string) {
  const socket = useSocket(apiKey)
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    if (!socket) return

    const onRoomOpened = (room: Room) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev
        return [...prev, room]
      })
    }

    socket.on('room:opened', onRoomOpened)

    return () => {
      socket.off('room:opened', onRoomOpened)
    }
  }, [socket])

  return { rooms }
}
