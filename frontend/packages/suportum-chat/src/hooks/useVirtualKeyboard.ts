import { useEffect } from 'react'

export function useVirtualKeyboard(): void {
  useEffect(() => {
    const onResize = () => {
      const el = document.activeElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
        ;(el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    window.visualViewport?.addEventListener('resize', onResize)
    return () => window.visualViewport?.removeEventListener('resize', onResize)
  }, [])
}
