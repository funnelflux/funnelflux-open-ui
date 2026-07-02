import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bootstrapAuth, sessionMatchesUser } from '@/api/auth'
import { api } from '@/api/client'
import { AuthExpiredError } from '@/api/errors'
import type { SessionResponse, UserProfile } from '@/types/api'

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

const profile = {
  id: '1',
  login: 'user',
  firstname: 'U',
  lastname: '',
  email: 'u@t',
  avatarURL: '',
  isAdmin: false,
  enabled: true,
  permissions: {
    stats: { enabled: true, canView: true, canEditCustomViews: true },
    campaigns: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    trafficSources: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    offerSources: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    offers: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    landers: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    systemLinks: { enabled: true, canView: true },
    storedLinks: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canDelete: true,
      canResetStats: true,
    },
    trafficFilters: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canDelete: true,
      canApplyToPastStats: true,
    },
    dataUpdates: {
      enabled: true,
      canUpdateConversions: true,
      canUpdateTrafficCost: true,
      canResetStats: true,
    },
    systemUpdates: { enabled: true, canView: true, canInstallUpdate: true },
  },
} as const satisfies UserProfile

describe('bootstrapAuth', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('maps AuthExpiredError to AUTH_REQUIRED', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new AuthExpiredError())
    await expect(bootstrapAuth()).rejects.toThrow('AUTH_REQUIRED')
  })

  it('maps unauthenticated session to AUTH_REQUIRED', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      authenticated: false,
      userId: '',
      username: '',
      isAdmin: false,
    })
    await expect(bootstrapAuth()).rejects.toThrow('AUTH_REQUIRED')
  })

  it('loads profile when session is authenticated', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        authenticated: true,
        userId: '1',
        username: 'user',
        isAdmin: false,
      })
      .mockResolvedValueOnce(profile)

    const user = await bootstrapAuth()
    expect(user.login).toBe('user')
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2)
  })
})

describe('sessionMatchesUser', () => {
  const session = (over: Partial<SessionResponse> = {}): SessionResponse => ({
    authenticated: true,
    userId: '1',
    username: 'user',
    isAdmin: false,
    ...over,
  })
  const userWithId = (id: string) => ({ id }) as UserProfile

  it('matches when an authenticated session id equals the cached user id', () => {
    expect(sessionMatchesUser(session(), userWithId('1'))).toBe(true)
  })

  it('does not match when the live session belongs to a different user', () => {
    expect(sessionMatchesUser(session({ userId: '2' }), userWithId('1'))).toBe(false)
  })

  it('does not match when the session is no longer authenticated', () => {
    expect(sessionMatchesUser(session({ authenticated: false }), userWithId('1'))).toBe(false)
  })

  it('does not match when there is no cached user', () => {
    expect(sessionMatchesUser(session(), null)).toBe(false)
  })
})
