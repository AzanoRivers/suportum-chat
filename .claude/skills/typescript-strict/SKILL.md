---
name: typescript-strict
description: >
  Patrones TypeScript strict para Suportum: discriminated unions para estados async,
  generics seguros, utility types, y prohibición de any. Usar en toda la capa de
  types/, stores/, y hooks/ del frontend.
---

# TypeScript Strict — Patterns para Suportum

## Config obligatoria

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Discriminated unions para estados async

```typescript
// ✅ Correcto — nunca mezclar loading + data + error en campos independientes
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string }

// Uso en hook:
const [state, setState] = useState<AsyncState<Message[]>>({ status: 'idle' })

// Type narrowing seguro:
if (state.status === 'ok') {
  console.log(state.data)  // T inferido automáticamente
}
```

## Tipos de dominio

```typescript
// types/domain.ts
export type Role = 'client' | 'agent' | 'admin'

export interface User {
  readonly id: string          // UUID v4 — readonly para evitar mutación
  username: string
  email: string
  role: Role
  createdAt: string            // ISO 8601
}

export interface Message {
  readonly id: string
  roomId: string
  content: string
  authorId: string
  authorUsername: string
  createdAt: string
  updatedAt?: string
}

export interface Ticket {
  readonly id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedToId: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}
```

## Generics seguros en API client

```typescript
// api/client.ts
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, options)
  if (!response.ok) throw new ApiError(response.status, await response.text())
  return response.json() as Promise<T>
}

// Uso — T inferido del contexto:
const user = await apiFetch<User>('/auth/me')
const tickets = await apiFetch<Ticket[]>('/tickets')
```

## Prohibiciones

```typescript
// ❌ Jamás usar
const x: any = ...
fn as any
// @ts-ignore sin comentario justificado

// ✅ Alternativas
const x: unknown = ...
if (isMessage(x)) { /* type guard */ }
// @ts-expect-error — razón específica
```
