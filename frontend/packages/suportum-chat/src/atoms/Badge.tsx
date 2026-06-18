type BadgeStatus =
  | 'pending'
  | 'active'
  | 'taken'
  | 'completed'
  | 'cancelled'
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'

interface BadgeProps {
  status: BadgeStatus
  label: string
  className?: string
}

const statusClasses: Record<BadgeStatus, string> = {
  pending:    'bg-(--color-status-pending)/20 text-(--color-status-pending) border border-(--color-status-pending)/40',
  active:     'bg-(--color-status-active)/20 text-(--color-status-active) border border-(--color-status-active)/40',
  taken:      'bg-(--color-status-taken)/20 text-(--color-status-taken) border border-(--color-status-taken)/40',
  completed:  'bg-(--color-status-completed)/20 text-(--color-status-completed) border border-(--color-status-completed)/40',
  cancelled:  'bg-(--color-status-cancelled)/20 text-(--color-status-cancelled) border border-(--color-status-cancelled)/40',
  open:       'bg-(--color-accent-dim) text-(--color-accent) border border-(--color-accent)/30',
  in_progress:'bg-(--color-status-taken)/20 text-(--color-status-taken) border border-(--color-status-taken)/40',
  resolved:   'bg-(--color-status-completed)/20 text-(--color-status-completed) border border-(--color-status-completed)/40',
  closed:     'bg-(--color-bg-overlay) text-(--color-text-muted) border border-(--color-border-subtle)',
}

export function Badge({ status, label, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-(--radius-sm) text-xs font-medium',
        statusClasses[status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
