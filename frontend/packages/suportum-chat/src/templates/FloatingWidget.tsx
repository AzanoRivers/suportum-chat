import { useEffect, useState, useRef } from 'react'
import { Maximize2, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useWidgetStore } from '../store/widgetStore'
import { useAutoRefreshOnMount } from '../hooks/useAutoRefreshOnMount'
import { useSessionVerifier } from '../hooks/useSessionVerifier'
import { useSwipeDown } from '../hooks/useSwipeDown'
import { ChatButton } from './ChatButton'
import { WidgetShell } from './WidgetShell'
import { MinimizeContext } from '../atoms/MinimizeContext'
import { useI18n, I18nProvider } from '../i18n'
import { ThemeProvider } from '../providers/ThemeProvider'
import { disconnectSocket } from '../lib/socket'
import type { Locale } from '../i18n'

type Theme = 'dark-dragon' | 'light-clean'
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface SuportumChatProps {
  apiUrl: string
  apiKey: string
  position?: Position
  buttonLabel?: string
  theme?: Theme
  locale?: Locale
  userToken?: string
  onSetupComplete?: (apiKey: string) => void
  onProjectReset?: () => void
}

interface InnerProps {
  apiUrl: string
  apiKey: string
  position: Position
  buttonLabel?: string
  userToken?: string
  onSetupComplete?: (apiKey: string) => void
  onProjectReset?: () => void
}

