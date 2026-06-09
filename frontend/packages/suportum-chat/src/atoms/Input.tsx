import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  ariaLabel?: string
  className?: string
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  id,
  name,
  ariaLabel,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={error ? 'true' : 'false'}
        className={[
          'w-full rounded-[--radius-md] px-3 py-2',
          'text-base text-[--color-text-primary]',
          'bg-[--color-bg-elevated] border',
          error
            ? 'border-[--color-status-cancelled]'
            : 'border-[--color-border-default]',
          'focus:outline-none focus:ring-2 focus:ring-[--color-accent] focus:border-[--color-accent]',
          'placeholder:text-[--color-text-muted]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all',
          'min-h-11',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && (
        <span className="text-sm text-[--color-status-cancelled]">{error}</span>
      )}
    </div>
  )
}
