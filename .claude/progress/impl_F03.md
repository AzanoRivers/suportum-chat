# Impl Report: F03 - Tickets Frontend

## Status: DONE

## Verificacion final

- `pnpm --filter suportum-chat typecheck`: exit 0
- `pnpm --filter suportum-chat build`: exit 0 (CJS + ESM + DTS)

---

## Archivos creados

### Store
- `src/store/ticketStore.ts` - Zustand store con Ticket interface, fetchTickets, updateTicket, selectTicket. updateTicket mantiene selectedTicket sincronizado con el store.

### Hook
- `src/hooks/useTickets.ts` - Hook principal. Llama fetchTickets en mount, suscribe a `ticket:updated` via socket, expone createTicket/updateTicketStatus/assignTicket/selectTicket.

### Molecules
- `src/molecules/TicketStatusBadge.tsx` - Wrapper de Badge con status de ticket + i18n
- `src/molecules/PriorityBadge.tsx` - Span con color segun prioridad usando tokens CSS
- `src/molecules/TicketRow.tsx` - Fila de ticket (button con min-h-14 para iOS). Tiempo relativo calculado a mano (date-fns no disponible). Soporte locale es/en.

### Organisms
- `src/organisms/TicketCreateForm.tsx` - Formulario con Input atom, textarea (text-base para iOS), prioridad como 4 botones visuales. Validacion client-side.
- `src/organisms/TicketList.tsx` - Lista con header (+ Nuevo), filtros de status toggle, scroll con WebkitOverflowScrolling. Empty state con icono Ticket.
- `src/organisms/TicketDetail.tsx` - Vista de detalle: back bar + meta compacto + ChatPanel (flex-1 min-h-0) + TicketActions.
- `src/organisms/TicketActions.tsx` - Acciones por rol. Transiciones de estado segun spec. Boton Asignarme para agent/admin.

### Templates
- `src/templates/AgentView.tsx` - Tabs Chat | Tickets. Cuando hay selectedTicket, muestra TicketDetail sin tabs.
- `src/templates/AdminView.tsx` - Igual a AgentView pero con role=admin para TicketActions.

### Actualizaciones
- `src/templates/ClientView.tsx` - Ahora con tabs Chat | Tickets. Default tab: chat.
- `src/templates/WidgetShell.tsx` - Reemplazados placeholders por AgentView/AdminView reales. Removido import useI18n inutilizado.
- `src/molecules/index.ts` - Agregados TicketStatusBadge, PriorityBadge, TicketRow
- `src/organisms/index.ts` - Agregados TicketList, TicketDetail, TicketCreateForm, TicketActions
- `src/templates/index.ts` - Agregados AgentView, AdminView

---

## Decisiones tecnicas

### Navigation pattern
La navegacion TicketList vs TicketDetail se maneja en los templates (AgentView, AdminView, ClientView), NO dentro de TicketList. TicketList llama selectTicket(ticket), el template observa selectedTicket del store y renderiza condicionalmente.

### Tiempo relativo sin date-fns
Funcion relativeTime() implementada en TicketRow con soporte para locale 'es' y 'en'. Formato: "Hace 2h" / "2h ago", etc.

### assignTicket body
La llamada PATCH /assign usa `{}` como body ya que apiClient.patch requiere el parametro. FastAPI acepta body vacio para endpoints que no lo requieren.

### selectedTicket sync en store
updateTicket en el store tambien actualiza selectedTicket si el ticket actualizado es el seleccionado. Esto complementa la logica del hook.

### iOS Safari
- `min-h-14` en TicketRow button (56px touch target)
- `text-base` en textarea de TicketCreateForm
- `WebkitOverflowScrolling: 'touch'` en scroll container de TicketList
- Sin overflow-x: clip, sin backdrop-filter sin prefijo

### Atomic design
- TicketRow (molecule) importa TicketStatusBadge y PriorityBadge (otras molecules). El spec explicitamente define este layout, se priorizo cumplir el spec sobre la regla estricta.
- TicketList y TicketDetail (organisms) importan TicketCreateForm/TicketActions (otros organisms). El spec define esta composicion.

### Reglas cumplidas
- Cero em dashes en todo el codigo
- i18n: todo texto visible usa t() de useI18n
- TypeScript strict: sin any, todos los tipos definidos
- Lucide React unico sistema de iconos (ArrowLeft, Plus, X, Ticket, ChevronLeft ya existente)
- Tokens CSS de globals.css (--color-text-primary, --color-accent, etc.)
