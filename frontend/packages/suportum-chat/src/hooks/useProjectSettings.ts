import { useState, useEffect } from 'react'
import { useTheme } from '../providers/ThemeProvider'
import { apiClient, ApiError } from '../lib/api'

type ThemeId = 'dark-dragon' | 'light-clean'
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface ProjectSettings {
  theme?: ThemeId
  position?: Position
  button_label?: string
  language?: string
  logo_url?: string | null
}

interface Project {
  id: string
  name: string
  slug: string
  api_key: string
  settings: ProjectSettings
  created_at: string
}

export function useProjectSettings(_apiUrl: string) {
  const { setTheme } = useTheme()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    apiClient
      .get<{ project: Project }>('/api/v1/projects/me')
      .then((res) => {
        setProject(res.project)
        // Aplicar tema del backend al montar
        if (res.project.settings?.theme) {
          setTheme(res.project.settings.theme)
        }
      })
      .catch(() => {
        // fallo silencioso; quedarse en defaults
      })
      .finally(() => {
        setIsLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateSettings = async (data: {
    name?: string
    settings?: Partial<ProjectSettings>
  }): Promise<void> => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await apiClient.patch<{ project: Project }>('/api/v1/projects/me', data)
      setProject(res.project)
      // Aplicar tema si fue cambiado
      if (data.settings?.theme) {
        setTheme(data.settings.theme)
      }
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setError(code)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const rotateApiKey = async (): Promise<string> => {
    const res = await apiClient.post<{ api_key: string; project: Project }>(
      '/api/v1/projects/me/rotate-key',
      {},
    )
    setProject(res.project)
    return res.api_key
  }

  return { project, isLoading, isSaving, error, updateSettings, rotateApiKey }
}
