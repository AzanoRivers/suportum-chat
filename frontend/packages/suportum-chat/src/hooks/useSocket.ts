import { type Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { getSocket } from '../lib/socket'

// Returns the active socket. Lifecycle (connect/disconnect) is managed by SuportumChatInner.
export function useSocket(apiKey: string): Socket | null {
  const token = useAuthStore((s) => s.token)
  if (!token || !apiKey) return null
  return getSocket(token, apiKey)
}
