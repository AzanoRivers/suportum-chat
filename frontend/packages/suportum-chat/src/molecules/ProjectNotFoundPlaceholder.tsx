import { PackageSearch } from 'lucide-react'
import { useI18n } from '../i18n'

export function ProjectNotFoundPlaceholder() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full px-6 text-(--color-text-secondary)">
      <PackageSearch size={40} className="text-(--color-accent)" />
      <p className="text-lg font-semibold text-(--color-text-primary) text-center">{t('errors.projectNotFoundTitle')}</p>
      <div className="w-full max-w-sm flex flex-col gap-2 text-left bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm p-4">
        <p className="text-sm">{t('errors.projectNotFoundBody1')}</p>
        <p className="text-sm">{t('errors.projectNotFoundBody2')}</p>
        <p className="text-sm">{t('errors.projectNotFoundBody3')}</p>
      </div>
    </div>
  )
}
