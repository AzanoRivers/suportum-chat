import { Spinner } from '../atoms/Spinner'
import { ProjectLogo } from '../atoms/ProjectLogo'
import { useI18n } from '../i18n'
import { useProjectBrandingPublic } from '../hooks/useProjectBrandingPublic'

interface LoadingScreenProps {
  label?: string
  apiUrl?: string
}

export function LoadingScreen({ label, apiUrl }: LoadingScreenProps) {
  const { t } = useI18n()
  const spinnerLabel = label ?? t('auth.verifyingSession')
  const { logoUrl } = useProjectBrandingPublic(apiUrl ?? '')

  return (
    <div className="flex flex-col items-center justify-center h-full bg-(--color-bg-surface) gap-4">
      <div className="login-logo-wrap">
        <ProjectLogo src={apiUrl ? logoUrl : null} size="md" />
      </div>
      <Spinner size="lg" label={spinnerLabel} />
      <p className="text-sm text-(--color-text-muted)">{spinnerLabel}</p>
    </div>
  )
}
