import { useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useOrderStore, type Order } from '../store/orderStore'
import { useSocket } from './useSocket'
import { apiClient } from '../lib/api'

export function useOrders(apiUrl: string, apiKey: string) {
  const { orders, selectedOrder, isLoading, fetchOrders, addOrder, updateOrder, selectOrder } =
    useOrderStore()
  const { role } = useAuthStore()
  const socket = useSocket(apiKey)

  useEffect(() => {
    void fetchOrders(apiUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Agent/admin: unirse al room orders:board para recibir updates en tiempo real
  useEffect(() => {
    if (!socket || role === 'client') return
    socket.emit('room:join', { room_id: 'orders:board' })
  }, [socket, role])

  useEffect(() => {
    if (!socket) return
    const handler = ({ order, action }: { order: Order; action: string }) => {
      if (action === 'created') addOrder(order)
      else updateOrder(order)
    }
    socket.on('order:updated', handler)
    return () => {
      socket.off('order:updated', handler)
    }
  }, [socket, addOrder, updateOrder])

  const byStatus = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === 'pending'),
      active: orders.filter((o) => o.status === 'active'),
      taken: orders.filter((o) => o.status === 'taken'),
      completed: orders.filter((o) => o.status === 'completed'),
      cancelled: orders.filter((o) => o.status === 'cancelled'),
    }),
    [orders],
  )

  const createOrder = async (data: {
    type: string
    title: string
    details?: Record<string, unknown>
  }): Promise<void> => {
    await apiClient.post('/api/v1/orders', data)
    await fetchOrders(apiUrl)
  }

  const updateOrderStatus = async (orderId: string, status: string): Promise<void> => {
    const updated = await apiClient.patch<{ order: Order }>(
      `/api/v1/orders/${orderId}`,
      { status },
    )
    updateOrder(updated.order)
  }

  return { orders, byStatus, isLoading, selectedOrder, createOrder, updateOrderStatus, selectOrder, fetchOrders }
}
