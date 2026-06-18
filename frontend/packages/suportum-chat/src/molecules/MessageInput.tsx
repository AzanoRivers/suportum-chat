import { useState, useRef, useEffect } from 'react'
import { Paperclip, Send, X, Smile } from 'lucide-react'
import { Spinner } from '../atoms/Spinner'
import { useI18n } from '../i18n'
import { EmojiPicker } from './EmojiPicker'

interface MessageInputProps {
  onSend: (content: string) => void
  onSendImage: (file: File) => Promise<void>
  onTyping: () => void
  disabled?: boolean
}

const isMobile = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

export function MessageInput({ onSend, onSendImage, onTyping, disabled }: MessageInputProps) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  const collapseTextarea = () => {
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      const ta = textareaRef.current
      ta.style.overflowY = 'hidden'
      // height:auto mide el contenido real (ya vacío por React); el browser anima
      // desde el frame anterior (90px) al nuevo valor explícito (43px)
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    })
  }

  const handleSendText = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    collapseTextarea()
  }

  const handleSendImage = async () => {
    if (!pendingFile || disabled) return
    setIsUploading(true)
    try {
      await onSendImage(pendingFile)
    } finally {
      setIsUploading(false)
      setPendingFile(null)
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
      collapseTextarea()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      if (pendingFile) void handleSendImage()
      else handleSendText()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    onTyping()
    const ta = e.target
    const prev = ta.offsetHeight        // altura actual antes de medir
    ta.style.height = 'auto'           // medir contenido real
    const content = ta.scrollHeight
    const target = Math.min(content, 90)
    ta.style.height = `${prev}px`      // restaurar altura previa
    void ta.offsetHeight               // forzar reflow (browser registra prev)
    ta.style.overflowY = content > 90 ? 'auto' : 'hidden'
    ta.style.height = `${target}px`    // animar de prev → target
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }

  const cancelFile = () => {
    setPendingFile(null)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
  }

  const handleEmojiSelect = (emoji: string) => {
    setValue((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  return (
    <div className="msg-input-wrap">
      {showEmoji && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}

      {(pendingFile || isUploading) && previewUrl && (
        <div className="msg-input-preview">
          {isUploading ? (
            <div className="msg-input-preview__uploading">
              <Spinner size="sm" label={t('common.loading')} />
            </div>
          ) : (
            <div className="msg-input-preview__thumb-wrap">
              <img src={previewUrl} alt="" className="msg-input-preview__thumb" />
              <button
                type="button"
                onClick={cancelFile}
                aria-label={t('common.cancel')}
                className="msg-input-preview__cancel"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="msg-input-row">
        <div className="msg-input-actions">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={t('chat.attach')}
            disabled={disabled || isUploading}
            className="msg-input-btn"
          >
            <Paperclip size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Emojis"
            disabled={disabled}
            className={['msg-input-btn', showEmoji ? 'msg-input-btn--active' : ''].filter(Boolean).join(' ')}
          >
            <Smile size={16} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          placeholder={t('chat.placeholder')}
          className="msg-textarea"
        />

        <button
          type="button"
          onClick={() => { if (pendingFile) void handleSendImage(); else handleSendText() }}
          aria-label={t('chat.send')}
          disabled={disabled || isUploading || (!value.trim() && !pendingFile)}
          className="msg-send-btn"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
