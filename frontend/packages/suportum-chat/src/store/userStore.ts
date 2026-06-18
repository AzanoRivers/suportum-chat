import { create } from 'zustand'
import { apiClient } from '../lib/api'

export interface User {
  id: string
  email: string
  username: string
  role: 'client' | 'agent' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UserState {
  users: User[]
  selectedUser: User | null
  isLoading: boolean
  fetchUsers: () => Promise<void>
  addUser: (user: User) => void
  updateUser: (user: User) => void
  selectUser: (user: User | null) => void
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  selectedUser: null,
  isLoading: false,

  fetchUsers: async () => {
    set({ isLoading: true })
    try {
      const data = await apiClient.get<{ users: User[] }>('/api/v1/users')
      set({ users: data.users, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  addUser: (user) =>
    set((s) => ({ users: [user, ...s.users] })),

  updateUser: (user) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === user.id ? user : u)),
      selectedUser: s.selectedUser?.id === user.id ? user : s.selectedUser,
    })),

  selectUser: (user) => set({ selectedUser: user }),
}))
