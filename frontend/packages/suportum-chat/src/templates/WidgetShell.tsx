import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { consumeAuthAnimation } from '../lib/authAnimation'
import { LoginView } from '../organisms/LoginView'
import { RegisterView } from '../organisms/RegisterView'
import { SetupWizard } from '../organisms/SetupWizard'
import { LoadingScreen } from '../organisms/LoadingScreen'
import { ClientView } from './ClientView'
import { AgentView } from './AgentView'
import { AdminView } from './AdminView'

interface WidgetShellProps {
  apiUrl: string
  apiKey: string
  onClose: () => void
  onSetupComplete?: (apiKey: string) => void
  onProjectReset?: () => void
}

function WidgetFooter() {
  return (
    <div className="widget-footer widget-footer-bar">
      <span className="rainbow-brand widget-footer-brand">SuportumChat</span>
      <span className="widget-footer-by">by</span>
      <a
        href="https://azanolabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="widget-footer-link"
      >
        AzanoLabs
      </a>
    </div>
  )
}

type ShellStatus = 'checking' | 'setup' | 'ready'

export function WidgetShell({ apiUrl, apiKey: initialApiKey, onClose, onSetupComplete, onProjectReset }: WidgetShellProps) {
  const { token, isVerified, role } = useAuthStore()
  const [currentApiKey, setCurrentApiKey] = useState(initialApiKey)
  const [shellStatus, setShellStatus] = useState<ShellStatus>('checking')
  const [showSetup, setShowSetup] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  // true solo cuando el cambio de token fue iniciado explícitamente por el usuario
  const [transitionEnabled, setTransitionEnabled] = useState(false)
  const isMountedRef = useRef(false)

  useEffect(() => {
    if (initialApiKey) {
      setShellStatus('ready')
    } else {
      onProjectReset?.()
      setShellStatus('setup')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Habilita la transición solo cuando el cambio de token fue user-initiated
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (consumeAuthAnimation()) {
      setTransitionEnabled(true)
    }
  }, [token])

  const handleApiKeyReceived = (newApiKey: string) => {
    setCurrentApiKey(newApiKey)
    onSetupComplete?.(newApiKey)
  }

  const handleSetupComplete = (newApiKey: string) => {
    setCurrentApiKey(newApiKey)
    setShowSetup(false)
    setShellStatus('ready')
  }

  // Estados que ocupan toda la pantalla sin transición
  if (shellStatus === 'checking') {
    return (
      <div className="widget-shell__full">
        <div className="widget-shell__full-body">
          <LoadingScreen />
        </div>
        <WidgetFooter />
      </div>
    )
  }

  if (shellStatus === 'setup' || showSetup) {
    return (
      <div className="widget-shell__full">
        <div className="widget-shell__full-body">
          <SetupWizard
            apiUrl={apiUrl}
            onApiKeyReceived={handleApiKeyReceived}
            onComplete={handleSetupComplete}
            onClose={onClose}
          />
        </div>
        <WidgetFooter />
      </div>
    )
  }

  // Estado ready: dos paneles que se deslizan entre sí
  const isInApp = !!token

  let appContent: React.ReactNode
  if (!isVerified) {
    appContent = <LoadingScreen />
  } else if (role === 'client') {
    appContent = <ClientView apiUrl={apiUrl} apiKey={currentApiKey} onClose={onClose} />
  } else if (role === 'agent') {
    appContent = <AgentView apiUrl={apiUrl} apiKey={currentApiKey} onClose={onClose} />
  } else if (role === 'admin') {
    appContent = <AdminView apiUrl={apiUrl} apiKey={currentApiKey} onClose={onClose} />
  } else {
    appContent = <LoadingScreen />
  }

  return (
    <div className="widget-shell">
      <div className="widget-shell__body">

        {/* Panel auth: login <> registro (siempre montado) */}
        <div
          className={['widget-slide-panel widget-auth-panel', isInApp ? 'is-app' : '', transitionEnabled ? 'animated' : ''].filter(Boolean).join(' ')}
        >
          {/* Sub-paneles login y registro se deslizan entre sí */}
          <div className="widget-auth-subpanels">
            <div className={['widget-sub-panel widget-login-panel', showRegister ? 'is-hidden' : ''].join(' ')}>
              <LoginView
                apiUrl={apiUrl}
                apiKey={currentApiKey}
                onRegister={() => setShowRegister(true)}
                onClose={onClose}
              />
            </div>
            <div className={['widget-sub-panel widget-register-panel', showRegister ? 'is-visible' : ''].join(' ')}>
              <RegisterView
                apiUrl={apiUrl}
                apiKey={currentApiKey}
                onBack={() => setShowRegister(false)}
                onClose={onClose}
              />
            </div>
          </div>
        </div>

        {/* Panel app: home / views autenticadas (siempre montado) */}
        <div
          className={['widget-slide-panel widget-app-panel', isInApp ? 'is-app' : '', transitionEnabled ? 'animated' : ''].filter(Boolean).join(' ')}
        >
          {appContent}
        </div>

      </div>
      <WidgetFooter />
    </div>
  )
}
