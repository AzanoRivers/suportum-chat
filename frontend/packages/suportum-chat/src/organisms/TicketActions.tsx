import { useI18n } from '../i18n'
import { Button } from '../atoms/Button'
import { useTickets } from '../hooks/useTickets'
import type { Ticket } from '../store/ticketStore'

interface TicketActionsProps {
  ticket: Ticket
  role: 'client' | 'agent' | 'admin'
  apiUrl: string
  apiKey: string
}

type TicketStatus = Ticket['status']

const statusTransitions: Record<
  'client' | 'agent' | 'admin',
  (ticket: Ticket) => TicketStatus[]
> = {
  client: (t) => (t.status === 'resolved' ? ['closed'] : []),
  agent: (t) =>
    (({ open: ['in_progress'], in_progress: ['resolved'] } as Partial<Record<TicketStatus, TicketStatus[]>>)[t.status] ?? []),
  admin: (t) =>
    (({
      open: ['in_progress', 'closed'],
      in_progress: ['resolved', 'closed'],
      resolved: ['closed'],
    } as Partial<Record<TicketStatus, TicketStatus[]>>)[t.status] ?? []),
}

const statusActionKey: Partial<Record<TicketStatus, string>> = {
  in_progress: 'tickets.actions.start',
  resolved: 'tickets.actions.resolve',
  closed: 'tickets.actions.close',
}

function canAssign(ticket: Ticket, role: 'client' | 'agent' | 'admin'): boolean {
  if (role === 'client') return false
  return !ticket.agent_id || ticket.status === 'open'
}

export function TicketActions({ ticket, role, apiUrl, apiKey }: TicketActionsProps) {
  const { t } = useI18n()
  const { updateTicketStatus, assignTicket } = useTickets(apiUrl, apiKey)

  const transitions = statusTransitions[role](ticket)
  const showAssign = canAssign(ticket, role)

  if (transitions.length === 0 && !showAssign) return null

  return (
    <div className="flex flex-wrap gap-2 p-3 border-t border-(--color-border-default) bg-(--color-bg-surface) flex-none">
      {showAssign && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void assignTicket(ticket.id)}
        >
          {t('tickets.actions.assign')}
        </Button>
      )}

      {transitions.map((status) => {
        const labelKey = statusActionKey[status]
        if (!labelKey) return null
        return (
          <Button
            key={status}
            variant={status === 'closed' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => void updateTicketStatus(ticket.id, status)}
          >
            {t(labelKey)}
          </Button>
        )
      })}
    </div>
  )
}
