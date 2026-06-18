import { useI18n } from '../i18n'
import type { Order } from '../store/orderStore'

interface OrderStatusBadgeProps {
  status: Order['status']
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useI18n()

  return (
    <span className={`badge badge--${status}`}>
      {t(`orders.status.${status}`)}
    </span>
  )
}
