import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTicketStore, type Ticket } from '../store/ticketStore'
import { useSocket } from './useSocket'
import { apiClient } from '../lib/api'

export function useTickets(apiUrl: string, apiKey: string) {
  const { tickets, selectedTicket, isLoading, fetchTickets, updateTicket, selectTicket } =
    useTicketStore()
  const { token } = useAuthStore()
  const socket = useSocket(apiKey)

  useEffect(() => {
    void fetchTickets(apiUrl, token ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!socket) return

    const handler = ({ ticket }: { ticket: Ticket }) => {
      updateTicket(ticket)
    }

    socket.on('ticket:updated', handler)
    return () => {
      socket.off('ticket:updated', handler)
    }
  }, [socket, updateTicket])

  const createTicket = async (data: {
    title: string
    description?: string
    priority: string
  }): Promise<void> => {
    await apiClient.post('/api/v1/tickets', data)
    await fetchTickets(apiUrl, token ?? '')
  }

  const updateTicketStatus = async (ticketId: string, status: string): Promise<void> => {
    const updated = await apiClient.patch<{ ticket: Ticket }>(
      `/api/v1/tickets/${ticketId}/status`,
      { status },
    )
    updateTicket(updated.ticket)
  }

  const assignTicket = async (ticketId: string): Promise<void> => {
    const updated = await apiClient.patch<{ ticket: Ticket }>(
      `/api/v1/tickets/${ticketId}/assign`,
      {},
    )
    updateTicket(updated.ticket)
  }

  return {
    tickets,
    isLoading,
    selectedTicket,
    createTicket,
    updateTicketStatus,
    assignTicket,
    selectTicket,
  }
}
