import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export interface ProjectBrandingApiError extends Error {
  code: string
  status: number
}

function makeError(code: string, status: number): ProjectBrandingApiError {
  const err = new Error(code) as ProjectBrandingApiError
  err.code = code
  err.status = status
  return err
}

async function readErrorCode(res: Response, fallback: string): Promise<ProjectBrandingApiError> {
  try {
    const body = await res.json() as { error?: { code?: string } }
    const code = body?.error?.code ?? fallback
    return makeError(code, res.status)
  } catch {
    return makeError(fallback, res.status)
  }
}

export function useProjectBranding(apiUrl: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadLogo = async (file: File): Promise<string> => {
    setIsUploading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().token
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${apiUrl}/api/v1/projects/me/logo`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const err = await readErrorCode(res, 'INTERNAL_ERROR')
        setError(err.code)
        throw err
      }

      const data = await res.json() as { logo_url?: string }
      if (!data.logo_url) {
        const err = makeError('INTERNAL_ERROR', 500)
        setError(err.code)
        throw err
      }
      return data.logo_url
    } catch (e) {
      if (e instanceof Error && 'code' in e) {
        const code = (e as ProjectBrandingApiError).code
        setError(code)
      } else {
        setError('NETWORK_ERROR')
      }
      throw e
    } finally {
      setIsUploading(false)
    }
  }

  const deleteLogo = async (): Promise<void> => {
    setIsUploading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`${apiUrl}/api/v1/projects/me/logo`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await readErrorCode(res, 'INTERNAL_ERROR')
        setError(err.code)
        throw err
      }
    } catch (e) {
      if (e instanceof Error && 'code' in e) {
        const code = (e as ProjectBrandingApiError).code
        setError(code)
      } else {
        setError('NETWORK_ERROR')
      }
      throw e
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadLogo, deleteLogo, isUploading, error }
}
