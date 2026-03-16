import { create } from 'zustand'
import type { UserProfile } from '@/types/api'

interface AuthState {
  apiKey: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  setAuth: (apiKey: string, user: UserProfile) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (apiKey, user) =>
    set({ apiKey, user, isAuthenticated: true, isLoading: false, error: null }),

  clearAuth: () =>
    set({ apiKey: null, user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}))
