import { useState, type FormEvent } from 'react'
import { X, UserPlus } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'
import { WindowControls } from '../atoms/WindowControls'
import { FeedbackBanner, type Feedback } from '../atoms/FeedbackBanner'
import { FormField } from '../molecules/FormField'
import { ProjectLogo } from '../atoms/ProjectLogo'
import { useAuthStore } from '../store/authStore'
import { useProjectBrandingPublic } from '../hooks/useProjectBrandingPublic'
import { requestAuthAnimation } from '../lib/authAnimation'
import { useI18n, type Locale } from '../i18n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginViewProps {
  apiUrl: string
  apiKey: string
  onRegister: () => void
  onClose: () => void
}

export function LoginView({ apiUrl, apiKey, onRegister, onClose }: LoginViewProps) {
  const { t, locale, setLocale } = useI18n()
  const { setSession } = useAuthStore()
  const { logoUrl } = useProjectBrandingPublic(apiUrl)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const clearFeedback = () => { if (feedback) setFeedback(null) }

  const validate = (): boolean => {
    if (!email.trim()) {
      setFeedback({ type: 'error', message: t('auth.validation.emailRequired') })
      return false
    }
    if (!EMAIL_RE.test(email)) {
      setFeedback({ type: 'error', message: t('auth.validation.emailInvalid') })
      return false
    }
    if (!password) {
      setFeedback({ type: 'error', message: t('auth.validation.passwordRequired') })
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, api_key: apiKey }),
      })

      const data = await res.json() as {
        access_token?: string
        role?: 'client' | 'agent' | 'admin'
        user_id?: string
        project_id?: string
        error?: { code: string }
      }

      if (!res.ok) {
        setFeedback({ type: 'error', message: t(`errors.${data?.error?.code ?? 'INTERNAL_ERROR'}`) })
        return
      }

      if (data.access_token && data.role && data.user_id && data.project_id) {
        requestAuthAnimation()
        setSession(data.access_token, data.role, data.user_id, data.project_id)
      }
    } catch {
      setFeedback({ type: 'error', message: t('errors.NETWORK_ERROR') })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full widget-bg">

      {/* Header */}
      <div className="view-header">
        <div className="view-header__accent" />
        <div className="view-header__bar">
          <span className="view-header__title">
            {t('auth.signIn')}
          </span>

          <WindowControls />

          <button
            type="button"
            onClick={onClose}
            aria-label={t('widget.close')}
            className="view-header__close"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="view-body">
        <div className="lang-toggle">
          {(['en', 'es'] as Locale[]).map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => setLocale(lng)}
              className={`lang-btn ${locale === lng ? 'lang-btn-on' : 'lang-btn-off'}`}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="min-h-full flex flex-col justify-center">
          <div className="form-body">

            <div className="login-logo-wrap">
              <ProjectLogo src={logoUrl} />
            </div>

            <FeedbackBanner feedback={feedback} />

            <form
              noValidate
              onSubmit={(e) => { void handleSubmit(e) }}
              className="flex flex-col gap-5"
            >
              <FormField
                label={t('auth.email')}
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFeedback() }}
                placeholder={t('auth.emailPlaceholder')}
                disabled={isLoading}
                autoComplete="email"
              />

              <FormField
                label={t('auth.password')}
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFeedback() }}
                placeholder={t('auth.passwordPlaceholder')}
                disabled={isLoading}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" label={t('auth.signingIn')} />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </form>

            <button type="button" onClick={onRegister} className="auth-switch-btn">
              <UserPlus size={22} strokeWidth={1.5} className="auth-switch-btn__icon" />
              <span className="auth-switch-btn__texts">
                <span className="auth-switch-btn__hint">{t('auth.createAccountHint')}</span>
                <span className="auth-switch-btn__action">{t('auth.createAccountAction')}</span>
              </span>
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
