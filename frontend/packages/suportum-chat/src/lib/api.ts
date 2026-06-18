import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code)
  }
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    const store = useAuthStore.getState()
    store.setSession(data.access_token, store.role, store.userId!, store.projectId!)
    store.setVerified()
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState()

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}))
    if (body?.error?.code === 'AUTH_TOKEN_EXPIRED') {
      const refreshed = await tryRefreshToken()
      if (refreshed) return request<T>(path, options)
    }
    useAuthStore.getState().clearSession()
    throw new ApiError('AUTH_TOKEN_INVALID', 401)
  }

  if (response.status === 403) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body?.error?.code ?? 'FORBIDDEN', 403)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body?.error?.code ?? 'INTERNAL_ERROR', response.status)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json()
}

export const apiClient = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => request<T>(path, { method: 'DELETE' }),
}
