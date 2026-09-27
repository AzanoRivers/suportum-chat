import { useState } from 'react'
import { apiClient, ApiError } from '../lib/api'

// apiUrl se acepta por consistencia con el resto de los hooks, pero apiClient
// resuelve su propia base URL (ver lib/config.ts / setBaseUrl).
export function useProjectBranding(_apiUrl: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadLogo = async (file: File): Promise<string> => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const data = await apiClient.postForm<{ logo_url?: string }>(
        '/api/v1/projects/me/logo',
        formData,
      )

      if (!data.logo_url) {
        throw new ApiError('INTERNAL_ERROR', 500)
      }
      return data.logo_url
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR'
      setError(code)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const deleteLogo = async (): Promise<void> => {
    setIsUploading(true)
    setError(null)
    try {
      await apiClient.delete<void>('/api/v1/projects/me/logo')
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR'
      setError(code)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadLogo, deleteLogo, isUploading, error }
}
