import { useState, useLayoutEffect, useRef, type ReactNode } from 'react'

interface FadeTransitionProps {
  transitionKey: string | number
  children: ReactNode
  duration?: number
  className?: string
}

export function FadeTransition({
  transitionKey, children, duration = 130, className,
}: FadeTransitionProps) {
  const prevChildrenRef = useRef<ReactNode>(children)
  const [snapshot, setSnapshot] = useState<ReactNode>(children)
  const [visible, setVisible] = useState(true)

  useLayoutEffect(() => {
    setSnapshot(prevChildrenRef.current)
    setVisible(false)
    const t = setTimeout(() => setVisible(true), duration)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey, duration])

  useLayoutEffect(() => { prevChildrenRef.current = children })

  return (
    <div
      className={[
        'fade-transition',
        visible ? 'fade-transition--visible' : 'fade-transition--hidden',
        className,
      ].filter(Boolean).join(' ')}
      style={{ '--ft-duration': `${duration}ms` } as React.CSSProperties}
    >
      {visible ? children : snapshot}
    </div>
  )
}
