import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button } from '../atoms/Button'
import { FormField } from '../molecules/FormField'
import { useOrders } from '../hooks/useOrders'

interface OrderCreateFormProps {
  apiUrl: string
  apiKey: string
  onCreated: () => void
  onClose: () => void
}

export function OrderCreateForm({ apiUrl, apiKey, onCreated, onClose }: OrderCreateFormProps) {
  const { t } = useI18n()
  const { createOrder } = useOrders(apiUrl, apiKey)

  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type.trim() || !title.trim()) return
    setIsSubmitting(true)
    try {
      const parsedDetails: Record<string, unknown> = details.trim()
        ? { notes: details.trim() }
        : {}
      await createOrder({ type: type.trim(), title: title.trim(), details: parsedDetails })
      onCreated()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-md bg-(--color-bg-surface) rounded-t-lg sm:rounded-lg border border-(--color-border-default) flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border-subtle)">
          <span className="text-sm font-medium text-(--color-text-primary)">
            {t('orders.newOrder')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className={[
              'p-1.5 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary)',
              'hover:bg-(--color-bg-elevated) transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)',
            ].join(' ')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-4">
          <FormField
            label={t('orders.form.type')}
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          />

          <FormField
            label={t('orders.form.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Details field: textarea, uses label manually since FormField wraps Input */}
          <div className="flex flex-col gap-1 w-full">
            <label
              htmlFor="order-details"
              className="text-sm font-medium text-(--color-text-secondary)"
            >
              {t('orders.form.details')}
            </label>
            <textarea
              id="order-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className={[
                'w-full rounded-sm px-3 py-2 text-base resize-none',
                'bg-(--color-bg-elevated) border border-(--color-border-default)',
                'text-(--color-text-primary) placeholder:text-(--color-text-muted)',
                'focus:outline-none focus:ring-2 focus:ring-(--color-accent) focus:border-(--color-accent)',
                'transition-all',
              ].join(' ')}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !type.trim() || !title.trim()}
            >
              {t('orders.form.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
