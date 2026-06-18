import { useState, type FormEvent } from 'react'
import { Copy, Check, X, Eye, EyeOff } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Spinner } from '../atoms/Spinner'
import { WindowControls } from '../atoms/WindowControls'
import { FadeTransition } from '../atoms/FadeTransition'
import { FormField } from '../molecules/FormField'
import { PasswordField } from '../molecules/PasswordField'
import { StepIndicator } from '../molecules/StepIndicator'
import { useI18n, type Locale } from '../i18n'

interface SetupWizardProps {
  apiUrl: string
  onComplete: (apiKey: string) => void
  onApiKeyReceived?: (apiKey: string) => void
  onClose?: () => void
}

type FieldErrors = Partial<Record<
  'projectName' | 'adminEmail' | 'adminUsername' | 'adminPassword',
  string
>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z0-9_]+$/

export function SetupWizard({ apiUrl, onComplete, onApiKeyReceived, onClose }: SetupWizardProps) {
  const { t, locale, setLocale } = useI18n()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [projectName, setProjectName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [logoData, setLogoData] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleLogoFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) { setApiError('UPLOAD_TOO_LARGE'); return }
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      setApiError('UPLOAD_TYPE_NOT_SUPPORTED'); return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setApiError(null)
      setLogoData(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validateStep1 = (): boolean => {
    const errs: FieldErrors = {}
    if (!projectName.trim()) errs.projectName = 'setup.validation.projectNameRequired'
    setFieldErrors(errs)
    if (errs.projectName) document.getElementById('setup-project-name')?.focus()
    return Object.keys(errs).length === 0
  }

  const validateStep2 = (): boolean => {
    const errs: FieldErrors = {}

    if (!adminEmail.trim()) {
      errs.adminEmail = 'setup.validation.emailRequired'
    } else if (!EMAIL_RE.test(adminEmail)) {
      errs.adminEmail = 'setup.validation.emailInvalid'
    }

    if (!adminUsername.trim()) {
      errs.adminUsername = 'setup.validation.usernameRequired'
    } else if (adminUsername.trim().length < 3) {
      errs.adminUsername = 'setup.validation.usernameTooShort'
    } else if (!USERNAME_RE.test(adminUsername.trim())) {
      errs.adminUsername = 'setup.validation.usernameInvalid'
    }

    if (!adminPassword) {
      errs.adminPassword = 'setup.validation.passwordRequired'
    } else if (adminPassword.length < 8) {
      errs.adminPassword = 'setup.validation.passwordTooShort'
    }

    setFieldErrors(errs)

    if (errs.adminEmail) document.getElementById('setup-admin-email')?.focus()
    else if (errs.adminUsername) document.getElementById('setup-admin-username')?.focus()
    else if (errs.adminPassword) document.getElementById('setup-admin-password')?.focus()

    return Object.keys(errs).length === 0
  }

  const handleStep1Next = (e: FormEvent) => {
    e.preventDefault()
    if (!validateStep1()) return
    setFieldErrors({})
    setStep(2)
  }

  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError(null)
    if (!validateStep2()) return
    setIsLoading(true)

    try {
      const body: Record<string, string> = {
        name: projectName,
        admin_email: adminEmail,
        admin_username: adminUsername,
        admin_password: adminPassword,
        language: locale,
      }
      if (logoData) {
        body.logo_data = logoData
      }

      const res = await fetch(`${apiUrl}/api/v1/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json() as {
        api_key?: string
        error?: { code: string }
      }

      if (!res.ok) {
        setApiError(data?.error?.code ?? 'INTERNAL_ERROR')
        return
      }

      if (data.api_key) {
        setApiKey(data.api_key)
        onApiKeyReceived?.(data.api_key)
        setFieldErrors({})
        setStep(3)
      }
    } catch {
      setApiError('NETWORK_ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="flex flex-col h-full widget-bg">

      {/* Header */}
      <div className="view-header">
        <div className="view-header__accent" />

        <div className="view-header__bar view-header__bar--setup">
          <div className="view-header__row">
            <h2 className="view-header__h2">
              {t('setup.title')}
            </h2>
            <WindowControls />
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="view-header__close"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <StepIndicator current={step} total={3} />
        </div>
      </div>

      {/* Body */}
      <div className="view-body">
        {/* Lang toggle flotante: esquina superior derecha del contenido */}
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
          <FadeTransition transitionKey={step}>

          {/* Step 1 */}
          {step === 1 && (
            <div className="form-body">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-accent) mb-2">
                  {t('setup.step1Title')}
                </p>
                <h3 className="text-lg font-semibold text-(--color-text-primary)">
                  {t('setup.projectName')}
                </h3>
              </div>

              <form onSubmit={handleStep1Next} noValidate className="flex flex-col gap-5">
                <FormField
                  id="setup-project-name"
                  aria-label={t('setup.projectName')}
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value)
                    clearFieldError('projectName')
                  }}
                  placeholder={t('setup.projectNamePlaceholder')}
                  error={fieldErrors.projectName ? t(fieldErrors.projectName) : undefined}
                />

                <div>
                  {logoData ? (
                    <div className="setup-logo-preview">
                      <img src={logoData} alt="Logo preview" className="setup-logo-preview__img" />
                      <button
                        type="button"
                        onClick={() => setLogoData(null)}
                        className="setup-logo-remove"
                      >
                        {t('setup.logoRemove')}
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="setup-logo-file"
                      className={`setup-logo-drop${isDragging ? ' setup-logo-drop--active' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleLogoFile(file)
                      }}
                    >
                      <span className="setup-logo-drop__label">{t('setup.logoUpload')}</span>
                      <span className="setup-logo-drop__hint">{t('setup.logoUploadHint')}</span>
                    </label>
                  )}

                  <input
                    id="setup-logo-file"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoFile(file)
                      e.target.value = ''
                    }}
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  {t('setup.next')}
                </Button>
              </form>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="form-body">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-accent) mb-2">
                  {t('setup.step2Title')}
                </p>
              </div>

              {apiError && (
                <div className="setup-api-error">
                  <span className="shrink-0 pt-px text-sm">
                    &#9888;
                  </span>
                  <p className="m-0">
                    {t(`errors.${apiError}`)}
                  </p>
                </div>
              )}

              <form
                onSubmit={(e) => { void handleStep2Submit(e) }}
                noValidate
                className="flex flex-col gap-5"
              >
                <FormField
                  label={t('setup.adminEmail')}
                  id="setup-admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value)
                    clearFieldError('adminEmail')
                  }}
                  placeholder={t('setup.adminEmailPlaceholder')}
                  disabled={isLoading}
                  error={fieldErrors.adminEmail ? t(fieldErrors.adminEmail) : undefined}
                />
                <FormField
                  label={t('setup.adminUsername')}
                  id="setup-admin-username"
                  type="text"
                  value={adminUsername}
                  onChange={(e) => {
                    setAdminUsername(e.target.value)
                    clearFieldError('adminUsername')
                  }}
                  placeholder={t('setup.adminUsernamePlaceholder')}
                  disabled={isLoading}
                  error={fieldErrors.adminUsername ? t(fieldErrors.adminUsername) : undefined}
                />
                <PasswordField
                  id="setup-admin-password"
                  label={t('setup.adminPassword')}
                  value={adminPassword}
                  onValueChange={(v) => {
                    setAdminPassword(v)
                    clearFieldError('adminPassword')
                  }}
                  placeholder={t('setup.adminPasswordPlaceholder')}
                  disabled={isLoading}
                  withGenerate
                  error={fieldErrors.adminPassword ? t(fieldErrors.adminPassword) : undefined}
                />

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setStep(1); setFieldErrors({}); setApiError(null) }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" label={t('setup.creating')} />
                        {t('setup.creating')}
                      </>
                    ) : (
                      t('setup.create')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="form-body">
              <div className="flex flex-col gap-1.5">
                <p className="label-caps text-(--color-accent) m-0">
                  {t('setup.step3Title')}
                </p>
                <p className="m-0 text-sm leading-relaxed text-(--color-text-secondary)">
                  {t('setup.apiKeyInstruction')}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="pw-label">
                  {t('setup.apiKeyLabel')}
                </span>

                {/* Campo API key */}
                <div className="apikey-field">
                  <div className={['apikey-value', showKey ? 'apikey-value--shown' : 'apikey-value--hidden'].join(' ')}>
                    {showKey ? apiKey : '•'.repeat(32)}
                  </div>

                  {/* Separador */}
                  <div className="pw-sep" />

                  {/* Acciones */}
                  <div className="pw-actions">
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      className="pw-action-btn"
                    >
                      {showKey ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => { void handleCopy() }}
                      aria-label={t('setup.copyApiKey')}
                      className={['pw-action-btn pw-action-btn--copy', copied ? 'pw-action-btn--copied' : ''].filter(Boolean).join(' ')}
                    >
                      {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {copied && (
                  <span className="setup-copied">
                    {t('setup.copied')}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => onComplete(apiKey)}
              >
                {t('setup.openAdmin')}
              </Button>
            </div>
          )}

          </FadeTransition>
        </div>
      </div>
    </div>
  )
}
