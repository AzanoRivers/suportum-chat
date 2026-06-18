import { create } from 'zustand'
import { apiClient } from '../lib/api'

export interface Order {
  id: string
  project_id: string
  type: string
  title: string
  details: Record<string, unknown>
  status: 'pending' | 'active' | 'taken' | 'completed' | 'cancelled'
  client_id: string
  client_name: string
  agent_id?: string | null
  agent_name?: string | null
  created_at: string
  updated_at: string
}

interface OrderState {
  orders: Order[]
  selectedOrder: Order | null
  isLoading: boolean
  fetchOrders: (apiUrl: string) => Promise<void>
  addOrder: (order: Order) => void
  updateOrder: (order: Order) => void
  selectOrder: (order: Order | null) => void
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,

  fetchOrders: async (_apiUrl) => {
    set({ isLoading: true })
    try {
      const data = await apiClient.get<{ orders: Order[] }>('/api/v1/orders')
      set({ orders: data.orders, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  addOrder: (order) =>
    set((s) => ({ orders: [order, ...s.orders] })),

  updateOrder: (order) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === order.id ? order : o)),
      selectedOrder: s.selectedOrder?.id === order.id ? order : s.selectedOrder,
    })),

  selectOrder: (order) => set({ selectedOrder: order }),
}))
