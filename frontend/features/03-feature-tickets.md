# 03 — Tickets Frontend

## 1. Objetivo
UI de gestión de tickets con vistas diferentes por rol: cliente ve sus tickets, agente ve los asignados,
admin ve todos. Cambios de estado en tiempo real via Socket.IO.

## 2. Componentes a Implementar

### Molecules
- `TicketRow` — fila de ticket en lista: título, status badge, prioridad, agente asignado, fecha
- `PriorityBadge` — badge de prioridad: `low|normal|high|urgent` con colores distintos
- `TicketStatusBadge` — badge de estado con colores Dragon UI

### Organisms
- `TicketList` — lista filtrable con loading/empty states
- `TicketDetail` — vista de detalle de un ticket: info + chat del ticket + botones de acción
- `TicketCreateForm` — modal/panel para crear ticket nuevo (client/agent/admin)
- `TicketActions` — botones de transición de estado según rol

### Templates
- Integrar `ClientTickets` en `ClientView`
- Integrar `AgentTickets` en `AgentView`
- Integrar `AdminTickets` en `AdminView`

## 3. Store

### `store/ticketStore.ts`
```ts
interface TicketState {
  tickets: Ticket[]
  selectedTicket: Ticket | null
  isLoading: boolean
  fetchTickets: (apiUrl: string, token: string) => Promise<void>
  updateTicket: (ticket: Ticket) => void
  selectTicket: (ticket: Ticket | null) => void
}
```

## 4. Hooks

### `hooks/useTickets.ts`
```ts
export function useTickets(apiUrl: string, apiKey: string) {
  // Carga lista de tickets con GET /tickets
  // Suscribe a "ticket:updated" del Socket.IO
  // Actualiza el ticket en el store al recibir evento
  // Retorna { tickets, isLoading, createTicket, updateTicketStatus, selectTicket }
}
```

## 5. UI/UX — Lista de Tickets

### Maquetación Desktop (dentro del panel agent/admin)
```
┌──────────────────────────────────────────┐
│ Tickets                    [+ Nuevo]     │
├──────────────────────────────────────────┤
│ [open] [in_progress] [resolved] [closed] │  ← filtros de status
├──────────────────────────────────────────┤
│ ┌────────────────────────────────────┐   │
│ │ [OPEN] No puedo acceder al sistema │   │
│ │ Client: andres  Agente: —  [urgent]│   │
│ │ Hace 2 horas                       │   │
│ └────────────────────────────────────┘   │
│ ┌────────────────────────────────────┐   │
│ │ [IN PROG] Error en el checkout     │   │
│ │ Client: maria  Agente: carlos [high]│  │
│ │ Hace 5 horas                        │  │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Colores de Status (Dragon UI)
| Status | Color |
|---|---|
| `open` | `--color-status-pending` (#f59e0b) |
| `in_progress` | `--color-status-active` (#10b981) |
| `resolved` | `--color-status-taken` (#6366f1) |
| `closed` | `--color-text-muted` |

### Colores de Prioridad
| Priority | Color |
|---|---|
| `low` | `--color-text-muted` |
| `normal` | `--color-text-secondary` |
| `high` | `--color-status-pending` |
| `urgent` | `--color-status-cancelled` |

## 6. TicketDetail

```
┌────────────────────────────────────────────┐
│ [←] #TKT-001 No puedo acceder al sistema  │
├────────────────────────────────────────────┤
│ Status: [OPEN]     Priority: [URGENT]      │
│ Agente: Sin asignar                        │
│ Cliente: andres@email.com                  │
│ Creado: 08/06/2026 14:32                   │
├────────────────────────────────────────────┤
│ Descripción:                               │
│ No puedo acceder desde ayer, me dice que   │
│ mi cuenta está bloqueada.                  │
├────────────────────────────────────────────┤
│ Chat del ticket (room: ticket:{id})        │
│ [ChatPanel con room_id=ticket:{id}]        │
├────────────────────────────────────────────┤
│ [Asignarme] [→ En Progreso] [✓ Resolver]  │  ← según rol
└────────────────────────────────────────────┘
```

## 7. TicketCreateForm

Campos:
- `title` (requerido, max 200 chars) — tipo `Input`
- `description` (opcional) — `<textarea>` con `text-base`
- `priority` — `Select` o botones de selección visual

Validación client-side antes de enviar:
- `title` no vacío
- `priority` seleccionado

## 8. Transiciones de Estado por Rol

```tsx
function TicketActions({ ticket, role }) {
  const transitions = {
    client: ticket.status === 'resolved' ? ['closed'] : [],
    agent: {
      'open': ['in_progress'],
      'in_progress': ['resolved'],
    }[ticket.status] ?? [],
    admin: {
      'open': ['in_progress', 'closed'],
      'in_progress': ['resolved', 'closed'],
      'resolved': ['closed'],
    }[ticket.status] ?? [],
  }[role]

  return transitions.map(status => (
    <Button key={status} variant="ghost" onClick={() => updateStatus(status)}>
      {STATUS_LABELS[status]}
    </Button>
  ))
}
```

## 9. Real-Time via Socket.IO

```ts
socket.on('ticket:updated', ({ ticket }) => {
  ticketStore.updateTicket(ticket)
  // Si el ticket seleccionado es el mismo, actualizar también el detalle
  if (ticketStore.selectedTicket?.id === ticket.id) {
    ticketStore.selectTicket(ticket)
  }
})
```

## 10. Mobile — Lista de Tickets

En mobile, la lista de tickets se muestra como tarjetas apiladas en scroll vertical.
No hay tabla — solo `TicketRow` apiladas con touch targets adecuados.

```tsx
// Mobile: cada row es un botón de 56px mínimo de altura
<button className="w-full text-left p-3 min-h-14 ...">
  <TicketRow ticket={ticket} />
</button>
```

## 11. Desarrollo — Pasos

1. Implementar `store/ticketStore.ts`
2. Implementar `hooks/useTickets.ts`
3. Implementar molecules: `TicketRow`, `PriorityBadge`, `TicketStatusBadge`
4. Implementar organisms: `TicketList`, `TicketDetail`, `TicketCreateForm`, `TicketActions`
5. Integrar `TicketList` en `ClientView`, `AgentView`, `AdminView`
6. Probar flujo: client crea ticket → agent ve en lista → agent cambia status → client ve en su lista actualizado

## 12. Auditoría

### 12.1 Checklist de Seguridad
- [ ] Client no puede ver el botón de `in_progress` → el backend lo rechazará, pero la UI no debe mostrarlo
- [ ] `updateTicketStatus` usa `apiClient.patch` (con token del authStore)

### 12.2 Checklist iOS Safari
- [ ] Rows de tickets: `min-h-14` (touch target)
- [ ] `textarea` en TicketCreateForm: `text-base`
- [ ] Modal/panel de detalle: scroll con `-webkit-overflow-scrolling: touch`

### 12.3 Checklist de Funcionalidad
- [ ] Agent ve solo sus tickets asignados + sin asignar
- [ ] Admin ve todos los tickets
- [ ] Real-time: actualización de status llega sin recargar
- [ ] Filtros de status funcionan
- [ ] Form de creación valida antes de enviar

## 13. Criterios de Aprobación (Done)
- [ ] Flujo completo: create → assign → status change → close
- [ ] Real-time actualización via Socket.IO
- [ ] Filtros de status funcionan en la lista
- [ ] Roles muestran las acciones correctas
- [ ] Reviewer confirma APPROVED
