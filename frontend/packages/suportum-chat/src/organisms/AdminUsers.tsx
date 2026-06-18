import { useState, useMemo } from 'react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { UserRow } from '../molecules/UserRow'
import { UserCreateForm } from './UserCreateForm'
import { UserEditForm } from './UserEditForm'
import { useUsers } from '../hooks/useUsers'
import { useUserStore } from '../store/userStore'
import type { User } from '../store/userStore'

type RoleFilter = 'all' | User['role']
type StatusFilter = 'all' | 'active' | 'inactive'

interface AdminUsersProps {
  apiUrl: string
  apiKey: string
}

const ROLE_FILTERS: RoleFilter[] = ['all', 'client', 'agent', 'admin']
const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'inactive']

export function AdminUsers({ apiUrl, apiKey: _apiKey }: AdminUsersProps) {
  const { t } = useI18n()
  const { userId } = useAuthStore()
  const { selectUser } = useUserStore()
  const { users, isLoading, updateUser, deactivateUser } = useUsers(apiUrl)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false
      return true
    })
  }, [users, roleFilter, statusFilter])

  const getRoleLabel = (f: RoleFilter): string => {
    if (f === 'all') return t('common.all')
    return t(`users.roles.${f}`)
  }

  const getStatusLabel = (f: StatusFilter): string => {
    if (f === 'all') return t('common.all')
    if (f === 'active') return t('users.status.active')
    return t('users.status.inactive')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-(--color-border-default) flex-none">
        <span className="text-sm font-medium text-(--color-text-primary)">{t('users.title')}</span>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-xs px-3 py-1.5 bg-(--color-accent) text-(--color-text-on-accent) rounded-sm font-medium"
        >
          + {t('users.invite')}
        </button>
      </div>

      {/* Filtros de rol */}
      <div
        className="flex gap-1 px-3 py-2 border-b border-(--color-border-subtle) flex-none overflow-x-auto smooth-scroll"
      >
        {ROLE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setRoleFilter(f)}
            className={[
              'px-2 py-1 text-xs rounded-sm border flex-none transition-colors',
              roleFilter === f
                ? 'border-(--color-accent) text-(--color-accent)'
                : 'border-(--color-border-default) text-(--color-text-muted)',
            ].join(' ')}
          >
            {getRoleLabel(f)}
          </button>
        ))}
        <span className="w-px bg-(--color-border-subtle) mx-1 flex-none" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={`status-${f}`}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={[
              'px-2 py-1 text-xs rounded-sm border flex-none transition-colors',
              statusFilter === f
                ? 'border-(--color-accent) text-(--color-accent)'
                : 'border-(--color-border-default) text-(--color-text-muted)',
            ].join(' ')}
          >
            {getStatusLabel(f)}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div
        className="flex-1 overflow-y-auto smooth-scroll"
      >
        {isLoading ? (
          <p className="text-xs text-(--color-text-muted) text-center py-8">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-(--color-text-muted) text-center py-8">{t('users.empty')}</p>
        ) : (
          filtered.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onClick={() => selectUser(u)}
              onEdit={() => setEditingUser(u)}
              onDeactivate={() => { void deactivateUser(u.id) }}
              isCurrentUser={u.id === userId}
              isAdmin
            />
          ))
        )}
      </div>

      {/* Modal crear usuario */}
      {showCreate && (
        <div className="absolute inset-0 z-50 flex items-end bg-(--color-overlay)">
          <div
            className="w-full bg-(--color-bg-surface) rounded-t-lg overflow-hidden smooth-scroll"
          >
            <UserCreateForm
              apiUrl={apiUrl}
              onSuccess={() => { setShowCreate(false) }}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        </div>
      )}

      {/* Modal editar usuario */}
      {editingUser && (
        <div className="absolute inset-0 z-50 flex items-end bg-(--color-overlay)">
          <div className="w-full bg-(--color-bg-surface) rounded-t-lg overflow-hidden">
            <UserEditForm
              user={editingUser}
              apiUrl={apiUrl}
              onSuccess={(updated) => {
                void updateUser(editingUser.id, { role: updated.role, is_active: updated.is_active })
                setEditingUser(null)
              }}
              onCancel={() => setEditingUser(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
