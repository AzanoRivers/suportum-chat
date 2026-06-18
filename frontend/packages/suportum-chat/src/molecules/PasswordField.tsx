import { useState } from 'react'
import { Eye, EyeOff, Copy, Check, Wand2 } from 'lucide-react'

interface PasswordFieldProps {
  id?: string
  label: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  withGenerate?: boolean
  autoComplete?: string
}

function generatePassword(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '!@#$%&*'
  const all     = upper + lower + digits + special

  const pickOne = (set: string, byte: number) => set[byte % set.length]

  const mandatory = new Uint8Array(4)
  crypto.getRandomValues(mandatory)

  const rest = new Uint8Array(12)
  crypto.getRandomValues(rest)

  const chars: string[] = [
    pickOne(upper,   mandatory[0]),
    pickOne(lower,   mandatory[1]),
    pickOne(digits,  mandatory[2]),
    pickOne(special, mandatory[3]),
    ...Array.from(rest).map(b => all[b % all.length]),
  ]

  // Fisher-Yates con valores cripto
  const shuffle = new Uint8Array(chars.length)
  crypto.getRandomValues(shuffle)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

export function PasswordField({
  id,
  label,
  value,
  onValueChange,
  placeholder = '••••••••',
  disabled = false,
  required,
  error,
  withGenerate = false,
  autoComplete = 'new-password',
}: PasswordFieldProps) {
  const fieldId = id ?? 'password-field'
  const [show,   setShow]   = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    const pwd = generatePassword()
    onValueChange(pwd)
    setShow(true)
  }

  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="pw-wrapper">
      <label htmlFor={fieldId} className="pw-label">
        {label}
      </label>

      <div className={['pw-field', error ? 'pw-field--error' : '', disabled ? 'pw-field--disabled' : ''].filter(Boolean).join(' ')}>
        <input
          id={fieldId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className="pw-input placeholder:text-(--color-text-muted)"
        />

        {/* Separador vertical */}
        <div className="pw-sep" />

        {/* Acciones */}
        <div className="pw-actions">
          {withGenerate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              aria-label="Generate password"
              title="Generar contraseña"
              className="pw-action-btn pw-action-btn--generate"
            >
              <Wand2 size={14} strokeWidth={1.8} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShow(v => !v)}
            disabled={disabled}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="pw-action-btn"
          >
            {show
              ? <EyeOff size={14} strokeWidth={1.8} />
              : <Eye    size={14} strokeWidth={1.8} />
            }
          </button>

          <button
            type="button"
            onClick={() => { void handleCopy() }}
            disabled={disabled || !value}
            aria-label="Copy password"
            className={['pw-action-btn pw-action-btn--copy', copied ? 'pw-action-btn--copied' : '', !value ? 'pw-action-btn--dim' : ''].filter(Boolean).join(' ')}
          >
            {copied
              ? <Check size={14} strokeWidth={2} />
              : <Copy  size={14} strokeWidth={1.8} />
            }
          </button>
        </div>
      </div>

      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
