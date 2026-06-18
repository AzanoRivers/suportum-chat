import { useState } from 'react'
import { MessageCircle, MessageSquare, Tag, Package, User, ChevronLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { useTicketStore } from '../store/ticketStore'
import { useOrderStore } from '../store/orderStore'
import { ChatPanel } from '../organisms/ChatPanel'
import { DirectChatList } from '../organisms/DirectChatList'
import { TicketList } from '../organisms/TicketList'
import { TicketDetail } from '../organisms/TicketDetail'
import { TicketActions } from '../organisms/TicketActions'
import { OrdersBoard } from '../organisms/OrdersBoard'
import { OrderDetail } from '../organisms/OrderDetail'
import { ProfilePanel } from '../organisms/ProfilePanel'
import { OsShell } from './OsShell'
import type { AppDef, AppRenderProps } from '../organisms/AppLauncher'

interface AgentViewProps {
  apiUrl: string
  apiKey: string
  onClose: () => void
}

const GENERAL_ROOM_ID = 'general'

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

function TicketAgentApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { role } = useAuthStore()
  const { selectedTicket, selectTicket } = useTicketStore()
  const safeRole = (role === 'agent' || role === 'admin') ? role : 'agent'

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
        <TicketActions ticket={selectedTicket} role={safeRole} apiUrl={apiUrl} apiKey={apiKey} />
      </div>
    )
  }

  return <TicketList apiUrl={apiUrl} apiKey={apiKey} />
}

function OrderAgentApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { role } = useAuthStore()
  const { selectedOrder, selectOrder } = useOrderStore()
  const safeRole = (role === 'agent' || role === 'admin') ? role : 'agent'

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        role={safeRole}
        apiUrl={apiUrl}
        apiKey={apiKey}
        onBack={() => selectOrder(null)}
      />
    )
  }

  return <OrdersBoard apiUrl={apiUrl} apiKey={apiKey} onSelectOrder={selectOrder} />
}

function DirectApp({ apiUrl, apiKey, onClose, initialState }: AppRenderProps) {
  const { t } = useI18n()
  const initial = initialState as { id: string; name: string } | null | undefined
  const [directRoom, setDirectRoom] = useState<{ id: string; name: string } | null>(initial ?? null)

  if (directRoom) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="direct-subheader">
          <button
            type="button"
            onClick={() => setDirectRoom(null)}
            aria-label={t('common.back')}
            className="chat-header__btn chat-header__btn--back"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <span className="direct-subheader__title">
            {directRoom.name}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel
            roomId={directRoom.id}
            roomName={directRoom.name}
            apiUrl={apiUrl}
            apiKey={apiKey}
            onClose={onClose}
            hideHeader
          />
        </div>
      </div>
    )
  }

  return (
    <DirectChatList
      apiKey={apiKey}
      onSelectRoom={(id, name) => setDirectRoom({ id, name })}
    />
  )
}

const AGENT_APPS: AppDef[] = [
  {
    id: 'chat',
    icon: MessageCircle,
    labelKey: 'chat.general',
    color: '#4FC3FF',
    render: (p) => <GeneralChatApp {...p} />,
  },
  {
    id: 'direct',
    icon: MessageSquare,
    labelKey: 'chat.direct',
    color: '#A78BFA',
    render: (p) => <DirectApp {...p} />,
  },
  {
    id: 'tickets',
    icon: Tag,
    labelKey: 'tickets.title',
    color: '#FFC857',
    render: (p) => <TicketAgentApp {...p} />,
  },
  {
    id: 'orders',
    icon: Package,
    labelKey: 'orders.title',
    color: '#00F5B0',
    render: (p) => <OrderAgentApp {...p} />,
  },
  {
    id: 'profile',
    icon: User,
    labelKey: 'users.profile.title',
    color: '#C084FC',
    render: ({ apiUrl }) => <ProfilePanel apiUrl={apiUrl} />,
  },
]

export function AgentView({ apiUrl, apiKey, onClose }: AgentViewProps) {
  return (
    <OsShell
      apps={AGENT_APPS}
      apiUrl={apiUrl}
      apiKey={apiKey}
      onClose={onClose}
    />
  )
}
