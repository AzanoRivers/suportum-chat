import { useState, type FormEvent } from 'react'
import { X, LogIn } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'
import { WindowControls } from '../atoms/WindowControls'
import { FeedbackBanner, type Feedback } from '../atoms/FeedbackBanner'
import { FormField } from '../molecules/FormField'
import { PasswordField } from '../molecules/PasswordField'
import { ProjectLogo } from '../atoms/ProjectLogo'
import { useAuthStore } from '../store/authStore'
import { useProjectBrandingPublic } from '../hooks/useProjectBrandingPublic'
import { requestAuthAnimation } from '../lib/authAnimation'
import { useI18n, type Locale } from '../i18n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface RegisterViewProps {
  apiUrl: string
  apiKey: string
  onBack: () => void
  onClose: () => void
}

export function RegisterView({ apiUrl, apiKey, onBack, onClose }: RegisterViewProps) {
  const { t, locale, setLocale } = useI18n()
  const { setSession, setVerified } = useAuthStore()
  const { logoUrl } = useProjectBrandingPublic(apiUrl)

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
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
    if (!username.trim()) {
      setFeedback({ type: 'error', message: t('auth.validation.usernameRequired') })
      return false
    }
    if (username.trim().length < 3) {
      setFeedback({ type: 'error', message: t('auth.validation.usernameMinLength') })
      return false
    }
    if (!password) {
      setFeedback({ type: 'error', message: t('auth.validation.passwordRequired') })
      return false
    }
    if (password.length < 8) {
      setFeedback({ type: 'error', message: t('auth.validation.passwordMinLength') })
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
      const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, api_key: apiKey }),
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
        setVerified()
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
            {t('register.title')}
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
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFeedback() }}
                placeholder={t('register.emailPlaceholder')}
                disabled={isLoading}
                autoComplete="email"
              />

              <FormField
                label={t('auth.username')}
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearFeedback() }}
                placeholder={t('register.usernamePlaceholder')}
                disabled={isLoading}
                autoComplete="username"
              />

              <PasswordField
                id="register-password"
                label={t('auth.password')}
                value={password}
                onValueChange={(val) => { setPassword(val); clearFeedback() }}
                placeholder={t('register.passwordPlaceholder')}
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" label={t('register.creating')} />
                    {t('register.creating')}
                  </>
                ) : (
                  t('register.submit')
                )}
              </Button>
            </form>

            <button type="button" onClick={onBack} className="auth-switch-btn">
              <LogIn size={22} strokeWidth={1.5} className="auth-switch-btn__icon" />
              <span className="auth-switch-btn__texts">
                <span className="auth-switch-btn__hint">{t('register.backToLoginHint')}</span>
                <span className="auth-switch-btn__action">{t('register.backToLoginAction')}</span>
              </span>
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
