import { create } from 'zustand'
import { apiClient } from '../lib/api'

export interface Ticket {
  id: string
  title: string
  description?: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  client_id: string
  client_username: string
  agent_id?: string
  agent_username?: string
  created_at: string
  updated_at: string
}

interface TicketState {
  tickets: Ticket[]
  selectedTicket: Ticket | null
  isLoading: boolean
  fetchTickets: (apiUrl: string, token: string) => Promise<void>
  updateTicket: (ticket: Ticket) => void
  selectTicket: (ticket: Ticket | null) => void
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  selectedTicket: null,
  isLoading: false,

  fetchTickets: async (_apiUrl, _token) => {
    set({ isLoading: true })
    try {
      const data = await apiClient.get<{ tickets: Ticket[] }>('/api/v1/tickets')
      set({ tickets: data.tickets, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  updateTicket: (ticket) =>
    set((s) => ({
      tickets: s.tickets.map((t) => (t.id === ticket.id ? ticket : t)),
      selectedTicket: s.selectedTicket?.id === ticket.id ? ticket : s.selectedTicket,
    })),

  selectTicket: (ticket) => set({ selectedTicket: ticket }),
}))
