import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { en } from './en'
import { es } from './es'

export type Locale = 'en' | 'es'

type Translations = typeof en

const LOCALES: Record<Locale, Translations> = { en, es }

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const languages = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]
  const hasSpanish = languages.some((lang) => lang?.toLowerCase().startsWith('es'))
  return hasSpanish ? 'es' : 'en'
}

function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj
  for (const key of keys) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof result === 'string' ? result : path
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

interface I18nProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

const STORAGE_KEY = 'suportum-locale'

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'es') return stored
    } catch {
      // localStorage not available
    }
    return detectBrowserLocale()
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // localStorage not available
    }
  }, [locale])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
  }

  const t = (key: string): string => {
    return resolve(LOCALES[locale] as unknown as Record<string, unknown>, key)
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)

export { en, es }
