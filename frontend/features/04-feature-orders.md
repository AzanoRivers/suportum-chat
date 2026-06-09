# 04 — Orders Board Frontend

## 1. Objetivo
Board Kanban de órdenes en tiempo real para agents/admins, con panel expandible a full screen.
El client solo ve sus propias órdenes como lista. Actualizaciones via Socket.IO.

## 2. Componentes a Implementar

### Molecules
- `OrderCard` — tarjeta de orden en el kanban: título, tipo, cliente, agente, tiempo
- `OrderStatusBadge` — badge de estado: pending/active/taken/completed/cancelled

### Organisms
- `ClientOrders` — lista de órdenes del cliente (vista simplificada)
- `OrdersBoard` — kanban de 5 columnas (agents/admins)
- `OrdersColumn` — columna de un estado en el kanban
- `OrderDetail` — panel lateral con detalle de orden + chat
- `OrderCreateForm` — formulario para crear orden (client)

### Templates
- `ExpandablePanel` — shell del panel expandible (colapsado: sidebar; expandido: full screen)
- Integrar `OrdersBoard` en `AgentView` y `AdminView`
- Integrar `ClientOrders` en `ClientView`

## 3. Store

### `store/orderStore.ts`
```ts
interface OrderState {
  orders: Order[]
  selectedOrder: Order | null
  isLoading: boolean
  fetchOrders: (filters?: OrderFilters) => Promise<void>
  updateOrder: (order: Order) => void
  addOrder: (order: Order) => void
}
```

### `store/boardStore.ts`
```ts
interface BoardState {
  isExpanded: boolean
  expand: () => void
  collapse: () => void
}
```

## 4. Hooks

### `hooks/useOrders.ts`
```ts
export function useOrders(apiUrl: string, apiKey: string) {
  // Carga órdenes al montar
  // Hace room:join a "orders:board" (si es agent/admin)
  // Suscribe a "order:updated"
  // Retorna { orders, byStatus, isLoading, createOrder, updateOrderStatus }
}
```

`byStatus` es un helper computado:
```ts
const byStatus = useMemo(() => ({
  pending:   orders.filter(o => o.status === 'pending'),
  active:    orders.filter(o => o.status === 'active'),
  taken:     orders.filter(o => o.status === 'taken'),
  completed: orders.filter(o => o.status === 'completed'),
  cancelled: orders.filter(o => o.status === 'cancelled'),
}), [orders])
```

## 5. UI/UX — Board Kanban (Agent/Admin)

### Desktop — Board Colapsado (sidebar)
```
┌──────────────────────────────────────────────┐
│ Chat Panel          │ Orders      [Expandir ↗]│
│                     ├──────────────────────── │
│ [mensajes]          │ PENDING: 3              │
│                     │ ACTIVE: 1               │
│ [input]             │ TAKEN: 2                │
└─────────────────────┴──────────────────────── ┘
```

### Desktop — Board Expandido (full screen)
```
┌─────────────────────────────────────────────────┐
│ Orders Board                       [Colapsar ↙] │
├──────────┬────────────┬────────────┬────────────┤
│ PENDING  │   ACTIVE   │   TAKEN    │ COMPLETED  │
│          │            │            │            │
│ [card]   │ [card]     │ [card]     │ [card]     │
│ [card]   │            │ [card]     │            │
│ [card]   │            │            │            │
└──────────┴────────────┴────────────┴────────────┘
```

### Mobile — Board
En mobile, el board expandido es una **bottom sheet** con scroll horizontal por columnas:
```
┌──────────────────────────────────────┐
│ Orders Board                     [×] │
│ ← PENDING   ACTIVE   TAKEN   COMPLET │  ← scroll horizontal
│ [card]      [card]   [card]  [card]  │
└──────────────────────────────────────┘
```

## 6. OrderCard — Diseño

