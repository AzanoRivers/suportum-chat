import { useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { useI18n } from '../i18n'
import { useTheme } from '../providers/ThemeProvider'
import { ThemeCard } from '../molecules/ThemeCard'
import { LogoUploader } from '../molecules/LogoUploader'
import { useProjectSettings } from '../hooks/useProjectSettings'
import { ApiError } from '../lib/api'

type ThemeId = 'dark-dragon' | 'light-clean'
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const THEMES: ThemeId[] = ['dark-dragon', 'light-clean']
const POSITIONS: Position[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']

interface AdminSettingsProps {
  apiUrl: string
}

export function AdminSettings({ apiUrl }: AdminSettingsProps) {
  const { t } = useI18n()
  const { setTheme: applyTheme } = useTheme()
  const { project, isLoading, isSaving, updateSettings, rotateApiKey } = useProjectSettings(apiUrl)

  const [name, setName] = useState('')
  const [theme, setTheme] = useState<ThemeId>('dark-dragon')
  const [position, setPosition] = useState<Position>('bottom-right')
  const [buttonLabel, setButtonLabel] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Inicializar form cuando lleguen los datos del proyecto (solo una vez)
  if (project && !initialized) {
    setName(project.name)
    setTheme((project.settings?.theme ?? 'dark-dragon') as ThemeId)
    setPosition((project.settings?.position ?? 'bottom-right') as Position)
    setButtonLabel(project.settings?.button_label ?? '')
    setInitialized(true)
  }

  const handleThemeSelect = (themeId: ThemeId) => {
    setTheme(themeId)
    applyTheme(themeId)
    setSaveSuccess(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateSettings({
        name,
        settings: { theme, position, button_label: buttonLabel },
      })
      setSaveSuccess(true)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setSaveError(t(`errors.${code}`) ?? code)
    }
  }

  const handleCopyKey = async () => {
    const key = newApiKey ?? project?.api_key ?? ''
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: no hacer nada
    }
  }

  const handleRotate = async () => {
    try {
      const key = await rotateApiKey()
      setNewApiKey(key)
      setConfirming(false)
    } catch {
      // error silencioso
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-(--color-text-muted)">{t('common.loading')}</p>
      </div>
    )
  }

  const displayKey = newApiKey ?? project?.api_key ?? ''

  return (
    <div
      className="flex flex-col h-full overflow-y-auto smooth-scroll"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <span className="text-sm font-medium text-(--color-text-primary)">{t('settings.title')}</span>
      </div>

      <form onSubmit={(e) => { void handleSave(e) }} className="p-4 space-y-5">
        {/* Nombre del proyecto */}
        <div>
          <label className="text-xs font-medium text-(--color-text-secondary) block mb-1">
            {t('settings.projectName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaveSuccess(false) }}
            required
            className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
          />
        </div>

        {/* Branding */}
        <div>
          <p className="text-xs font-medium text-(--color-text-secondary) mb-2">
            {t('settings.branding')}
          </p>
          <LogoUploader
            currentUrl={project?.settings?.logo_url ?? null}
            apiUrl={apiUrl}
            disabled={isSaving}
            onChange={(url) => {
              void updateSettings({ settings: { logo_url: url } })
              setSaveSuccess(false)
            }}
          />
        </div>

        {/* Selector de tema */}
        <div>
          <p className="text-xs font-medium text-(--color-text-secondary) mb-2">{t('settings.theme')}</p>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t_id) => (
              <ThemeCard
                key={t_id}
                themeId={t_id}
                isActive={theme === t_id}
                onSelect={() => handleThemeSelect(t_id)}
              />
            ))}
          </div>
        </div>

        {/* Posicion del boton */}
        <div>
          <p className="text-xs font-medium text-(--color-text-secondary) mb-2">{t('settings.position')}</p>
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((pos) => (
              <label key={pos} className="flex items-center gap-2 cursor-pointer min-h-10 px-2 py-1.5 rounded-sm border border-(--color-border-subtle) hover:border-(--color-border-default) transition-colors">
                <input
                  type="radio"
                  name="position"
                  value={pos}
                  checked={position === pos}
                  onChange={() => { setPosition(pos); setSaveSuccess(false) }}
                  className="accent-(--color-accent)"
                />
                <span className="text-xs text-(--color-text-secondary)">{t(`settings.positions.${pos}`)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Etiqueta del boton */}
        <div>
          <label className="text-xs font-medium text-(--color-text-secondary) block mb-1">
            {t('settings.buttonLabel')}
          </label>
          <input
            type="text"
            value={buttonLabel}
            onChange={(e) => { setButtonLabel(e.target.value); setSaveSuccess(false) }}
            className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
          />
        </div>

        {/* Feedback guardar */}
        {saveError && <p className="text-xs text-(--color-status-cancelled)">{saveError}</p>}
        {saveSuccess && <p className="text-xs text-(--color-accent)">{t('common.save')}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 text-sm font-medium bg-(--color-accent) text-(--color-text-on-accent) rounded-sm disabled:opacity-50"
        >
          {isSaving ? t('common.loading') : t('settings.save')}
        </button>
      </form>

      {/* Seccion API Key */}
      <div className="px-4 pb-6 space-y-3 border-t border-(--color-border-default) pt-4">
        <p className="text-xs font-medium text-(--color-text-secondary)">{t('settings.apiKey')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono text-(--color-text-muted) bg-(--color-bg-elevated) px-2 py-1.5 rounded-sm truncate">
            {displayKey}
          </code>
          <button
            type="button"
            onClick={() => { void handleCopyKey() }}
            className="flex-none p-1.5 rounded-sm border border-(--color-border-default) text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
            aria-label={t('settings.copyKey')}
          >
            {copied ? <Check size={14} className="text-(--color-accent)" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Rotar API key */}
        {confirming ? (
          <div className="p-3 rounded-sm border border-(--color-status-cancelled) bg-(--color-bg-elevated)">
            <p className="text-xs text-(--color-text-primary) mb-2">{t('settings.rotateConfirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { void handleRotate() }}
                className="flex-1 py-2 text-xs font-medium rounded-sm bg-(--color-status-cancelled) text-(--color-text-on-accent)"
              >
                {t('settings.rotateConfirmBtn')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 text-xs border border-(--color-border-default) text-(--color-text-muted) rounded-sm"
              >
                {t('settings.rotateCancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 text-xs text-(--color-status-cancelled) hover:opacity-80 transition-opacity"
          >
            <AlertTriangle size={13} />
            {t('settings.rotateKey')}
          </button>
        )}
      </div>
    </div>
  )
}
