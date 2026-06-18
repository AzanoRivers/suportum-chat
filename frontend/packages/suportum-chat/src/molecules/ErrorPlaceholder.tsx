import { AlertCircle } from 'lucide-react'
import { useI18n } from '../i18n'

interface ErrorPlaceholderProps {
  code: string
}

export function ErrorPlaceholder({ code }: ErrorPlaceholderProps) {
  const { t } = useI18n()

  const message = t(`errors.${code}`)
  // If translation key missing, t() returns the key itself - show code directly
  const display = message === `errors.${code}` ? code : message

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-(--color-status-cancelled)">
      <AlertCircle size={32} />
      <p className="text-sm text-center">{display}</p>
    </div>
  )
}
