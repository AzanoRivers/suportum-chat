import type { InputHTMLAttributes } from 'react'
import { Input } from '../atoms/Input'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function FormField({ label, error, id, ...rest }: FormFieldProps) {
  const fieldId = id ?? (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-(--color-text-secondary)"
        >
          {label}
        </label>
      )}
      <Input id={fieldId} error={error} {...rest} />
    </div>
  )
}
