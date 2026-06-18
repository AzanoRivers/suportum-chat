import { useEffect, useState } from 'react'

interface ProjectBranding {
  logoUrl: string | null
  projectName: string | null
  isLoading: boolean
}

interface BrandingData {
  logoUrl: string | null
  projectName: string | null
}

// Cache de módulo para evitar fetches duplicados cuando LoginView y RegisterView montan en paralelo
const _cache = new Map<string, BrandingData>()
const _pending = new Map<string, Promise<BrandingData>>()

function fetchBranding(apiUrl: string): Promise<BrandingData> {
  if (_cache.has(apiUrl)) return Promise.resolve(_cache.get(apiUrl)!)
  if (_pending.has(apiUrl)) return _pending.get(apiUrl)!

  const promise = fetch(`${apiUrl}/api/v1/setup/branding`)
    .then((r) => r.json() as Promise<{ logo_url?: string | null; project_name?: string | null }>)
    .then((data) => {
      const result: BrandingData = {
        logoUrl: typeof data.logo_url === 'string' && data.logo_url ? `${apiUrl}${data.logo_url}` : null,
        projectName: typeof data.project_name === 'string' && data.project_name ? data.project_name : null,
      }
      _cache.set(apiUrl, result)
      _pending.delete(apiUrl)
      return result
    })
    .catch(() => {
      const result: BrandingData = { logoUrl: null, projectName: null }
      _cache.set(apiUrl, result)
      _pending.delete(apiUrl)
      return result
    })

  _pending.set(apiUrl, promise)
  return promise
}

export function useProjectBrandingPublic(apiUrl: string): ProjectBranding {
  const [data, setData] = useState<BrandingData>(() => _cache.get(apiUrl) ?? { logoUrl: null, projectName: null })
  const [isLoading, setIsLoading] = useState(!_cache.has(apiUrl))

  useEffect(() => {
    if (_cache.has(apiUrl)) {
      setData(_cache.get(apiUrl)!)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    void fetchBranding(apiUrl).then((result) => {
      setData(result)
      setIsLoading(false)
    })
  }, [apiUrl])

  return { logoUrl: data.logoUrl, projectName: data.projectName, isLoading }
}
