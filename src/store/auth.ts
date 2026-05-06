import { create } from 'zustand'
import type { UserProfile } from '@/types/api'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  setAuth: (user: UserProfile) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (user) =>
    set({ user, isAuthenticated: true, isLoading: false, error: null }),

  // Keep isLoading true so AuthGate does not flash the login screen before useAuth re-runs bootstrap.
  clearAuth: () =>
    set({ user: null, isAuthenticated: false, isLoading: true, error: null }),

  setLoading: (isLoading) => set({ isLoading }),

  // Only non-null errors end bootstrap; clearing error for a new attempt must not flip loading off.
  setError: (error) =>
    set(error != null ? { error, isLoading: false } : { error: null }),
}))
