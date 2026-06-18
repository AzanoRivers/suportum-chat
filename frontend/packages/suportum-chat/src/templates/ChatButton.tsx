import { useState, useEffect } from 'react'

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface ChatButtonProps {
  onClick: () => void
  label?: string
  position?: Position
}

const positionClasses: Record<Position, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left':  'bottom-6 left-6',
  'top-right':    'top-6 right-6',
  'top-left':     'top-6 left-6',
}

function ChatIcon({ winking }: { winking: boolean }) {
  const fadeTransition = 'opacity 160ms ease-out'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Burbuja principal */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 5.5A3.5 3.5 0 0 1 5.5 2h13A3.5 3.5 0 0 1 22 5.5v10A3.5 3.5 0 0 1 18.5 19H13l-4 3.5A1 1 0 0 1 7.4 22V19H5.5A3.5 3.5 0 0 1 2 15.5v-10z"
        fill="currentColor"
      />
      {/* Tres dots: estado normal */}
      <g className={['chat-icon-group', winking ? 'chat-icon-group--hidden' : 'chat-icon-group--visible'].join(' ')}>
        <circle cx="8"  cy="11" r="1.35" fill="white" />
        <circle cx="12" cy="11" r="1.35" fill="white" />
        <circle cx="16" cy="11" r="1.35" fill="white" />
      </g>
      {/* Cara guiño: estado wink */}
      <g className={['chat-icon-group', winking ? 'chat-icon-group--visible' : 'chat-icon-group--hidden'].join(' ')}>
        {/* Ojo izquierdo abierto */}
        <circle cx="8.5" cy="9.5" r="1.2" fill="white" />
        {/* Ojo derecho guiñado (arco ~) */}
        <path
          d="M 13.5 9.5 Q 15.5 7.6 17.5 9.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Sonrisa */}
        <path
          d="M 8 13 Q 12 16.2 16 13"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}

export function ChatButton({
  onClick,
  label = 'Support',
  position = 'bottom-right',
}: ChatButtonProps) {
  const [isWinking, setIsWinking] = useState(false)

  // Detecta touch-only una vez (sin dependencia de window en SSR)
  const [isMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: none)').matches
  })

  // Mobile: ciclo autónomo. wink 1.5s, pausa 3s, repite
  useEffect(() => {
    if (!isMobile) return

    let alive = true
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>

    const cycle = () => {
      if (!alive) return
      setIsWinking(true)
      t1 = setTimeout(() => {
        if (!alive) return
        setIsWinking(false)
        t2 = setTimeout(cycle, 3000)
      }, 1500)
    }

    // Primer guiño al segundo de montar
    t2 = setTimeout(cycle, 1000)

    return () => {
      alive = false
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isMobile])

  const handleMouseEnter = () => { if (!isMobile) setIsWinking(true) }
  const handleMouseLeave = () => { if (!isMobile) setIsWinking(false) }

  return (
    <div className={`fixed z-[9999] ${positionClasses[position]}`}>
      {/* Beacon pulse ring */}
      <span aria-hidden="true" className="beacon" />

      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={label}
        className={[
          'chat-btn',
          isWinking ? 'chat-btn--winking' : 'chat-btn--normal',
          'w-14 h-14 rounded-full',
          'bg-(--color-accent) hover:bg-(--color-accent-hover)',
          'border border-[rgba(255,255,255,0.25)]',
          'flex items-center justify-center',
          'btn-glow cursor-pointer',
          'min-h-11 min-w-11',
          'text-(--color-text-on-accent)',
        ].join(' ')}
      >
        <ChatIcon winking={isWinking} />
      </button>
    </div>
  )
}
