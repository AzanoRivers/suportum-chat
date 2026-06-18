import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { Input } from '../atoms/Input'
import { Button } from '../atoms/Button'
import { useTickets } from '../hooks/useTickets'
import type { Ticket } from '../store/ticketStore'

interface TicketCreateFormProps {
  apiUrl: string
  apiKey: string
  onCreated: () => void
  onClose: () => void
}

type Priority = Ticket['priority']

const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent']

const priorityActiveClasses: Record<Priority, string> = {
  low: 'bg-(--color-bg-elevated) text-(--color-text-muted) border border-(--color-accent)',
  normal: 'bg-(--color-bg-elevated) text-(--color-text-secondary) border border-(--color-accent)',
  high: 'bg-(--color-status-pending)/20 text-(--color-status-pending) border border-(--color-status-pending)',
  urgent: 'bg-(--color-status-cancelled)/20 text-(--color-status-cancelled) border border-(--color-status-cancelled)',
}

const priorityInactiveClass =
  'bg-(--color-bg-elevated) text-(--color-text-muted) border border-(--color-border-default) hover:border-(--color-border-subtle)'

export function TicketCreateForm({ apiUrl, apiKey, onCreated, onClose }: TicketCreateFormProps) {
  const { t } = useI18n()
  const { createTicket } = useTickets(apiUrl, apiKey)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [titleError, setTitleError] = useState('')
  const [priorityError, setPriorityError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTitleError('')
    setPriorityError('')

    let hasError = false
    if (!title.trim()) {
      setTitleError(t('errors.VALIDATION_ERROR'))
      hasError = true
    }
    if (!priority) {
      setPriorityError(t('errors.VALIDATION_ERROR'))
      hasError = true
    }
    if (hasError) return

    setIsSubmitting(true)
    try {
      await createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
      onCreated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-(--color-bg-surface) border-b border-(--color-border-default) p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-(--color-text-primary)">
          {t('tickets.newTicket')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex items-center justify-center min-h-8 min-w-8 rounded-(--radius-md) text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-elevated) transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-(--color-text-secondary)">
            {t('tickets.form.title')}
          </label>
          <Input
            placeholder={t('tickets.form.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            error={titleError}
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-(--color-text-secondary)">
            {t('tickets.form.description')}
          </label>
          <textarea
            placeholder={t('tickets.form.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            className={[
              'w-full rounded-(--radius-md) px-3 py-2',
              'text-base text-(--color-text-primary)',
              'bg-(--color-bg-elevated) border border-(--color-border-default)',
              'focus:outline-none focus:ring-2 focus:ring-(--color-accent) focus:border-(--color-accent)',
              'placeholder:text-(--color-text-muted)',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'resize-none transition-all',
            ].join(' ')}
          />
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-(--color-text-secondary)">
            {t('tickets.form.priority')}
          </label>
          <div className="flex gap-1 flex-wrap">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                disabled={isSubmitting}
                className={[
                  'px-3 py-1 rounded-(--radius-sm) text-xs font-medium transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  priority === p ? priorityActiveClasses[p] : priorityInactiveClass,
                ].join(' ')}
              >
                {t(`tickets.priority.${p}`)}
              </button>
            ))}
          </div>
          {priorityError && (
            <span className="text-xs text-(--color-status-cancelled)">{priorityError}</span>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? t('common.loading') : t('tickets.form.submit')}
        </Button>
      </form>
    </div>
  )
}
