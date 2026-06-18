import { useRef } from 'react'

export function useSwipeDown(onClose: () => void) {
  const startY = useRef(0)

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY.current
      if (deltaY > 80) onClose()
    },
  }
}
