import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { Avatar } from '../atoms/Avatar'
import { RoleBadge } from '../molecules/RoleBadge'
import { UserEditForm } from './UserEditForm'
import { useUsers } from '../hooks/useUsers'
import type { User } from '../store/userStore'

interface UserDetailProps {
  user: User
  apiUrl: string
  onBack: () => void
  onStartDirectChat?: (roomId: string, roomName: string) => void
}

export function UserDetail({ user, apiUrl, onBack, onStartDirectChat }: UserDetailProps) {
  const { t } = useI18n()
  const { userId } = useAuthStore()
  const { deactivateUser, updateUser } = useUsers(apiUrl)
  const [showEdit, setShowEdit] = useState(false)

  const isCurrentUser = user.id === userId
  const canManage = !isCurrentUser

  const handleDeactivate = async () => {
    await deactivateUser(user.id)
    onBack()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="p-1.5 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated) transition-colors focus-visible:outline-none"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-(--color-text-primary) truncate flex-1">
          {user.username}
        </span>
        <RoleBadge role={user.role} />
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 smooth-scroll"
      >
        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar username={user.username} size="lg" />
          <div className="text-center">
            <p className="text-base font-semibold text-(--color-text-primary)">{user.username}</p>
            <p className="text-sm text-(--color-text-muted)">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
            <span className={`badge ${user.is_active ? 'badge--user-active' : 'badge--user-inactive'}`}>
              {user.is_active ? t('users.status.active') : t('users.status.inactive')}
            </span>
          </div>
        </div>

        {/* Meta info */}
        <div className="bg-(--color-bg-elevated) rounded-sm p-3 space-y-2">
          <div className="flex gap-2">
            <span className="text-xs text-(--color-text-muted) min-w-[80px] font-medium">{t('auth.email')}</span>
            <span className="text-xs text-(--color-text-primary) break-all">{user.email}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-(--color-text-muted) min-w-[80px] font-medium">ID</span>
            <span className="text-xs text-(--color-text-primary) font-mono break-all">{user.id}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-(--color-text-muted) min-w-[80px] font-medium">{t('common.createdAt')}</span>
            <span className="text-xs text-(--color-text-primary)">
              {new Date(user.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2 p-3 border-t border-(--color-border-default) bg-(--color-bg-surface) flex-none">
          {canManage && onStartDirectChat && (
            <button
              type="button"
              onClick={() => {
                const ids = [userId!, user.id].sort()
                onStartDirectChat(`direct:${ids[0]}:${ids[1]}`, user.username)
              }}
              className="flex-1 py-2.5 text-sm font-medium border border-(--color-accent) text-(--color-accent) rounded-sm hover:bg-(--color-accent-dim) transition-colors"
            >
              {t('chat.startDirect')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="flex-1 py-2.5 text-sm font-medium border border-(--color-border-default) text-(--color-text-secondary) rounded-sm hover:border-(--color-accent) hover:text-(--color-accent) transition-colors"
          >
            {t('users.actions.edit')}
          </button>
          {user.is_active && (
            <button
              type="button"
              onClick={() => { void handleDeactivate() }}
              className="flex-1 py-2.5 text-sm font-medium border border-(--color-status-cancelled) text-(--color-status-cancelled) rounded-sm opacity-80 hover:opacity-100 transition-opacity"
            >
              {t('users.actions.deactivate')}
            </button>
          )}
        </div>
      )}

      {/* Edit form overlay */}
      {showEdit && (
        <div className="absolute inset-0 z-50 flex items-end bg-(--color-overlay)">
          <div className="w-full bg-(--color-bg-surface) rounded-t-lg overflow-hidden">
            <UserEditForm
              user={user}
              apiUrl={apiUrl}
              onSuccess={(updated) => {
                void updateUser(updated.id, { role: updated.role, is_active: updated.is_active })
                setShowEdit(false)
              }}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
