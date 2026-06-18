import { create } from 'zustand'

type Role = 'client' | 'agent' | 'admin' | null

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  username: string | null
  projectId: string | null
  isVerified: boolean
  setSession: (token: string, role: Role, userId: string, projectId: string) => void
  clearSession: () => void
  setVerified: (username?: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  username: null,
  projectId: null,
  isVerified: false,
  setSession: (token, role, userId, projectId) =>
    set({ token, role, userId, projectId, isVerified: false, username: null }),
  clearSession: () =>
    set({ token: null, role: null, userId: null, username: null, projectId: null, isVerified: false }),
  setVerified: (username) => set({ isVerified: true, ...(username !== undefined && { username }) }),
}))
