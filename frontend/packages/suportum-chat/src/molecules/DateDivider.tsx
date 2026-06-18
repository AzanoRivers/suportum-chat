import { useI18n } from '../i18n'

interface DateDividerProps {
  date: string
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function formatDate(isoDate: string, t: (k: string) => string): string {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) return t('chat.today')
  if (isSameDay(date, yesterday)) return t('chat.yesterday')

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function DateDivider({ date }: DateDividerProps) {
  const { t } = useI18n()
  return (
    <div className="msg-date-divider">
      <div className="msg-date-divider__line" />
      <span className="msg-date-divider__label">{formatDate(date, t)}</span>
      <div className="msg-date-divider__line" />
    </div>
  )
}
