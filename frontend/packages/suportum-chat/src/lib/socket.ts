import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { getBaseUrl } from './config'

let globalSocket: Socket | null = null

export function getSocket(token: string, apiKey: string): Socket {
  if (!globalSocket) {
    globalSocket = io(`${getBaseUrl()}/${apiKey}`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    globalSocket.on('connect_error', (err) => {
      try {
        const data = JSON.parse(err.message)
        if (['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED', 'FORBIDDEN'].includes(data.code)) {
          useAuthStore.getState().clearSession()
        }
      } catch {
        // Error de red - dejar que reconnect lo intente
      }
    })
  }
  return globalSocket
}

export function disconnectSocket() {
  globalSocket?.disconnect()
  globalSocket = null
}
