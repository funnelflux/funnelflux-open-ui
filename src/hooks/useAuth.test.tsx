import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import * as authApi from '@/api/auth'
import type { UserProfile } from '@/types/api'

// Keep the real sessionMatchesUser; only stub the network calls.
vi.mock('@/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/auth')>()
  return { ...actual, fetchSession: vi.fn(), bootstrapAuth: vi.fn() }
})

const userA = { id: '1', login: 'a' } as UserProfile
const userB = { id: '2', login: 'b' } as UserProfile

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useAuth session reconciliation on wake', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchSession).mockReset()
    vi.mocked(authApi.bootstrapAuth).mockReset()
    useAuthStore.setState({ user: userA, isAuthenticated: true, isLoading: false, error: null })
  })

  it('swaps to the new user AND clears the query cache when the live session is a different user', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue({
      authenticated: true,
      userId: '2',
      username: 'b',
      isAdmin: false,
    })
    vi.mocked(authApi.bootstrapAuth).mockResolvedValue(userB)

    const client = new QueryClient()
    const clearSpy = vi.spyOn(client, 'clear')

    renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

    // Simulate the user returning to the tab after a session swap.
    window.dispatchEvent(new Event('focus'))

    await waitFor(() => {
      expect(useAuthStore.getState().user?.id).toBe('2')
    })
    // The previous user's cached query data must be dropped, not just the auth store.
    expect(clearSpy).toHaveBeenCalled()
    expect(authApi.bootstrapAuth).toHaveBeenCalled()
  })

  it('does not clear the cache or re-bootstrap when the live session matches the cached user', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue({
      authenticated: true,
      userId: '1',
      username: 'a',
      isAdmin: false,
    })

    const client = new QueryClient()
    const clearSpy = vi.spyOn(client, 'clear')

    renderHook(() => useAuth(), { wrapper: makeWrapper(client) })
    window.dispatchEvent(new Event('focus'))

    await waitFor(() => expect(authApi.fetchSession).toHaveBeenCalled())
    await Promise.resolve()

    expect(clearSpy).not.toHaveBeenCalled()
    expect(authApi.bootstrapAuth).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user?.id).toBe('1')
  })
})
