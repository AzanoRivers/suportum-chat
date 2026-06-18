import { useI18n } from '../i18n'

interface TypingIndicatorProps {
  usernames: string[]
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  const { t } = useI18n()
  if (usernames.length === 0) return null

  return (
    <div className="msg-typing">
      <div className="msg-typing__bubble">
        <span className="msg-typing__dot" />
        <span className="msg-typing__dot" />
        <span className="msg-typing__dot" />
      </div>
      <span className="msg-time">
        {usernames.length === 1
          ? t('chat.typingOne').replace('{username}', usernames[0])
          : t('chat.typingMany')}
      </span>
    </div>
  )
}
