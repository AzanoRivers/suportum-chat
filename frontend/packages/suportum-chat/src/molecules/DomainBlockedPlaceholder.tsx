import { ShieldAlert } from 'lucide-react'
import { useI18n } from '../i18n'

export function DomainBlockedPlaceholder() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-6 text-(--color-status-cancelled)">
      <ShieldAlert size={40} />
      <p className="text-base font-medium">{t('errors.domainMismatchTitle')}</p>
      <p className="text-sm text-(--color-text-secondary)">{t('errors.domainMismatchBody')}</p>
    </div>
  )
}
