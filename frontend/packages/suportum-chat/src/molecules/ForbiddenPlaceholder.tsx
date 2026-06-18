import { ShieldOff } from 'lucide-react'
import { useI18n } from '../i18n'

export function ForbiddenPlaceholder() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-(--color-text-muted)">
      <ShieldOff size={32} />
      <p className="text-sm text-center">{t('errors.FORBIDDEN')}</p>
    </div>
  )
}
