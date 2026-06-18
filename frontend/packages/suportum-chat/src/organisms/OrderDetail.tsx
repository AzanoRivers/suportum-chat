import { ChevronLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button } from '../atoms/Button'
import { Avatar } from '../atoms/Avatar'
import { OrderStatusBadge } from '../molecules/OrderStatusBadge'
import { useOrders } from '../hooks/useOrders'
import type { Order } from '../store/orderStore'

type OrderStatus = Order['status']
type UserRole = 'client' | 'agent' | 'admin'

interface OrderDetailProps {
  order: Order
  role: UserRole
  apiUrl: string
  apiKey: string
  onBack: () => void
}

const TRANSITIONS: Record<UserRole, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  agent: {
    pending: ['active'],
    active: ['taken'],
    taken: ['completed', 'cancelled'],
  },
  admin: {
    pending: ['active', 'cancelled'],
    active: ['taken', 'cancelled'],
    taken: ['completed', 'cancelled'],
  },
  client: {
    pending: ['cancelled'],
  },
}

const actionKeyForStatus: Partial<Record<OrderStatus, string>> = {
  active: 'orders.actions.markActive',
  taken: 'orders.actions.takeOrder',
  completed: 'orders.actions.complete',
  cancelled: 'orders.actions.cancel',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderDetail({ order, role, apiUrl, apiKey, onBack }: OrderDetailProps) {
  const { t } = useI18n()
  const { updateOrderStatus } = useOrders(apiUrl, apiKey)

  const transitions = TRANSITIONS[role][order.status] ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className={[
            'p-1.5 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary)',
            'hover:bg-(--color-bg-elevated) transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
          ].join(' ')}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-(--color-text-primary) truncate flex-1">
          {order.title}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
          <span className="font-mono bg-(--color-bg-elevated) px-2 py-0.5 rounded-sm">
            {order.type.toUpperCase()}
          </span>
          <span>{formatDate(order.created_at)}</span>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2">
          <Avatar username={order.client_name} size="sm" />
          <span className="text-sm text-(--color-text-secondary)">{order.client_name}</span>
          {order.agent_name && (
            <>
              <span className="text-(--color-text-muted) text-xs">{'→'}</span>
              <span className="text-sm text-(--color-accent)">{order.agent_name}</span>
            </>
          )}
        </div>

        {/* Details */}
        {Object.keys(order.details).length > 0 && (
          <div className="bg-(--color-bg-elevated) rounded-sm p-3 space-y-2">
            {Object.entries(order.details).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-xs text-(--color-text-muted) min-w-[80px] font-medium">
                  {key}
                </span>
                <span className="text-xs text-(--color-text-primary) break-words">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-t border-(--color-border-default) bg-(--color-bg-surface) flex-none">
          {transitions.map((status) => {
            const labelKey = actionKeyForStatus[status]
            if (!labelKey) return null
            return (
              <Button
                key={status}
                variant={status === 'cancelled' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => void updateOrderStatus(order.id, status)}
              >
                {t(labelKey)}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
