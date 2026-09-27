import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { consumeAuthAnimation } from '../lib/authAnimation'
import { verifyProject } from '../lib/api'
import { LoginView } from '../organisms/LoginView'
import { RegisterView } from '../organisms/RegisterView'
import { SetupWizard } from '../organisms/SetupWizard'
import { LoadingScreen } from '../organisms/LoadingScreen'
import { ErrorPlaceholder } from '../molecules/ErrorPlaceholder'
import { ProjectNotFoundPlaceholder } from '../molecules/ProjectNotFoundPlaceholder'
import { DomainBlockedPlaceholder } from '../molecules/DomainBlockedPlaceholder'
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

// 'not_found' y 'blocked' vienen de la respuesta de negocio de /projects/verify
// (b09). 'error' es distinto: fallo de red/backend caido al llamar verify, no
// debe confundirse con ninguno de los dos anteriores (ver f09 seccion 6).
type ShellStatus = 'checking' | 'setup' | 'ready' | 'not_found' | 'blocked' | 'error'

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
    let cancelled = false

    async function check() {
      if (!initialApiKey) {
        // Sin apiKey de entrada: no hay nada que verificarle al backend, es
        // directamente el flujo de setup (sin cambios respecto al comportamiento previo).
        onProjectReset?.()
        setShellStatus('setup')
        return
      }

      const result = await verifyProject(apiUrl, initialApiKey)
      if (cancelled) return

      // Importante: 'not_found' NUNCA dispara onProjectReset() ni 'setup'.
      // La key esta mal, pero corregirla es manual del lado del integrador
      // (ver f09 seccion 2): no se auto-limpia nada guardado.
      if (result.status === 'ready') {
        setShellStatus('ready')
      } else if (result.status === 'not_found') {
        setShellStatus('not_found')
      } else if (result.status === 'domain_mismatch') {
        setShellStatus('blocked')
      } else {
        setShellStatus('error')
      }
    }

    void check()
    return () => { cancelled = true }
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

  if (shellStatus === 'not_found') {
    return (
      <div className="widget-shell__full">
        <div className="widget-shell__full-body">
          <ProjectNotFoundPlaceholder />
        </div>
        <WidgetFooter />
      </div>
    )
  }

  if (shellStatus === 'blocked') {
    return (
      <div className="widget-shell__full">
        <div className="widget-shell__full-body">
          <DomainBlockedPlaceholder />
        </div>
        <WidgetFooter />
      </div>
    )
  }

  if (shellStatus === 'error') {
    return (
      <div className="widget-shell__full">
        <div className="widget-shell__full-body">
          <ErrorPlaceholder code="NETWORK_ERROR" />
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
