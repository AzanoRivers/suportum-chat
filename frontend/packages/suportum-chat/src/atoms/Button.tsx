import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children?: ReactNode
  ariaLabel?: string
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-(--color-accent) text-(--color-bg-base) hover:bg-(--color-accent-hover) border border-transparent',
  ghost:
    'bg-transparent text-(--color-text-primary) hover:bg-(--color-bg-elevated) border border-(--color-border-default)',
  danger:
    'bg-(--color-status-cancelled) text-white hover:opacity-90 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  ariaLabel,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium tracking-wide rounded-(--radius-md) transition-all cursor-pointer',
        'min-h-11 min-w-11',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-accent)',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