function SuportumChatInner({
  apiUrl,
  apiKey,
  position,
  buttonLabel,
  userToken,
  onSetupComplete,
  onProjectReset,
}: InnerProps) {
  const { t } = useI18n()
  const { token, setSession } = useAuthStore()
  const { isOpen, isExpanded, isMinimized, open, close, restore, minimize: storeMinimize } = useWidgetStore()
  useAutoRefreshOnMount(apiUrl, Boolean(apiKey))
  useSessionVerifier(apiUrl)

  // Socket lifecycle: desconectar cuando se pierde el token o el apiKey,
  // y al desmontar el widget del DOM.
  useEffect(() => {
    if (!token || !apiKey) disconnectSocket()
  }, [token, apiKey])
  useEffect(() => () => { disconnectSocket() }, [])

  useEffect(() => {
    if (userToken && !token) {
      setSession(userToken, null, '', '')
    }
    // Solo en mount: pre-cargar token externo si no hay sesión activa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isBarWinking, setIsBarWinking] = useState(false)
  const [enterAnim, setEnterAnim] = useState<'open' | 'restore'>('open')
  const [exitAnim, setExitAnim] = useState<'minimize' | 'close'>('minimize')
  const [isExiting, setIsExiting] = useState(false)
  const [isBarClosing, setIsBarClosing] = useState(false)
  const [barShrinking, setBarShrinking] = useState(false)
  const [barGrowing, setBarGrowing] = useState(false)
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const barAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOpen = () => {
    setEnterAnim('open')
    open()
  }

  const handleMinimize = () => {
    const fromExpanded = isExpanded
    setExitAnim('minimize')
    setIsExiting(true)
    if (fromExpanded) setBarShrinking(true)
    animTimer.current = setTimeout(() => {
      storeMinimize()
      setIsExiting(false)
      if (fromExpanded) {
        barAnimTimer.current = setTimeout(() => setBarShrinking(false), 350)
      }
    }, 190)
  }

  const handleClose = () => {
    setExitAnim('close')
    setIsExiting(true)
    animTimer.current = setTimeout(() => {
      close()
      setIsExiting(false)
    }, 220)
  }

  const handleBarClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBarClosing(true)
    animTimer.current = setTimeout(() => {
      close()
      setIsBarClosing(false)
    }, 200)
  }

  const handleRestore = () => {
    setEnterAnim('restore')
    if (isExpanded) {
      setBarGrowing(true)
      animTimer.current = setTimeout(() => {
        restore()
        setBarGrowing(false)
      }, 260)
    } else {
      restore()
    }
  }

  useEffect(() => () => {
    if (animTimer.current) clearTimeout(animTimer.current)
    if (barAnimTimer.current) clearTimeout(barAnimTimer.current)
  }, [])

  const label = buttonLabel ?? t('widget.support')
  const swipeHandlers = useSwipeDown(handleClose)

  if (!isOpen) {
    return <ChatButton onClick={handleOpen} position={position} label={label} />
  }

  // Minimizado: barra compacta en desktop, botón flotante en mobile
  if (isMinimized) {
    return (
      <>
        {/* Desktop: barra minimizada. Click en toda la barra restaura el widget */}
        <div
          className={[
            'fixed z-[9999] bottom-6 right-6',
            'hidden lg:flex',
            'glass-panel widget-minimized overflow-hidden',
            'lg:rounded-(--radius-lg)',
            'border border-(--color-border-default)',
            'shadow-[0_8px_32px_rgba(3,11,58,0.7)]',
            isBarClosing  ? 'bar-close-exit'  : '',
            barShrinking  ? 'bar-shrink-enter' : '',
            barGrowing    ? 'bar-grow-exit'    : '',
          ].join(' ')}
          onClick={handleRestore}
          onMouseEnter={() => setIsBarWinking(true)}
          onMouseLeave={() => setIsBarWinking(false)}
        >
          <div className="mini-bar">
            {/* Contenedor del ícono: crece en ancho para empujar el texto a la derecha */}
            <div className={['mini-bar__icon-wrap', isBarWinking ? 'mini-bar__icon-wrap--winking' : 'mini-bar__icon-wrap--normal'].join(' ')}>
              <svg
                width="16" height="16" viewBox="0 0 16 16" fill="none"
                className={['mini-bar__chat-icon', isBarWinking ? 'mini-bar__chat-icon--winking' : 'mini-bar__chat-icon--normal'].join(' ')}
                aria-hidden="true"
              >
                {/* Burbuja */}
                <path
                  d="M13 1H3C1.9 1 1 1.9 1 3v7c0 1.1.9 2 2 2h2v2.5l3-2.5h5c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2z"
                  fill="currentColor" fillOpacity="0.85"
                />
                {/* Cara guino: aparece al pasar el cursor */}
                <g className={['mini-bar__wink-face', isBarWinking ? 'mini-bar__wink-face--visible' : 'mini-bar__wink-face--hidden'].join(' ')}>
                  {/* Ojo izquierdo abierto */}
                  <circle cx="5" cy="5.5" r="0.75" fill="white" />
                  {/* Ojo derecho guinado */}
                  <path
                    d="M 8.5 5.5 Q 10 4.2 11.5 5.5"
                    stroke="white" strokeWidth="1" strokeLinecap="round" fill="none"
                  />
                  {/* Sonrisa */}
                  <path
                    d="M 5 8 Q 7 9.8 9 8"
                    stroke="white" strokeWidth="0.95" strokeLinecap="round" fill="none"
                  />
                </g>
              </svg>
            </div>

            <span className="mini-bar__label">
              {label}
            </span>

            {/* Botones agrupados a la derecha */}
            <div className="mini-bar__actions">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRestore() }}
                aria-label="Restore"
                className="mini-btn"
              >
                <Maximize2 size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={handleBarClose}
                aria-label={t('widget.close')}
                className="mini-btn mini-btn--close"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
        {/* Mobile: botón flotante para restaurar */}
        <div className="lg:hidden">
          <ChatButton onClick={handleRestore} position={position} label={label} />
        </div>
      </>
    )
  }

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  let animClass = ''
  if (!prefersReducedMotion) {
    if (isExiting) {
      animClass = exitAnim === 'minimize' ? 'widget-minimize-exit' : 'widget-exit'
    } else {
      animClass = enterAnim === 'restore' ? 'widget-restore-enter' : 'widget-enter'
    }
  }

  return (
    <MinimizeContext.Provider value={handleMinimize}>
      <div
        {...swipeHandlers}
        className={[
          'fixed inset-0 z-[9999] flex flex-col',
          'lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[430px]',
          'lg:rounded-(--radius-lg)',
          'border border-(--color-border-default)',
          'shadow-[0_24px_64px_rgba(3,11,58,0.85)]',
          'overflow-hidden glass-panel widget-full-height widget-size-animate',
          isExpanded ? 'widget-expanded' : '',
          animClass,
        ].join(' ')}
      >
        <WidgetShell apiUrl={apiUrl} apiKey={apiKey} onClose={handleClose} onSetupComplete={onSetupComplete} onProjectReset={onProjectReset} />
      </div>
    </MinimizeContext.Provider>
  )
}

export function SuportumChat({
  locale = 'en',
  theme,
  position = 'bottom-right',
  ...rest
}: SuportumChatProps) {
  return (
    <I18nProvider initialLocale={locale}>
      <ThemeProvider initialTheme={theme}>
        <SuportumChatInner position={position} {...rest} />
      </ThemeProvider>
    </I18nProvider>
  )
}

export { SuportumChat as FloatingWidget }
