import { useI18n } from '../i18n'
import { Badge } from '../atoms/Badge'
import type { Ticket } from '../store/ticketStore'

interface TicketRowProps {
  ticket: Ticket
  onClick: () => void
}

const priorityClasses: Record<Ticket['priority'], string> = {
  low: 'text-(--color-text-muted)',
  normal: 'text-(--color-text-secondary)',
  high: 'text-(--color-status-pending)',
  urgent: 'text-(--color-status-cancelled)',
}

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return t('common.timeAgo.justNow')
  if (diff < 3600) return t('common.timeAgo.minutes').replace('{n}', String(Math.floor(diff / 60)))
  if (diff < 86400) return t('common.timeAgo.hours').replace('{n}', String(Math.floor(diff / 3600)))
  return t('common.timeAgo.days').replace('{n}', String(Math.floor(diff / 86400)))
}

export function TicketRow({ ticket, onClick }: TicketRowProps) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left p-3 min-h-14',
        'flex flex-col gap-1',
        'border-b border-(--color-border-subtle)',
        'hover:bg-(--color-bg-elevated) transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
      ].join(' ')}
    >
      {/* Row 1: status badge + title */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <Badge status={ticket.status} label={t(`tickets.status.${ticket.status}`)} />
        <span className="flex-1 text-sm font-medium text-(--color-text-primary) truncate">
          {ticket.title}
        </span>
      </div>

      {/* Row 2: client, agent, priority */}
      <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
        <span className="truncate max-w-20">{ticket.client_username}</span>
        <span className="truncate max-w-20">{ticket.agent_username ?? '-'}</span>
        <span className={['ml-auto flex-none text-xs font-medium', priorityClasses[ticket.priority]].join(' ')}>
          {t(`tickets.priority.${ticket.priority}`)}
        </span>
      </div>

      {/* Row 3: relative time */}
      <span className="text-xs text-(--color-text-muted)">
        {relativeTime(ticket.updated_at, t)}
      </span>
    </button>
  )
}
