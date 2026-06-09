import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { en } from './en'
import { es } from './es'

export type Locale = 'en' | 'es'

type Translations = typeof en

const LOCALES: Record<Locale, Translations> = { en, es }

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

export function I18nProvider({ children, initialLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

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
