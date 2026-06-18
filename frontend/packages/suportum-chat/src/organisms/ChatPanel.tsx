import { useChat } from '../hooks/useChat'
import { useVirtualKeyboard } from '../hooks/useVirtualKeyboard'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { MessageInput } from '../molecules/MessageInput'

interface ChatPanelProps {
  roomId: string
  roomName: string
  apiUrl: string
  apiKey: string
  onClose: () => void
  onBack?: () => void
  hideHeader?: boolean
}

export function ChatPanel({ roomId, roomName, apiUrl, apiKey, onClose, onBack, hideHeader }: ChatPanelProps) {
  const { messages, typingUsers, sendMessage, sendImage, handleTyping, deleteMessage, isConnected } =
    useChat(roomId, apiUrl, apiKey)
  useVirtualKeyboard()

  return (
    <div className="chat-panel">
      {!hideHeader && <ChatHeader roomName={roomName} onClose={onClose} onBack={onBack} apiUrl={apiUrl} />}

      <MessageList messages={messages} typingUsers={typingUsers} onDeleteMessage={deleteMessage} />

      <MessageInput
        onSend={sendMessage}
        onSendImage={sendImage}
        onTyping={handleTyping}
        disabled={!isConnected}
      />
    </div>
  )
}
