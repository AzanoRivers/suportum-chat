import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type FeedbackType = 'error' | 'warning' | 'info' | 'success'

export interface Feedback {
  type: FeedbackType
  message: string
}

const ICONS: Record<FeedbackType, LucideIcon> = {
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
  success: CheckCircle2,
}

interface FeedbackBannerProps {
  feedback: Feedback | null
}

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  return (
    <div className="feedback-slot">
      {feedback && (
        <div
          className={`feedback-banner feedback-banner--${feedback.type}`}
          role="alert"
          aria-live="polite"
        >
          {(() => {
            const Icon = ICONS[feedback.type]
            return <Icon size={15} strokeWidth={1.75} className="feedback-banner__icon" />
          })()}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  )
}
