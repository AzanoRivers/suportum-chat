import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * Watches the auth token and verifies it via GET /api/v1/auth/me.
 * Sets isVerified on success, clears session on 401/403.
 */
export function useSessionVerifier(apiUrl: string): void {
  const token = useAuthStore((s) => s.token)
  const { setVerified, clearSession } = useAuthStore()

  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })
        if (res.status === 401 || res.status === 403) {
          clearSession()
          return
        }
        if (res.ok) {
          const data = await res.json() as { username?: string }
          setVerified(data.username)
        }
      } catch {
        // Network error: keep current state, do not clear session
      }
    }

    void verify()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
}
