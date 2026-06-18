import { memo, useState, useRef, useEffect } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { ImageAttachment } from './ImageAttachment'
import { type Message } from '../store/chatStore'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  onDelete?: (messageId: string) => void
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const MessageBubble = memo(function MessageBubble({
  message, isOwn, isFirstInGroup, isLastInGroup, onDelete,
}: MessageBubbleProps) {
  const { t } = useI18n()
  const initial = message.username ? message.username.charAt(0).toUpperCase() : '?'
  const isAdmin = message.role === 'admin'
  const time = formatTime(message.created_at)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left')
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  const handleMenuToggle = () => {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceRight = window.innerWidth - rect.right
      setDropdownAlign(spaceRight >= 160 ? 'left' : 'right')
    }
    setMenuOpen((v) => !v)
  }

  const rowClass = [
    'msg-row',
    isOwn ? 'msg-row--own' : 'msg-row--other',
    isFirstInGroup ? 'msg-row--first-in-group' : '',
  ].filter(Boolean).join(' ')

  const bubbleClass = [
    'msg-bubble',
    isOwn ? 'msg-bubble--own' : 'msg-bubble--other',
    isLastInGroup ? 'msg-bubble--tail' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClass}>
      {!isOwn && (
        <div className={['msg-avatar-slot', isLastInGroup ? '' : 'msg-avatar-slot--ghost'].filter(Boolean).join(' ')}>
          <span className="msg-avatar">{initial}</span>
        </div>
      )}

      <div className={bubbleClass}>
        {isFirstInGroup && (
          <>
            <div className="msg-name-row">
              {isAdmin && (
                <span className="msg-badge-support">
                  {t('chat.adminBadge' as Parameters<typeof t>[0])}
                </span>
              )}
              <span className={isOwn ? 'msg-username msg-username--own' : 'msg-username msg-username--other'}>
                {message.username}
              </span>
            </div>
            <div className="msg-bubble-sep" />
          </>
        )}

        {message.attachment && (
          <ImageAttachment
            url={message.attachment.url}
            width={message.attachment.width}
            height={message.attachment.height}
          />
        )}

        <div className="msg-body">
          {message.content && (
            <span className="msg-content">{message.content}</span>
          )}
          <span className="msg-time">{time}</span>
        </div>
      </div>

      {onDelete && (
        <div
          ref={menuRef}
          className={['msg-menu-wrap', isOwn ? 'msg-menu-wrap--own' : ''].filter(Boolean).join(' ')}
        >
          <button
            ref={btnRef}
            className={['msg-menu-btn', menuOpen ? 'msg-menu-btn--open' : ''].filter(Boolean).join(' ')}
            onClick={handleMenuToggle}
            aria-label="Opciones"
          >
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div className={`msg-menu-dropdown msg-menu-dropdown--${dropdownAlign}`}>
              <button
                className="msg-menu-item msg-menu-item--danger"
                onClick={() => { setMenuOpen(false); onDelete(message.id) }}
              >
                <Trash2 size={13} />
                {t('chat.deleteMessage' as Parameters<typeof t>[0])}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
