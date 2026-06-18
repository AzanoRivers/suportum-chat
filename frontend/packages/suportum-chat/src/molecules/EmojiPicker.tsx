import { useState, useRef, useEffect } from 'react'
import { EMOJI_CATEGORIES, EMOJIS } from '../lib/emojis'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const emojis = EMOJIS[activeCategory] ?? []

  return (
    <div ref={ref} className="emoji-picker">
      <div className="emoji-picker__tabs">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            title={cat.label}
            className={['emoji-picker__tab', activeCategory === cat.id ? 'emoji-picker__tab--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      <div className="emoji-picker__grid">
        {emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            className="emoji-picker__btn"
            onClick={() => { onSelect(emoji); onClose() }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
