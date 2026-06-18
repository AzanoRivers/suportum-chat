import { useState } from 'react'
import { MessageCircle, MessageSquare, Tag, Package, Users, Settings, ChevronLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { useTicketStore } from '../store/ticketStore'
import { useOrderStore } from '../store/orderStore'
import { useUserStore } from '../store/userStore'
import { ChatPanel } from '../organisms/ChatPanel'
import { DirectChatList } from '../organisms/DirectChatList'
import { TicketList } from '../organisms/TicketList'
import { TicketDetail } from '../organisms/TicketDetail'
import { TicketActions } from '../organisms/TicketActions'
import { OrdersBoard } from '../organisms/OrdersBoard'
import { OrderDetail } from '../organisms/OrderDetail'
import { AdminUsers } from '../organisms/AdminUsers'
import { UserDetail } from '../organisms/UserDetail'
import { AdminSettings } from '../organisms/AdminSettings'
import { OsShell } from './OsShell'
import type { AppDef, AppRenderProps } from '../organisms/AppLauncher'

interface AdminViewProps {
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

function TicketAdminApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { role } = useAuthStore()
  const { selectedTicket, selectTicket } = useTicketStore()
  const safeRole = role === 'admin' ? 'admin' : 'agent'

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

function OrderAdminApp({ apiUrl, apiKey, onClose }: { apiUrl: string; apiKey: string; onClose: () => void }) {
  const { role } = useAuthStore()
  const { selectedOrder, selectOrder } = useOrderStore()
  const safeRole = role === 'admin' ? 'admin' : 'agent'

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

function UsersAdminApp({ apiUrl, apiKey, onNavigateTo }: AppRenderProps) {
  const { selectedUser, selectUser } = useUserStore()

  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
        apiUrl={apiUrl}
        onBack={() => selectUser(null)}
        onStartDirectChat={(roomId, roomName) => {
          selectUser(null)
          onNavigateTo?.('direct', { id: roomId, name: roomName })
        }}
      />
    )
  }

  return <AdminUsers apiUrl={apiUrl} apiKey={apiKey} />
}

const ADMIN_APPS: AppDef[] = [
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
    render: (p) => <TicketAdminApp {...p} />,
  },
  {
    id: 'orders',
    icon: Package,
    labelKey: 'orders.title',
    color: '#00F5B0',
    render: (p) => <OrderAdminApp {...p} />,
  },
  {
    id: 'users',
    icon: Users,
    labelKey: 'users.title',
    color: '#38BDF8',
    render: (p) => <UsersAdminApp {...p} />,
  },
  {
    id: 'settings',
    icon: Settings,
    labelKey: 'settings.tab',
    color: '#94A3B8',
    render: ({ apiUrl }) => <AdminSettings apiUrl={apiUrl} />,
  },
]

export function AdminView({ apiUrl, apiKey, onClose }: AdminViewProps) {
  return (
    <OsShell
      apps={ADMIN_APPS}
      apiUrl={apiUrl}
      apiKey={apiKey}
      onClose={onClose}
    />
  )
}
