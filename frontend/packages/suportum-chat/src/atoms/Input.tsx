import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  ariaLabel?: string
  className?: string
}

export function Input({
  type = 'text', placeholder, value, onChange, disabled = false,
  error, className = '', id, name, ariaLabel, ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        id={id} name={name} type={type} placeholder={placeholder}
        value={value} onChange={onChange} disabled={disabled}
        aria-label={ariaLabel} aria-invalid={error ? 'true' : 'false'}
        className={[
          'field-input',
          error ? 'field-input--error' : '',
          'placeholder:text-(--color-text-muted)',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
