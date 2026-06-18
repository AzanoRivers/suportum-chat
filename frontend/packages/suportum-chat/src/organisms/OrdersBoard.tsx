import { Maximize2, Minimize2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useOrders } from '../hooks/useOrders'
import { useBoardStore } from '../store/boardStore'
import { OrdersColumn } from './OrdersColumn'
import type { Order } from '../store/orderStore'

const COLUMNS: Order['status'][] = ['pending', 'active', 'taken', 'completed', 'cancelled']

interface OrdersBoardProps {
  apiUrl: string
  apiKey: string
  onSelectOrder: (order: Order) => void
}

export function OrdersBoard({ apiUrl, apiKey, onSelectOrder }: OrdersBoardProps) {
  const { t } = useI18n()
  const { byStatus, isLoading } = useOrders(apiUrl, apiKey)
  const { isExpanded, expand, collapse } = useBoardStore()

  const wrapperClass = isExpanded
    ? 'fixed inset-0 z-50 bg-(--color-bg-base) flex flex-col overflow-hidden'
    : 'flex flex-col h-full overflow-hidden'

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <span className="text-sm font-medium text-(--color-text-primary)">
          {t('orders.board')}
        </span>
        <button
          type="button"
          onClick={isExpanded ? collapse : expand}
          aria-label={isExpanded ? t('accessibility.collapseBoard') : t('accessibility.expandBoard')}
          className={[
            'p-1.5 rounded-sm transition-colors',
            'text-(--color-text-muted) hover:text-(--color-text-primary)',
            'hover:bg-(--color-bg-elevated)',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
          ].join(' ')}
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Columns */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-sm text-(--color-text-muted)">{t('common.loading')}</span>
        </div>
      ) : (
        <div
          className="flex flex-1 overflow-x-auto overflow-y-hidden divide-x divide-(--color-border-subtle) smooth-scroll snap-x-mandatory"
        >
          {COLUMNS.map((status) => (
            <OrdersColumn
              key={status}
              status={status}
              orders={byStatus[status]}
              onSelect={onSelectOrder}
            />
          ))}
        </div>
      )}
    </div>
  )
}
