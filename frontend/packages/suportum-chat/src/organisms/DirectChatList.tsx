import { MessageCircle, ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n'
import { useChatRooms } from '../hooks/useChatRooms'
import { Avatar } from '../atoms/Avatar'

interface DirectChatListProps {
  apiKey: string
  onSelectRoom: (roomId: string, roomName: string) => void
}

export function DirectChatList({ apiKey, onSelectRoom }: DirectChatListProps) {
  const { t } = useI18n()
  const { rooms } = useChatRooms(apiKey)
  const directRooms = rooms.filter((r) => r.id.startsWith('direct:'))

  if (directRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <MessageCircle size={32} className="text-(--color-text-muted)" />
        <p className="text-sm text-(--color-text-muted)">{t('chat.noDirectRooms')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 overflow-y-auto smooth-scroll"
      >
        {directRooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelectRoom(room.id, room.name)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-(--color-border-default) hover:bg-(--color-bg-elevated) transition-colors"
          >
            <Avatar username={room.name} size="sm" />
            <span className="flex-1 text-sm text-(--color-text-primary) truncate">{room.name}</span>
            <ChevronRight size={16} className="text-(--color-text-muted) flex-none" />
          </button>
        ))}
      </div>
    </div>
  )
}
