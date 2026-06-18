import { useI18n } from '../i18n'
import type { User } from '../store/userStore'

interface RoleBadgeProps {
  role: User['role']
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const { t } = useI18n()
  return (
    <span className={`badge badge--role-${role}`}>
      {t(`users.roles.${role}`)}
    </span>
  )
}
