import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  username: string
  role: 'admin' | 'operator' | 'dept_admin' | 'employee' | 'auditor'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  login: (user: User, token: string) => void
  logout: () => void
  hasPermission: (requiredRole: string[]) => boolean
  getToken: () => string | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({ user, token, isAuthenticated: true }),
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      },

      hasPermission: (requiredRoles) => {
        const { user } = get()
        if (!user) return false
        
        // 超级管理员拥有所有权限
        if (user.role === 'admin') return true
        
        return requiredRoles.includes(user.role)
      },
      
      getToken: () => get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
)
