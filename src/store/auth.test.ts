import { describe, it, expect } from 'vitest'
import { useAuthStore } from '@/store/auth'

describe('useAuthStore setError', () => {
  it('does not set isLoading false when clearing error (bootstrap retry)', () => {
    useAuthStore.setState({ isLoading: true, error: 'AUTH_REQUIRED' })
    useAuthStore.getState().setError(null)
    const s = useAuthStore.getState()
    expect(s.error).toBeNull()
    expect(s.isLoading).toBe(true)
  })
})

describe('useAuthStore clearAuth', () => {
  it('clears error along with user state', () => {
    useAuthStore.setState({
      session: null,
      user: { id: '1' } as import('@/types/api').UserProfile,
      isAuthenticated: true,
      isLoading: false,
      error: 'x',
      licenseLockedByResponse: true,
      licenseLockSessionVersion: 42,
    })
    useAuthStore.getState().clearAuth()
    const s = useAuthStore.getState()
    expect(s.user).toBeNull()
    expect(s.isAuthenticated).toBe(false)
    expect(s.error).toBeNull()
    expect(s.isLoading).toBe(true)
    expect(s.session).toBeNull()
    expect(s.licenseLockedByResponse).toBe(false)
  })
})
