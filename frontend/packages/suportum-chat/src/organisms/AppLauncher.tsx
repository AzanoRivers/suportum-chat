import { useRef, useState, useEffect } from 'react'
import { Power, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n, type Locale } from '../i18n'
import { useWidgetStore } from '../store/widgetStore'

export interface AppRenderProps {
  apiUrl: string
  apiKey: string
  onClose: () => void
  onNavigateTo?: (appId: string, initialState?: unknown) => void
  initialState?: unknown
}

export interface AppDef {
  id: string
  icon: LucideIcon
  labelKey: string
  color: string
  render: (props: AppRenderProps) => React.ReactNode
}

interface AppLauncherProps {
  apps: AppDef[]
  username: string | null
  role: string | null
  onOpen: (appId: string) => void
  onDisconnect: () => void
}

interface IconBtnProps {
  icon: LucideIcon
  label: string
  color: string
  index: number
  settling: boolean
  onClick: () => void
  danger?: boolean
}

function IconBtn({ icon: Icon, label, color, index, settling, onClick, danger }: IconBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={['app-icon-btn', settling ? 'app-icon-appear' : '', danger ? 'app-icon-btn--danger' : ''].filter(Boolean).join(' ')}
      style={{ '--app-color': color, '--icon-delay': settling ? `${index * 32}ms` : '0ms' } as React.CSSProperties}
    >
      <div className="app-icon-box">
        <Icon size={26} strokeWidth={1.6} className="app-icon-inner" />
      </div>

      <span className="app-icon-label">
        {label}
      </span>
    </button>
  )
}

const LOCALES: { id: Locale; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
]

export function AppLauncher({ apps, username, role, onOpen, onDisconnect }: AppLauncherProps) {
  const { t, locale, setLocale } = useI18n()
  const { isExpanded } = useWidgetStore()
  const [settling, setSettling] = useState(false)
  const hasMountedRef = useRef(false)
  const isExpandedRef = useRef(isExpanded)

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      setSettling(true)
      resetTimer = setTimeout(() => setSettling(false), (apps.length + 1) * 32 + 380)
      return () => clearTimeout(resetTimer)
    }

    if (isExpanded === isExpandedRef.current) return
    isExpandedRef.current = isExpanded

    const settleTimer = setTimeout(() => {
      setSettling(true)
      resetTimer = setTimeout(() => setSettling(false), (apps.length + 1) * 32 + 380)
    }, 235)

    return () => {
      clearTimeout(settleTimer)
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [isExpanded, apps.length])

  const roleLabel = role === 'client' ? t('users.roles.client')
    : role === 'agent' ? t('users.roles.agent')
    : role === 'admin' ? t('users.roles.admin')
    : ''

  return (
    <div className="app-launcher widget-bg">
      {/* User strip */}
      {username && (
        <div className="app-user-strip">
          <div className="app-user-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="app-user-name">
            {username}
          </span>
          {roleLabel && (
            <span className="app-user-role">
              {roleLabel}
            </span>
          )}
        </div>
      )}

      {/* Icon grid */}
      <div className="app-icon-grid">
        {apps.map((app, index) => (
          <IconBtn
            key={app.id}
            icon={app.icon}
            label={t(app.labelKey as Parameters<typeof t>[0])}
            color={app.color}
            index={index}
            settling={settling}
            onClick={() => onOpen(app.id)}
          />
        ))}

        {/* Power / Disconnect: always last */}
        <IconBtn
          icon={Power}
          label={t('auth.signOut')}
          color="#FF5A7A"
          index={apps.length}
          settling={settling}
          onClick={onDisconnect}
          danger
        />
      </div>

      {/* Language selector footer */}
      <div className="app-footer">
        <Globe size={13} className="app-footer-icon" />
        <span className="app-footer-label">{locale === 'es' ? 'Lenguaje' : 'Language'}</span>
        <div className="app-lang-pills">
          {LOCALES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setLocale(id)}
              className={['app-lang-btn', locale === id ? 'app-lang-btn--active' : ''].filter(Boolean).join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
