import { create } from 'zustand'

type Role = 'client' | 'agent' | 'admin' | null

interface AuthState {
  token: string | null
  role: Role
  userId: string | null
  projectId: string | null
  isVerified: boolean
  setSession: (token: string, role: Role, userId: string, projectId: string) => void
  clearSession: () => void
  setVerified: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  projectId: null,
  isVerified: false,
  setSession: (token, role, userId, projectId) =>
    set({ token, role, userId, projectId, isVerified: false }),
  clearSession: () =>
    set({ token: null, role: null, userId: null, projectId: null, isVerified: false }),
  setVerified: () => set({ isVerified: true }),
}))
