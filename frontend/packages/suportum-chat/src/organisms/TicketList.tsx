import { useState } from 'react'
import { Plus, Ticket as TicketIcon } from 'lucide-react'
import { useI18n } from '../i18n'
import { Spinner } from '../atoms/Spinner'
import { TicketRow } from '../molecules/TicketRow'
import { TicketCreateForm } from '../molecules/TicketCreateForm'
import { useTickets } from '../hooks/useTickets'
import type { Ticket } from '../store/ticketStore'

interface TicketListProps {
  apiUrl: string
  apiKey: string
}

const ALL_STATUSES: Ticket['status'][] = ['open', 'in_progress', 'resolved', 'closed']

export function TicketList({ apiUrl, apiKey }: TicketListProps) {
  const { t } = useI18n()
  const { tickets, isLoading, selectTicket } = useTickets(apiUrl, apiKey)

  const [showForm, setShowForm] = useState(false)
  const [activeStatuses, setActiveStatuses] = useState<Ticket['status'][]>(['open'])

  const toggleStatus = (status: Ticket['status']) => {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    )
  }

  const filtered =
    activeStatuses.length === 0
      ? tickets
      : tickets.filter((t) => activeStatuses.includes(t.status))

  return (
    <div className="flex flex-col h-full bg-(--color-bg-base) overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-(--color-bg-surface) border-b border-(--color-border-default) flex-none">
        <span className="text-sm font-semibold text-(--color-text-primary)">
          {t('tickets.title')}
        </span>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-label={t('tickets.newTicket')}
          className={[
            'flex items-center gap-1 px-2 py-1 rounded-(--radius-md) text-xs font-medium transition-all',
            'min-h-8',
            showForm
              ? 'bg-(--color-accent) text-(--color-bg-base)'
              : 'bg-(--color-bg-elevated) text-(--color-text-primary) border border-(--color-border-default) hover:border-(--color-accent)',
          ].join(' ')}
        >
          <Plus size={14} />
          {t('tickets.newTicket')}
        </button>
      </div>

      {/* Create form (inline) */}
      {showForm && (
        <TicketCreateForm
          apiUrl={apiUrl}
          apiKey={apiKey}
          onCreated={() => setShowForm(false)}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Status filter */}
      <div className="flex gap-1 px-3 py-2 bg-(--color-bg-surface) border-b border-(--color-border-subtle) flex-none flex-wrap">
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatus(status)}
            className={[
              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
              activeStatuses.includes(status)
                ? 'bg-(--color-accent) text-(--color-bg-base)'
                : 'bg-(--color-bg-elevated) text-(--color-text-muted) border border-(--color-border-default)',
            ].join(' ')}
          >
            {t(`tickets.status.${status}`)}
          </button>
        ))}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto smooth-scroll"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-(--color-text-muted)">
            <TicketIcon size={32} strokeWidth={1.5} />
            <span className="text-sm">{t('tickets.empty')}</span>
          </div>
        )}

        {!isLoading &&
          filtered.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onClick={() => selectTicket(ticket)}
            />
          ))}
      </div>
    </div>
  )
}