```tsx
<div className="bg-bg-elevated border border-border-default p-3 rounded-sm">
  <div className="flex items-center justify-between">
    <span className="text-xs font-mono text-text-muted">{order.type.toUpperCase()}</span>
    <span className="text-xs text-text-muted">{relativeTime(order.created_at)}</span>
  </div>
  <p className="text-sm text-text-primary mt-1 font-medium">{order.title}</p>
  <div className="flex items-center gap-2 mt-2">
    <Avatar username={order.client_name} size="sm" />
    <span className="text-xs text-text-secondary">{order.client_name}</span>
    {order.agent_name && (
      <>
        <span className="text-text-muted">→</span>
        <span className="text-xs text-accent">{order.agent_name}</span>
      </>
    )}
  </div>
</div>
```

## 7. ExpandablePanel — Animación

```tsx
// Transición CSS: panel se expande/colapsa con transition-all
<div className={cn(
  "transition-all duration-200",
  isExpanded
    ? "fixed inset-0 z-50 bg-bg-base"  // full screen
    : "relative w-64 border-l border-border-default"  // sidebar
)}>
```

## 8. Transición de Estado en el Board

Drag & drop está fuera del scope — las transiciones se hacen con botones en el `OrderDetail`:

```tsx
// En OrderDetail, botones según rol y status actual
const TRANSITIONS = {
  agent: { pending: ['active'], active: ['taken'], taken: ['completed', 'cancelled'] },
  admin: { pending: ['active', 'cancelled'], active: ['taken', 'cancelled'], taken: ['completed', 'cancelled'] },
  client: { pending: ['cancelled'] }
}
```

## 9. Real-Time

```ts
socket.on('order:updated', ({ order, action }) => {
  if (action === 'created') orderStore.addOrder(order)
  else orderStore.updateOrder(order)
})
```

## 10. ClientOrders — Vista Simplificada

El client ve sus órdenes como lista (no kanban):
```
┌────────────────────────────────────┐
│ Mis Órdenes              [+ Nueva] │
├────────────────────────────────────┤
│ [PENDING] Orden boosting WoW       │
│ Creada: hace 1 hora                │
│                                    │
│ [COMPLETED] Orden ranking LoL      │
│ Completada: hace 2 días            │
└────────────────────────────────────┘
```

## 11. iOS Safari

```css
/* Scroll horizontal en el board (mobile) */
.board-columns {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
}
.board-column {
  min-width: 280px;
  scroll-snap-align: start;
}
```

## 12. Desarrollo — Pasos

1. Implementar `store/orderStore.ts` y `store/boardStore.ts`
2. Implementar `hooks/useOrders.ts`
3. Implementar molecules: `OrderCard`, `OrderStatusBadge`
4. Implementar organisms: `OrdersColumn`, `OrdersBoard`, `ClientOrders`, `OrderDetail`, `OrderCreateForm`
5. Implementar template `ExpandablePanel`
6. Integrar en `AgentView`/`AdminView` (colapsado por defecto)
7. Probar real-time: client crea orden → agente ve en PENDING inmediatamente
8. Probar expand/collapse en desktop y mobile

## 13. Auditoría

### 13.1 Checklist iOS Safari
- [ ] Scroll horizontal del board: `-webkit-overflow-scrolling: touch`
- [ ] Bottom sheet en mobile: `dvh` para la altura
- [ ] `OrderCreateForm` inputs: `text-base`

### 13.2 Checklist de Funcionalidad
- [ ] Board se actualiza en tiempo real sin recargar
- [ ] Client solo ve sus órdenes, no las de otros clientes
- [ ] Expand/collapse funciona en desktop
- [ ] Bottom sheet en mobile con scroll horizontal
- [ ] Transiciones de estado válidas — botones incorrectos no aparecen

## 14. Criterios de Aprobación (Done)
- [ ] Board kanban con 5 columnas visible para agent/admin
- [ ] Client crea orden → aparece en PENDING del board de agents en tiempo real
- [ ] Expand panel a full screen funciona en desktop
- [ ] Mobile: scroll horizontal por columnas funciona
- [ ] Reviewer confirma APPROVED
