import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUserStore, type User } from '../store/userStore'
import { apiClient } from '../lib/api'

// apiUrl is accepted for API consistency with other hooks but the apiClient uses its own base URL
export function useUsers(_apiUrl: string) {
  const { users, selectedUser, isLoading, fetchUsers, addUser, updateUser, selectUser } =
    useUserStore()
  const { role } = useAuthStore()

  useEffect(() => {
    // Solo admin y agent pueden listar usuarios
    if (role === 'client') return
    void fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createUser = async (data: {
    email: string
    username: string
    password: string
    role: User['role']
  }): Promise<void> => {
    const res = await apiClient.post<{ user: User }>('/api/v1/users', data)
    addUser(res.user)
  }

  const updateUserData = async (
    userId: string,
    data: Partial<{ username: string; password: string; role: User['role']; is_active: boolean }>,
  ): Promise<void> => {
    const res = await apiClient.patch<{ user: User }>(`/api/v1/users/${userId}`, data)
    updateUser(res.user)
  }

  const deactivateUser = async (userId: string): Promise<void> => {
    await apiClient.delete<void>(`/api/v1/users/${userId}`)
    // Backend devuelve 204; marcar como inactivo localmente
    const target = users.find((u) => u.id === userId)
    if (target) {
      updateUser({ ...target, is_active: false })
    }
  }

  return {
    users,
    isLoading,
    selectedUser,
    createUser,
    updateUser: updateUserData,
    deactivateUser,
    selectUser,
    fetchUsers,
  }
}
