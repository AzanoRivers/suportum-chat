import { useI18n } from '../i18n'

interface UserActionsProps {
  onEdit: () => void
  onDeactivate: () => void
  isActive: boolean
}

export function UserActions({ onEdit, onDeactivate, isActive }: UserActionsProps) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-1 flex-none">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onEdit() }}
        className="px-2 py-1 text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) border border-(--color-border-default) rounded-sm transition-colors"
      >
        {t('users.actions.edit')}
      </button>
      {isActive && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeactivate() }}
          className="px-2 py-1 text-xs text-(--color-status-cancelled) border border-(--color-status-cancelled) rounded-sm opacity-80 hover:opacity-100 transition-opacity"
        >
          {t('users.actions.deactivate')}
        </button>
      )}
    </div>
  )
}
