import { useI18n } from '../i18n'
import { OrderCard } from '../molecules/OrderCard'
import type { Order } from '../store/orderStore'

interface OrdersColumnProps {
  status: Order['status']
  orders: Order[]
  onSelect: (order: Order) => void
}

export function OrdersColumn({ status, orders, onSelect }: OrdersColumnProps) {
  const { t } = useI18n()

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[280px] flex-none snap-start"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-(--color-border-subtle) bg-(--color-bg-surface) flex-none">
        <span className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
          {t(`orders.status.${status}`)}
        </span>
        <span className="text-xs text-(--color-text-muted) bg-(--color-bg-overlay) px-1.5 py-0.5 rounded-sm">
          {orders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => onSelect(order)}
          />
        ))}
        {orders.length === 0 && (
          <p className="text-xs text-(--color-text-muted) text-center py-4">
            {t('orders.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
