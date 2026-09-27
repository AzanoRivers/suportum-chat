---
name: atomic-design-react
description: >
  Estructura de Diseño Atómico para componentes React de Suportum. Define la
  jerarquía atoms → molecules → organisms → templates y las reglas de importación.
  Usar siempre que se creen o modifiquen componentes React.
---

# Atomic Design — React (Suportum)

## Jerarquía de importaciones (REGLA ESTRICTA)

```
atoms       → no importan de ningún otro nivel
molecules   → importan sólo de atoms
organisms   → importan de molecules y atoms
templates   → importan de organisms, molecules y atoms
```

**Un átomo que importa de molecules = error de arquitectura.**

## Estructura de directorio

```
src/
  atoms/
    Button.tsx
    Input.tsx
    Badge.tsx
    Avatar.tsx
    Spinner.tsx
    Divider.tsx
  molecules/
    ChatBubble.tsx
    MessageInput.tsx
    TypingIndicator.tsx
    NotifBadge.tsx
  organisms/
    client/
      ClientView.tsx
      ClientChat.tsx
    agent/
      AgentView.tsx
      AgentInbox.tsx
    admin/
      AdminView.tsx
      AdminUsers.tsx
  templates/
    FloatingWidget.tsx    ← sólo posicionamiento y role routing
    layouts/
      DrawerLayout.tsx
      ModalLayout.tsx
  providers/
    ThemeProvider.tsx
```

## Átomo — Contrato mínimo

```tsx
// atoms/Button.tsx — SIN estado global, SIN imports de levels superiores
import { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-surface-0 hover:bg-accent-dim',
  ghost:   'bg-transparent text-text-primary hover:bg-surface-2',
  danger:  'bg-red-500/10 text-red-400 hover:bg-red-500/20',
}

const sizeClass: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-9',
  md: 'text-base px-4 py-2 min-h-11',
  lg: 'text-base px-6 py-3 min-h-12',
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass[variant]} ${sizeClass[size]} ${className ?? ''}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
```
