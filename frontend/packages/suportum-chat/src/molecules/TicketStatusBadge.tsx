import { Badge } from '../atoms/Badge'
import { useI18n } from '../i18n'
import type { Ticket } from '../store/ticketStore'

interface TicketStatusBadgeProps {
  status: Ticket['status']
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const { t } = useI18n()
  return <Badge status={status} label={t(`tickets.status.${status}`)} />
}
