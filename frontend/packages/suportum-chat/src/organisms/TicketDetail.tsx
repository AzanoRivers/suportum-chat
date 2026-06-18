import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { TicketStatusBadge } from '../molecules/TicketStatusBadge'
import { PriorityBadge } from '../molecules/PriorityBadge'
import type { Ticket } from '../store/ticketStore'

interface TicketDetailProps {
  ticket: Ticket
  onBack: () => void
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function TicketDetail({ ticket, onBack }: TicketDetailProps) {
  const { t, locale } = useI18n()

  const agentLabel = ticket.agent_username ?? t('tickets.unassigned')

  return (
    <div className="flex-none bg-(--color-bg-surface) border-b border-(--color-border-default)">
      {/* Back row */}
      <div className="flex items-center gap-2 px-1 py-1 border-b border-(--color-border-subtle)">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex items-center gap-1 min-h-9 px-2 rounded-(--radius-md) text-xs text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated) transition-all"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </button>

        <div className="flex items-center gap-2 ml-1 flex-1 min-w-0">
          <TicketStatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {/* Compact ticket info */}
      <div className="px-3 py-2 text-xs text-(--color-text-muted) flex flex-col gap-0.5">
        <div className="flex gap-4">
          <span>
            <span className="text-(--color-text-secondary)">{t('tickets.clientLabel')}:</span>{' '}
            {ticket.client_username}
          </span>
          <span>
            <span className="text-(--color-text-secondary)">{t('tickets.agentLabel')}:</span>{' '}
            {agentLabel}
          </span>
        </div>
        {ticket.description && (
          <p className="text-(--color-text-muted) mt-1 line-clamp-2">{ticket.description}</p>
        )}
        <span className="text-(--color-text-muted) opacity-70 mt-0.5">
          {formatDate(ticket.created_at, locale)}
        </span>
      </div>
    </div>
  )
}
