import { useI18n } from '../i18n'

type ThemeId = 'dark-dragon' | 'light-clean'

interface ThemeColors {
  bg: string
  surface: string
  accent: string
  text: string
}

const THEME_PREVIEWS: Record<ThemeId, ThemeColors> = {
  'dark-dragon': { bg: '#0a0a0f', surface: '#111118', accent: '#00d4ff', text: '#e8e8f0' },
  'light-clean': { bg: '#f8f8fc', surface: '#ffffff', accent: '#0066cc', text: '#1a1a2e' },
}

interface ThemeCardProps {
  themeId: ThemeId
  isActive: boolean
  onSelect: () => void
}

export function ThemeCard({ themeId, isActive, onSelect }: ThemeCardProps) {
  const { t } = useI18n()
  const colors = THEME_PREVIEWS[themeId]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      className={['cursor-pointer rounded-sm overflow-hidden transition-all focus-visible:outline-none border-2', isActive ? 'theme-card--active' : 'theme-card--inactive'].join(' ')}
      style={{ '--tc-bg': colors.bg, '--tc-surface': colors.surface, '--tc-accent': colors.accent, '--tc-text': colors.text } as React.CSSProperties}
    >
      <div className="theme-card__preview">
        <div className="theme-card__surface">
          <div className="theme-card__bar--accent" />
          <div className="theme-card__bar--text1" />
          <div className="theme-card__bar--text2" />
        </div>
      </div>
      <div className="theme-card__label px-2 py-1.5 flex items-center justify-between gap-1">
        <span className="text-xs text-(--color-text-primary) font-medium">
          {t(`settings.themes.${themeId}`)}
        </span>
        {isActive && (
          <span className="text-xs theme-card__check">&#10003;</span>
        )}
      </div>
    </div>
  )
}
