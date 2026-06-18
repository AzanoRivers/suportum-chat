import { useState, useRef, useCallback, useEffect } from 'react'
import { Home, ChevronLeft, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'
import { WindowControls } from '../atoms/WindowControls'
import { AppLauncher } from '../organisms/AppLauncher'
import { disconnectSocket } from '../lib/socket'
import { requestAuthAnimation } from '../lib/authAnimation'
import { useProjectBrandingPublic } from '../hooks/useProjectBrandingPublic'
import type { AppDef } from '../organisms/AppLauncher'

export type { AppDef }

interface OsShellProps {
  apps: AppDef[]
  apiUrl: string
  apiKey: string
  onClose: () => void
}

const SLIDE_MS = 270

export function OsShell({ apps, apiUrl, apiKey, onClose }: OsShellProps) {
  const { t } = useI18n()
  const { username, role, clearSession } = useAuthStore()
  const { projectName } = useProjectBrandingPublic(apiUrl)

  const [activeApp, setActiveApp]         = useState<AppDef | null>(null)
  const [renderedApp, setRenderedApp]     = useState<AppDef | null>(null)
  const [renderedInitialState, setRenderedInitialState] = useState<unknown>(null)

  const closeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  // true mientras tenemos una entrada en el historial del navegador (se limpia al volver al launcher)
  const hasHistoryEntry  = useRef(false)

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  // UI-only go-home (no toca el historial)
  const goHomeUI = useCallback(() => {
    setActiveApp(null)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setRenderedApp(null)
      setRenderedInitialState(null)
    }, SLIDE_MS + 30)
  }, [])

  // Botón de header: sincroniza historial + UI
  const goHome = useCallback(() => {
    if (hasHistoryEntry.current) {
      hasHistoryEntry.current = false
      // history.back() es asíncrono; el popstate llega después,
      // pero hasHistoryEntry ya es false, así que el handler lo ignora.
      history.back()
    }
    goHomeUI()
  }, [goHomeUI])

  // Interceptar botón físico atrás / gesto swipe-back
  useEffect(() => {
    const onPopState = () => {
      if (!hasHistoryEntry.current) return
      hasHistoryEntry.current = false
      goHomeUI()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [goHomeUI])

  // Abrir app
  const openApp = useCallback((appId: string, initialState?: unknown) => {
    const app = apps.find(a => a.id === appId)
    if (!app) return
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)

    // Empujar entrada al historial solo al salir del launcher (una sola entrada por "sesión de app")
    if (!hasHistoryEntry.current) {
      history.pushState({ suportumWidget: true }, '')
      hasHistoryEntry.current = true
    }

    setRenderedInitialState(initialState ?? null)
    setRenderedApp(app)
    // Un frame de delay para que el panel comience en translateX(100%) antes de la transición
    requestAnimationFrame(() => setActiveApp(app))
  }, [apps])

  // Cerrar sesión
  const handleDisconnect = useCallback(() => {
    fetch(`${apiUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})

    requestAuthAnimation()
    disconnectSocket()
    goHome()
    clearSession()
  }, [apiUrl, goHome, clearSession])

  const mainTitle = activeApp
    ? t(activeApp.labelKey as Parameters<typeof t>[0])
    : t('widget.support')

  return (
    <div className="os-shell">

      {/* OS Header */}
      <header className="os-header">

        {/* Home / Back */}
        <button
          type="button"
          onClick={activeApp ? goHome : undefined}
          aria-label={activeApp ? t('common.back') : 'Home'}
          className={['os-header-btn os-header-btn--lg', activeApp ? 'os-header-btn--back' : 'os-header-btn--home'].join(' ')}
        >
          {activeApp
            ? <ChevronLeft size={20} strokeWidth={2} />
            : <Home        size={18} strokeWidth={1.6} />
          }
        </button>

        {/* Title */}
        <span className="os-title">
          <span className="os-title__main">{mainTitle}</span>
          {projectName && (
            <>{' - '}<span className="os-title__project">{projectName}</span></>
          )}
        </span>

        {/* Window controls + Close */}
        <WindowControls />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('widget.close')}
          className="os-header-btn os-header-btn--md os-header-btn--close"
        >
          <X size={15} strokeWidth={1.5} />
        </button>
      </header>

      {/* Content: launcher + app panels */}
      <div className="os-content">

        {/* Launcher panel */}
        <div className={['os-panel os-launcher', activeApp ? 'is-hidden' : ''].join(' ')}>
          <AppLauncher
            apps={apps}
            username={username}
            role={role}
            onOpen={openApp}
            onDisconnect={handleDisconnect}
          />
        </div>

        {/* App panel */}
        <div className={['os-panel os-app', activeApp ? 'is-active' : ''].join(' ')}>
          {renderedApp && renderedApp.render({
            apiUrl,
            apiKey,
            onClose,
            onNavigateTo: openApp,
            initialState: renderedInitialState,
          })}
        </div>
      </div>
    </div>
  )
}
