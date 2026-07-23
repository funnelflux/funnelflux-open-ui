import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import * as authApi from '@/api/auth'
import type { LicenseStatus, SessionResponse, UserProfile } from '@/types/api'

vi.mock('@/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/auth')>()
  return {
    ...actual,
    fetchSession: vi.fn(),
    fetchUserProfile: vi.fn(),
  }
})

const allowedLicense: LicenseStatus = {
  state: 'allowed',
  reasonCode: 'ACTIVE',
  nextCheckAt: '4087675200',
  canRevalidate: true,
}

const lockedLicense: LicenseStatus = {
  state: 'locked',
  reasonCode: 'SUSPENDED',
  nextCheckAt: '4087675200',
  canRevalidate: true,
}

const session = (userId: string, license = allowedLicense): SessionResponse => ({
  authenticated: true,
  userId,
  username: `user-${userId}`,
  isAdmin: false,
  license,
})

const userA = { id: '1', login: 'a' } as UserProfile
const userB = { id: '2', login: 'b' } as UserProfile

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useAuth backend license bootstrap', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchSession).mockReset()
    vi.mocked(authApi.fetchUserProfile).mockReset()
    useAuthStore.setState({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      licenseLockedByResponse: false,
      licenseLockSessionVersion: 0,
    })
  })

  it('does not request protected profile data when bootstrap is locked', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(session('1', lockedLicense))
    const client = makeClient()
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

    await waitFor(() => expect(result.current.isLicenseLocked).toBe(true))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.license?.state).toBe('locked')
    expect(authApi.fetchUserProfile).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('drops user A product data and bootstraps user B after a session swap', async () => {
    useAuthStore.setState({
      session: session('1'),
      user: userA,
      isAuthenticated: true,
      isLoading: false,
    })
    vi.mocked(authApi.fetchSession).mockResolvedValue(session('2'))
    vi.mocked(authApi.fetchUserProfile).mockResolvedValue(userB)

    const client = makeClient()
    client.setQueryData(['campaigns'], [{ id: 'user-a-campaign' }])
    renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

    await waitFor(() => expect(useAuthStore.getState().user?.id).toBe('2'))

    expect(client.getQueryData(['campaigns'])).toBeUndefined()
    expect(client.getQueryData(['license', 'session'])).toEqual(session('2'))
  })

  it('keeps protected data when the authenticated user and allowed license are unchanged', async () => {
    useAuthStore.setState({
      session: session('1'),
      user: userA,
      isAuthenticated: true,
      isLoading: false,
    })
    vi.mocked(authApi.fetchSession).mockResolvedValue(session('1'))
    vi.mocked(authApi.fetchUserProfile).mockResolvedValue(userA)

    const client = makeClient()
    client.setQueryData(['campaigns'], [{ id: 'kept' }])
    renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

    await waitFor(() => expect(authApi.fetchUserProfile).toHaveBeenCalled())
    expect(client.getQueryData(['campaigns'])).toEqual([{ id: 'kept' }])
  })

  it('treats signed outage grace as allowed product access', async () => {
    const graceLicense: LicenseStatus = {
      state: 'allowed_grace',
      reasonCode: 'SERVICE_UNREACHABLE',
      nextCheckAt: '4087675200',
      graceUntil: '4087761600',
      canRevalidate: true,
    }
    vi.mocked(authApi.fetchSession).mockResolvedValue(session('1', graceLicense))
    vi.mocked(authApi.fetchUserProfile).mockResolvedValue(userA)
    const client = makeClient()
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

    await waitFor(() => expect(result.current.user?.id).toBe('1'))

    expect(result.current.isLicenseLocked).toBe(false)
    expect(result.current.license?.state).toBe('allowed_grace')
  })

  it('refreshes the license session on focus, visibility, and reconnect', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(session('1'))
    vi.mocked(authApi.fetchUserProfile).mockResolvedValue(userA)
    const client = makeClient()
    renderHook(() => useAuth(), { wrapper: makeWrapper(client) })
    await waitFor(() => expect(authApi.fetchSession).toHaveBeenCalledTimes(1))

    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(authApi.fetchSession).toHaveBeenCalledTimes(2))

    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(authApi.fetchSession).toHaveBeenCalledTimes(3))

    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
    await waitFor(() => expect(authApi.fetchSession).toHaveBeenCalledTimes(4))
  })

  it('unlocks on the backend next-check timer without another login', async () => {
    vi.useFakeTimers()
    try {
      const timerLicense: LicenseStatus = {
        ...lockedLicense,
        nextCheckAt: String(Math.floor((Date.now() + 1_000) / 1_000)),
      }
      vi.mocked(authApi.fetchSession)
        .mockResolvedValueOnce(session('1', timerLicense))
        .mockResolvedValue(session('1', allowedLicense))
      vi.mocked(authApi.fetchUserProfile).mockResolvedValue(userA)
      const client = makeClient()
      const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(client) })

      await act(async () => {
        await Promise.resolve()
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(result.current.isLicenseLocked).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
        await vi.advanceTimersByTimeAsync(10)
        await Promise.resolve()
      })

      expect(authApi.fetchSession).toHaveBeenCalledTimes(2)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLicenseLocked).toBe(false)
      expect(result.current.user?.id).toBe('1')
    } finally {
      vi.useRealTimers()
    }
  })
})
