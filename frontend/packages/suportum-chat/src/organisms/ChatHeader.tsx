import { ChevronLeft, X, MessageCircle } from 'lucide-react'
import { useI18n } from '../i18n'
import { WindowControls } from '../atoms/WindowControls'
import { ProjectLogo } from '../atoms/ProjectLogo'
import { useProjectBrandingPublic } from '../hooks/useProjectBrandingPublic'

interface ChatHeaderProps {
  roomName: string
  onClose: () => void
  onBack?: () => void
  apiUrl?: string
}

export function ChatHeader({ roomName, onClose, onBack, apiUrl }: ChatHeaderProps) {
  const { t } = useI18n()
  const { logoUrl, projectName } = useProjectBrandingPublic(apiUrl ?? '')

  return (
    <div className="chat-header">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="chat-header__btn chat-header__btn--back"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
      )}

      <div className="chat-header__logo">
        {logoUrl ? (
          <ProjectLogo src={logoUrl} size="sm" />
        ) : (
          <MessageCircle size={16} strokeWidth={1.5} className="chat-header__logo-default" />
        )}
      </div>

      <span className="chat-header__title">
        {projectName ? `${roomName} - ${projectName}` : roomName}
      </span>

      <WindowControls />

      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="chat-header__btn chat-header__btn--close"
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </div>
  )
}
