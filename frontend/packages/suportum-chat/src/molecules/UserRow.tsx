import { useI18n } from '../i18n'
import { Avatar } from '../atoms/Avatar'
import { RoleBadge } from './RoleBadge'
import { UserActions } from './UserActions'
import type { User } from '../store/userStore'

interface UserRowProps {
  user: User
  onClick: () => void
  onEdit: () => void
  onDeactivate: () => void
  isCurrentUser: boolean
  isAdmin: boolean
}

export function UserRow({ user, onClick, onEdit, onDeactivate, isCurrentUser, isAdmin }: UserRowProps) {
  const { t } = useI18n()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className={[
        'flex items-center gap-3 px-3 py-2 min-h-14 cursor-pointer',
        'border-b border-(--color-border-subtle) hover:bg-(--color-bg-elevated) transition-colors',
        !user.is_active ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Avatar username={user.username} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-(--color-text-primary) truncate">{user.username}</span>
          <RoleBadge role={user.role} />
        </div>
        <span className="text-xs text-(--color-text-muted) truncate block">{user.email}</span>
      </div>
      <div className="flex items-center gap-2 flex-none">
        <span className="text-xs text-(--color-text-muted)">
          {user.is_active ? t('users.status.active') : t('users.status.inactive')}
        </span>
        {isAdmin && !isCurrentUser && (
          <UserActions onEdit={onEdit} onDeactivate={onDeactivate} isActive={user.is_active} />
        )}
      </div>
    </div>
  )
}
