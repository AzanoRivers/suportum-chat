import { useState } from 'react'
import { useI18n } from '../i18n'
import { useUsers } from '../hooks/useUsers'
import { ApiError } from '../lib/api'
import type { User } from '../store/userStore'

interface UserCreateFormProps {
  apiUrl: string
  onSuccess: () => void
  onCancel: () => void
}

export function UserCreateForm({ apiUrl, onSuccess, onCancel }: UserCreateFormProps) {
  const { t } = useI18n()
  const { createUser } = useUsers(apiUrl)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<User['role']>('client')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await createUser({ email, username, password, role })
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setError(t(`errors.${code}`) ?? code)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-(--color-text-primary)">{t('users.invite')}</h3>
      {error && <p className="text-xs text-(--color-status-cancelled)">{error}</p>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('users.form.email')}
        required
        className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
      />
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t('users.form.username')}
        required
        minLength={3}
        maxLength={30}
        className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('users.form.password')}
        required
        minLength={8}
        className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as User['role'])}
        className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) focus:outline-none focus:border-(--color-accent)"
      >
        <option value="client">{t('users.roles.client')}</option>
        <option value="agent">{t('users.roles.agent')}</option>
        <option value="admin">{t('users.roles.admin')}</option>
      </select>
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
          {isSubmitting ? t('common.loading') : t('users.form.submit')}
        </button>
      </div>
    </form>
  )
}
