import { useState } from 'react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { apiClient, ApiError } from '../lib/api'
import type { User } from '../store/userStore'

interface UserEditFormProps {
  user: User
  apiUrl: string
  onSuccess: (updated: User) => void
  onCancel: () => void
}

export function UserEditForm({ user, apiUrl: _apiUrl, onSuccess, onCancel }: UserEditFormProps) {
  const { t } = useI18n()
  const { userId } = useAuthStore()
  const [role, setRole] = useState<User['role']>(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Guardia anti-lockout
  if (user.id === userId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await apiClient.patch<{ user: User }>(`/api/v1/users/${user.id}`, { role, is_active: isActive })
      onSuccess(res.user)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setError(t(`errors.${code}`) ?? code)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-(--color-text-primary)">
        {t('users.actions.edit')}: {user.username}
      </h3>
      {error && <p className="text-xs text-(--color-status-cancelled)">{error}</p>}
      <div>
        <label className="text-xs text-(--color-text-muted) block mb-1">{t('users.form.role')}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as User['role'])}
          className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) focus:outline-none focus:border-(--color-accent)"
        >
          <option value="client">{t('users.roles.client')}</option>
          <option value="agent">{t('users.roles.agent')}</option>
          <option value="admin">{t('users.roles.admin')}</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-(--color-text-secondary)">
          {isActive ? t('users.status.active') : t('users.status.inactive')}
        </span>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={[
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            isActive ? 'bg-(--color-accent)' : 'bg-(--color-border-strong)',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-3 w-3 rounded-full bg-(--color-toggle-knob) transition-transform',
              isActive ? 'translate-x-5' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm text-(--color-text-muted) border border-(--color-border-default) rounded-sm"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 text-sm font-medium bg-(--color-accent) text-(--color-text-on-accent) rounded-sm disabled:opacity-50"
        >
          {isSubmitting ? t('common.loading') : t('users.actions.saveChanges')}
        </button>
      </div>
    </form>
  )
}
