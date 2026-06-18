import { useI18n } from '../i18n'
import type { Ticket } from '../store/ticketStore'

interface PriorityBadgeProps {
  priority: Ticket['priority']
}

const priorityClasses: Record<Ticket['priority'], string> = {
  low: 'text-(--color-text-muted)',
  normal: 'text-(--color-text-secondary)',
  high: 'text-(--color-status-pending)',
  urgent: 'text-(--color-status-cancelled)',
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { t } = useI18n()
  return (
    <span className={['text-xs font-medium', priorityClasses[priority]].join(' ')}>
      {t(`tickets.priority.${priority}`)}
    </span>
  )
}
