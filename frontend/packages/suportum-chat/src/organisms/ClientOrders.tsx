import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '../i18n'
import { Avatar } from '../atoms/Avatar'
import { OrderStatusBadge } from '../molecules/OrderStatusBadge'
import { OrderCreateForm } from './OrderCreateForm'
import { useOrders } from '../hooks/useOrders'

interface ClientOrdersProps {
  apiUrl: string
  apiKey: string
}

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return t('common.timeAgo.justNow')
  if (diff < 3600) return t('common.timeAgo.minutes').replace('{n}', String(Math.floor(diff / 60)))
  if (diff < 86400) return t('common.timeAgo.hours').replace('{n}', String(Math.floor(diff / 3600)))
  return t('common.timeAgo.days').replace('{n}', String(Math.floor(diff / 86400)))
}

export function ClientOrders({ apiUrl, apiKey }: ClientOrdersProps) {
  const { t } = useI18n()
  const { orders, isLoading, fetchOrders } = useOrders(apiUrl, apiKey)
  const [showForm, setShowForm] = useState(false)

  const handleCreated = () => {
    setShowForm(false)
    void fetchOrders(apiUrl)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <span className="text-sm font-medium text-(--color-text-primary)">
          {t('orders.myOrders')}
        </span>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-label={t('orders.newOrder')}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm',
            'bg-(--color-accent) text-(--color-bg-base) hover:bg-(--color-accent-hover)',
            'transition-colors font-medium',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
          ].join(' ')}
        >
          <Plus size={14} />
          {t('orders.newOrder')}
        </button>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-(--color-text-muted)">{t('common.loading')}</span>
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-(--color-text-muted) text-center py-8">
            {t('orders.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-(--color-border-subtle)">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-start gap-3 p-3 hover:bg-(--color-bg-elevated) transition-colors"
              >
                <Avatar username={order.client_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-(--color-text-primary) truncate">
                    {order.title}
                  </p>
                  <p className="text-xs text-(--color-text-muted) font-mono mt-0.5">
                    {order.type.toUpperCase()}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs text-(--color-text-muted)">
                      {relativeTime(order.updated_at, t)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <OrderCreateForm
          apiUrl={apiUrl}
          apiKey={apiKey}
          onCreated={handleCreated}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
