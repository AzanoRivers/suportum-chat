import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

type Theme = 'dark-dragon' | 'light-clean'

const STORAGE_KEY = 'suportum-theme'
const DEFAULT_THEME: Theme = 'dark-dragon'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

interface ThemeProviderProps {
  children: ReactNode
  initialTheme?: Theme
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (initialTheme) return initialTheme
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark-dragon' || stored === 'light-clean') return stored
    } catch {
      // localStorage not available
    }
    return DEFAULT_THEME
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage not available
    }
  }, [theme])

  const setTheme = (next: Theme) => {
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme}`}>{children}</div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
