import { useAuthStore } from '../store/authStore'
import { getBaseUrl } from './config'

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code)
  }
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/refresh`, {
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

  // FormData (uploads multipart): el browser setea su propio Content-Type
  // con el boundary correcto. Forzar 'application/json' rompe el parseo del body.
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

export type VerifyStatus = 'not_found' | 'ready' | 'domain_mismatch' | 'connection_error'

// Endpoint publico (sin JWT), se llama con la apiUrl del widget host antes de que
// exista sesion. A diferencia de `request()`, no pasa por getBaseUrl() ni por
// apiClient: recibe apiUrl explicito, igual que useProjectBrandingPublic.
// Si la request de red falla (backend caido, sin conexion) se resuelve como
// 'connection_error', nunca como 'not_found' ni 'domain_mismatch': esos dos
// implican que el backend si respondio con informacion de negocio.
export async function verifyProject(apiUrl: string, apiKey: string): Promise<{ status: VerifyStatus }> {
  try {
    const res = await fetch(`${apiUrl}/api/v1/projects/verify?api_key=${encodeURIComponent(apiKey)}`)
    if (!res.ok) return { status: 'connection_error' }

    const data = await res.json() as { status?: string }
    if (data.status === 'not_found' || data.status === 'ready' || data.status === 'domain_mismatch') {
      return { status: data.status }
    }
    return { status: 'connection_error' }
  } catch {
    return { status: 'connection_error' }
  }
}

export const apiClient = {
  get:      <T>(path: string)                        => request<T>(path),
  post:     <T>(path: string, body: unknown)          => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  postForm: <T>(path: string, formData: FormData)     => request<T>(path, { method: 'POST',   body: formData }),
  put:      <T>(path: string, body: unknown)          => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:    <T>(path: string, body: unknown)          => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:   <T>(path: string)                         => request<T>(path, { method: 'DELETE' }),
}
