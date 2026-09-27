# Implementacion f04 Orders Board

**Fecha:** 2026-06-09
**Feature:** frontend/features/04-feature-orders.md
**Estado:** IMPLEMENTADO

---

## Archivos creados

### Stores
- `src/store/orderStore.ts`: Zustand store con `Order` interface, `fetchOrders`, `addOrder`, `updateOrder`, `selectOrder`. Patron identico a `ticketStore.ts`.
- `src/store/boardStore.ts`: Store minimo con `isExpanded`, `expand`, `collapse` para el board kanban.

### Hook
- `src/hooks/useOrders.ts`: Computa `byStatus` via `useMemo` (5 columnas). Socket join `orders:board` para agent/admin. Escucha `order:updated` con dispatch a `addOrder` o `updateOrder` segun `action`. Expone `createOrder`, `updateOrderStatus`, `fetchOrders`.

### Molecules
- `src/molecules/OrderStatusBadge.tsx`: Badge con color inline via `var(--color-status-{status})`. Texto via `t('orders.status.*')`.
- `src/molecules/OrderCard.tsx`: Tarjeta clickable para kanban. Avatar + nombre cliente + agente (cuando existe) + badge de status + tiempo relativo. CSS solo variables.

### Organisms
- `src/organisms/OrdersColumn.tsx`: Columna kanban con header (label + count) y lista de `OrderCard`. `scroll-snap-align: start` via inline style.
- `src/organisms/OrdersBoard.tsx`: Board con 5 columnas horizontales. Boton expand/collapse (icono `Maximize2`/`Minimize2` de lucide). Estado expandido: `fixed inset-0 z-50`. Scroll iOS con `WebkitOverflowScrolling: touch` y `scrollSnapType: x mandatory`.
- `src/organisms/OrderDetail.tsx`: Vista de detalle con back arrow, status badge, meta info, details como key/value, y botones de transicion por rol. Transiciones: agent(pending->active, active->taken, taken->completed|cancelled), admin(pending->active|cancelled, active->taken|cancelled, taken->completed|cancelled), client(pending->cancelled).
- `src/organisms/OrderCreateForm.tsx`: Modal (fixed inset-0 z-50) con formulario. Usa `FormField` atom para type y title (inputs con `text-base` via atom `Input`). Textarea standalone con `text-base` para details.
- `src/organisms/ClientOrders.tsx`: Lista vertical de ordenes del cliente. Header con boton nueva orden que abre `OrderCreateForm` en modal. Cada item: Avatar + titulo + tipo (mono) + `OrderStatusBadge` + tiempo relativo.

## Archivos modificados

- `src/molecules/index.ts`: Agregados `OrderStatusBadge` y `OrderCard`.
- `src/organisms/index.ts`: Agregados `OrdersColumn`, `OrdersBoard`, `OrderDetail`, `OrderCreateForm`, `ClientOrders`.
- `src/templates/AgentView.tsx`: Tab `orders` agregado. Cuando `selectedOrder` renderiza `OrderDetail` (ocultando tab bar). Tab orders renderiza `OrdersBoard`.
- `src/templates/AdminView.tsx`: Mismo patron que AgentView. `safeRole` es `admin`|`agent`.
- `src/templates/ClientView.tsx`: Tab `orders` agregado. Renderiza `ClientOrders` (lista + create form, sin board kanban).

## Fix aplicado durante implementacion

`useOrders` no retornaba `fetchOrders`. `ClientOrders` lo necesitaba para refrescar tras crear una orden. Agregado al return del hook.

## Verificacion

```
pnpm --filter suportum-chat typecheck  --> OK (sin errores)
pnpm --filter suportum-chat build      --> OK
  dist/index.js  69.57 KB (CJS)
  dist/index.mjs 65.52 KB (ESM)
  dist/index.d.ts + .d.mts (DTS)
```

## Cumplimiento de reglas criticas

- R_ATOMIC: molecules no importan de organisms. Cumplido.
- R_CSS: cero colores hardcodeados. Solo `[--color-*]` o `var(--color-*)` inline.
- R_I18N: todo texto via `t(...)`. Cero strings hardcodeados en JSX.
- R_IOS: inputs/textareas con `text-base`. Scroll horizontal con `WebkitOverflowScrolling` + `scrollSnapType`.
- R_ICONS: solo `lucide-react` (Maximize2, Minimize2, ChevronLeft, Plus, X).
- R_TS: tipos explícitos en todas partes. Sin `any`. `Order` exportada desde `orderStore.ts`.
- R_NODASH: sin guion largo en ningun texto generado.
