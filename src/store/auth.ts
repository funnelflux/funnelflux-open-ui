import { create } from 'zustand'
import type { SessionResponse, UserProfile } from '@/types/api'

interface AuthState {
  session: SessionResponse | null
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  licenseLockedByResponse: boolean
  licenseLockSessionVersion: number

  setSession: (session: SessionResponse) => void
  setAuth: (user: UserProfile) => void
  clearProtectedProfile: () => void
  setLicenseLockedByResponse: (locked: boolean, sessionVersion?: number) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  licenseLockedByResponse: false,
  licenseLockSessionVersion: 0,

  setSession: (session) =>
    set((state) => ({
      session,
      user: session.authenticated ? state.user : null,
      isAuthenticated: session.authenticated,
      isLoading: false,
      error: session.authenticated ? null : 'AUTH_REQUIRED',
    })),

  setAuth: (user) =>
    set({ user, isAuthenticated: true, isLoading: false, error: null }),

  clearProtectedProfile: () => set({ user: null, isLoading: false }),

  setLicenseLockedByResponse: (licenseLockedByResponse, sessionVersion = 0) =>
    set({
      licenseLockedByResponse,
      licenseLockSessionVersion: licenseLockedByResponse ? sessionVersion : 0,
    }),

  // Keep isLoading true so AuthGate does not flash the login screen before useAuth re-runs bootstrap.
  clearAuth: () =>
    set({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      licenseLockedByResponse: false,
      licenseLockSessionVersion: 0,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  // Only non-null errors end bootstrap; clearing error for a new attempt must not flip loading off.
  setError: (error) =>
    set(error != null ? { error, isLoading: false } : { error: null }),
}))
