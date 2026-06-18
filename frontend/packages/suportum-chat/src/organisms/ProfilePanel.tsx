import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { apiClient, ApiError } from '../lib/api'
import { Avatar } from '../atoms/Avatar'
import { RoleBadge } from '../molecules/RoleBadge'
import type { User } from '../store/userStore'

interface ProfilePanelProps {
  apiUrl: string
}

export function ProfilePanel({ apiUrl: _apiUrl }: ProfilePanelProps) {
  const { t } = useI18n()
  const { userId } = useAuthStore()

  const [profile, setProfile] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Username change state
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [usernameSaved, setUsernameSaved] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  useEffect(() => {
    if (!userId) return
    setIsLoadingProfile(true)
    apiClient
      .get<{ user: User }>(`/api/v1/users/${userId}`)
      .then((res) => {
        setProfile(res.user)
        setNewUsername(res.user.username)
      })
      .catch(() => {
        // silently ignore; show empty state
      })
      .finally(() => {
        setIsLoadingProfile(false)
      })
  }, [userId])

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setUsernameError(null)
    setUsernameSaved(false)
    setIsSavingUsername(true)
    try {
      const res = await apiClient.patch<{ user: User }>(`/api/v1/users/${profile.id}`, {
        username: newUsername,
      })
      setProfile(res.user)
      setNewUsername(res.user.username)
      setUsernameSaved(true)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setUsernameError(t(`errors.${code}`) ?? code)
    } finally {
      setIsSavingUsername(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('errors.VALIDATION_ERROR'))
      return
    }

    if (newPassword.length < 8) {
      setPasswordError(t('errors.VALIDATION_ERROR'))
      return
    }

    setIsSavingPassword(true)
    try {
      await apiClient.patch<{ user: User }>(`/api/v1/users/${profile.id}`, {
        password: newPassword,
      })
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'
      setPasswordError(t(`errors.${code}`) ?? code)
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-(--color-text-muted)">{t('common.loading')}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-(--color-text-muted)">{t('errors.USER_NOT_FOUND')}</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto smooth-scroll"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-(--color-border-default) bg-(--color-bg-surface) flex-none">
        <span className="text-sm font-medium text-(--color-text-primary)">{t('users.profile.title')}</span>
      </div>

      <div className="p-4 space-y-6">
        {/* Info section */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Avatar username={profile.username} size="lg" />
          <div className="text-center">
            <p className="text-base font-semibold text-(--color-text-primary)">{profile.username}</p>
            <p className="text-sm text-(--color-text-muted)">{profile.email}</p>
          </div>
          <RoleBadge role={profile.role} />
        </div>

        {/* Change username */}
        <div>
          <p className="text-xs font-medium text-(--color-text-secondary) mb-2">
            {t('users.profile.changeUsername')}
          </p>
          <form onSubmit={(e) => { void handleSaveUsername(e) }} className="space-y-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => { setNewUsername(e.target.value); setUsernameSaved(false) }}
              minLength={3}
              maxLength={30}
              required
              className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
            />
            {usernameError && (
              <p className="text-xs text-(--color-status-cancelled)">{usernameError}</p>
            )}
            {usernameSaved && (
              <p className="text-xs text-(--color-accent)">{t('common.save')}</p>
            )}
            <button
              type="submit"
              disabled={isSavingUsername || newUsername === profile.username}
              className="w-full py-2.5 text-sm font-medium bg-(--color-accent) text-(--color-text-on-accent) rounded-sm disabled:opacity-50"
            >
              {isSavingUsername ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div>
          <p className="text-xs font-medium text-(--color-text-secondary) mb-2">
            {t('users.profile.changePassword')}
          </p>
          <form onSubmit={(e) => { void handleSavePassword(e) }} className="space-y-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordSaved(false) }}
              placeholder={t('users.profile.newPassword')}
              required
              minLength={8}
              className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordSaved(false) }}
              placeholder={t('users.profile.confirmPassword')}
              required
              minLength={8}
              className="w-full px-3 py-2.5 text-base bg-(--color-bg-elevated) border border-(--color-border-default) rounded-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:border-(--color-accent)"
            />
            {passwordError && (
              <p className="text-xs text-(--color-status-cancelled)">{passwordError}</p>
            )}
            {passwordSaved && (
              <p className="text-xs text-(--color-accent)">{t('common.save')}</p>
            )}
            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-2.5 text-sm font-medium bg-(--color-accent) text-(--color-text-on-accent) rounded-sm disabled:opacity-50"
            >
              {isSavingPassword ? t('common.loading') : t('users.profile.changePassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
