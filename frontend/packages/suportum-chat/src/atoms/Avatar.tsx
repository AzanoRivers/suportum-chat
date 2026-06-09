type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  username: string
  size?: AvatarSize
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ username, size = 'md' }: AvatarProps) {
  const initial = username ? username.charAt(0).toUpperCase() : '?'

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0',
        'bg-[--color-bg-overlay] text-[--color-text-primary]',
        sizeClasses[size],
      ].join(' ')}
    >
      {initial}
    </span>
  )
}
