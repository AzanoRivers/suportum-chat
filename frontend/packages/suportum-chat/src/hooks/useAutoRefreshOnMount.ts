import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * On mount, attempts to restore a session via the refresh cookie.
 * Only runs when `enabled` is true (skip during first-time setup with no API key).
 * Uses a raw fetch (not apiClient) to avoid the 401 interceptor loop.
 */
export function useAutoRefreshOnMount(apiUrl: string, enabled = true): void {
  const { setSession, setVerified } = useAuthStore()

  useEffect(() => {
    if (!enabled) return

    const tryRefresh = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) return
        const data = await res.json() as {
          access_token: string
          role: 'client' | 'agent' | 'admin'
          user_id: string
          project_id: string
        }
        setSession(data.access_token, data.role, data.user_id, data.project_id)
        setVerified()
      } catch {
        // No session cookie available, user will see LoginView
      }
    }

    void tryRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
