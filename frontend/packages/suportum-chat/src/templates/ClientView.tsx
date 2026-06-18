import { MessageCircle, Tag, Package, User } from 'lucide-react'
import { useTicketStore } from '../store/ticketStore'
import { useI18n } from '../i18n'
import { ChatPanel } from '../organisms/ChatPanel'
import { TicketList } from '../organisms/TicketList'
import { TicketDetail } from '../organisms/TicketDetail'
import { TicketActions } from '../organisms/TicketActions'
import { ClientOrders } from '../organisms/ClientOrders'
import { ProfilePanel } from '../organisms/ProfilePanel'
import { OsShell } from './OsShell'
import type { AppDef } from './OsShell'

interface ClientViewProps {
  apiUrl: string
  apiKey: string
  onClose: () => void
}

const GENERAL_ROOM_ID = 'general'

function TicketClientApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { selectedTicket, selectTicket } = useTicketStore()

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <TicketDetail ticket={selectedTicket} onBack={() => selectTicket(null)} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel
            roomId={`ticket:${selectedTicket.id}`}
            roomName={selectedTicket.title}
            apiUrl={apiUrl}
            apiKey={apiKey}
            onClose={onClose}
            hideHeader
          />
        </div>
        <TicketActions ticket={selectedTicket} role="client" apiUrl={apiUrl} apiKey={apiKey} />
      </div>
    )
  }

  return <TicketList apiUrl={apiUrl} apiKey={apiKey} />
}

function GeneralChatApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <ChatPanel
      roomId={GENERAL_ROOM_ID}
      roomName={t('chat.generalRoom')}
      apiUrl={apiUrl}
      apiKey={apiKey}
      onClose={onClose}
      hideHeader
    />
  )
}

const CLIENT_APPS: AppDef[] = [
  {
    id: 'chat',
    icon: MessageCircle,
    labelKey: 'chat.general',
    color: '#4FC3FF',
    render: (p) => <GeneralChatApp {...p} />,
  },
  {
    id: 'tickets',
    icon: Tag,
    labelKey: 'tickets.title',
    color: '#FFC857',
    render: (p) => <TicketClientApp {...p} />,
  },
  {
    id: 'orders',
    icon: Package,
    labelKey: 'orders.title',
    color: '#00F5B0',
    render: ({ apiUrl, apiKey }) => <ClientOrders apiUrl={apiUrl} apiKey={apiKey} />,
  },
  {
    id: 'profile',
    icon: User,
    labelKey: 'users.profile.title',
    color: '#C084FC',
    render: ({ apiUrl }) => <ProfilePanel apiUrl={apiUrl} />,
  },
]

export function ClientView({ apiUrl, apiKey, onClose }: ClientViewProps) {
  return (
    <OsShell
      apps={CLIENT_APPS}
      apiUrl={apiUrl}
      apiKey={apiKey}
      onClose={onClose}
    />
  )
}
