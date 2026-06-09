// FloatingWidget — full implementation in F02
// Placeholder component that renders null

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

interface SuportumChatProps {
  apiKey: string
  apiUrl: string
  position?: Position
}

export function SuportumChat(_props: SuportumChatProps) {
  return null
}

// FloatingWidget alias for internal template exports
export { SuportumChat as FloatingWidget }
