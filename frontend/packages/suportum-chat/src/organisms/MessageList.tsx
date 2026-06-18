import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { type Message } from '../store/chatStore'
import { MessageBubble } from '../molecules/MessageBubble'
import { TypingIndicator } from '../molecules/TypingIndicator'
import { DateDivider } from '../molecules/DateDivider'

interface MessageListProps {
  messages: Message[]
  typingUsers: string[]
  onDeleteMessage?: (messageId: string) => void
}

type ListItem =
  | { type: 'date'; date: string; key: string }
  | { type: 'message'; message: Message; key: string; isFirstInGroup: boolean; isLastInGroup: boolean }

function buildList(messages: Message[]): ListItem[] {
  const items: ListItem[] = []
  let lastDateKey = ''
  let prevUserId = ''

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const dateKey = msg.created_at.slice(0, 10)

    if (dateKey !== lastDateKey) {
      items.push({ type: 'date', date: msg.created_at, key: `date-${dateKey}` })
      lastDateKey = dateKey
      prevUserId = ''
    }

    const isFirstInGroup = msg.user_id !== prevUserId
    const nextMsg = messages[i + 1]
    const nextDateKey = nextMsg?.created_at.slice(0, 10)
    const isLastInGroup = !nextMsg || nextMsg.user_id !== msg.user_id || nextDateKey !== dateKey

    items.push({ type: 'message', message: msg, key: `msg-${msg.id}`, isFirstInGroup, isLastInGroup })
    prevUserId = msg.user_id
  }

  return items
}

export function MessageList({ messages, typingUsers, onDeleteMessage }: MessageListProps) {
  const userId = useAuthStore((s) => s.userId)
  const role = useAuthStore((s) => s.role)
  const bottomRef = useRef<HTMLDivElement>(null)
  const items = buildList(messages)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="msg-list">
      {items.map((item) =>
        item.type === 'date' ? (
          <DateDivider key={item.key} date={item.date} />
        ) : (
          <MessageBubble
            key={item.key}
            message={item.message}
            isOwn={item.message.user_id === userId}
            isFirstInGroup={item.isFirstInGroup}
            isLastInGroup={item.isLastInGroup}
            onDelete={role === 'admin' ? onDeleteMessage : undefined}
          />
        )
      )}
      <TypingIndicator usernames={typingUsers} />
      <div ref={bottomRef} />
    </div>
  )
}
