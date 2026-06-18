import { useI18n } from '../i18n'
import { Avatar } from '../atoms/Avatar'
import type { Order } from '../store/orderStore'

const _STATUS_COLOR: Record<Order['status'], string> = {
  pending:   'var(--color-status-pending)',
  active:    'var(--color-status-active)',
  taken:     'var(--color-status-taken)',
  completed: 'var(--color-status-completed)',
  cancelled: 'var(--color-status-cancelled)',
}

interface OrderCardProps {
  order: Order
  onClick: () => void
}

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return t('common.timeAgo.justNow')
  if (diff < 3600) return t('common.timeAgo.minutes').replace('{n}', String(Math.floor(diff / 60)))
  if (diff < 86400) return t('common.timeAgo.hours').replace('{n}', String(Math.floor(diff / 3600)))
  return t('common.timeAgo.days').replace('{n}', String(Math.floor(diff / 86400)))
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const { t } = useI18n()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className={[
        'cursor-pointer bg-(--color-bg-elevated) border border-(--color-border-default)',
        'p-3 rounded-sm hover:border-(--color-border-strong) transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-(--color-text-muted) truncate">
          {order.type.toUpperCase()}
        </span>
        <span className="text-xs text-(--color-text-muted) flex-none">
          {relativeTime(order.updated_at, t)}
        </span>
      </div>

      <p className="text-sm text-(--color-text-primary) mt-1 font-medium line-clamp-2">
        {order.title}
      </p>

      <div className="flex items-center gap-2 mt-2">
        <Avatar username={order.client_name} size="sm" />
        <span className="text-xs text-(--color-text-secondary) truncate">{order.client_name}</span>
        {order.agent_name && (
          <>
            <span className="text-(--color-text-muted) text-xs flex-none">{'→'}</span>
            <span className="text-xs text-(--color-accent) truncate">{order.agent_name}</span>
          </>
        )}
      </div>

      <div className="mt-2">
        <span className={`badge badge--${order.status}`}>
          {t(`orders.status.${order.status}`)}
        </span>
      </div>
    </div>
  )
}
