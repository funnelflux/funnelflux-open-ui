import { beforeEach, describe, expect, it } from 'vitest'
import { executeObservedRequest } from '@/api/observedRequest'
import { LicenseLockedError } from '@/api/errors'
import { createQueryClient } from '@/api/queryClient'
import {
  handleLicenseLockedResponse,
} from '@/lib/licenseAccess'
import { getLicenseRefreshDelay, getSafeLicenseReason } from '@/lib/licenseState'
import { useAuthStore } from '@/store/auth'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import type { LicenseStatus, SessionResponse, UserProfile } from '@/types/api'

const allowedLicense: LicenseStatus = {
  state: 'allowed',
  reasonCode: 'ACTIVE',
  nextCheckAt: '1784030400',
  canRevalidate: true,
}

const session: SessionResponse = {
  authenticated: true,
  userId: '1',
  username: 'user',
  isAdmin: false,
  license: allowedLicense,
}

describe('license access transitions', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session,
      user: { id: '1' } as UserProfile,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      licenseLockedByResponse: false,
      licenseLockSessionVersion: 0,
    })
    useFunnelEditorStore.getState().initializeNewFunnel({
      idCampaign: 'campaign-1',
      idFunnel: 'funnel-1',
    })
  })

  it('preserves session bootstrap while clearing protected query, mutation, profile, and editor state', () => {
    const client = createQueryClient()
    client.setQueryData(['license', 'session'], session)
    client.setQueryData(['campaigns'], [{ id: 'campaign-1' }])
    client.getMutationCache().build(client, {
      mutationKey: ['product-save'],
      mutationFn: async () => undefined,
    })

    handleLicenseLockedResponse(client)

    expect(client.getQueryData(['license', 'session'])).toEqual(session)
    expect(client.getQueryData(['campaigns'])).toBeUndefined()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(useAuthStore.getState().session).toEqual(session)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().licenseLockedByResponse).toBe(true)
    expect(useFunnelEditorStore.getState().nodes).toHaveLength(0)
  })

  it('does not let an in-flight product query repopulate the cache after locking', async () => {
    const client = createQueryClient()
    client.setQueryData(['license', 'session'], session)
    let resolveRequest: ((value: string[]) => void) | undefined
    const request = client.fetchQuery({
      queryKey: ['campaigns'],
      queryFn: () => new Promise<string[]>((resolve) => {
        resolveRequest = resolve
      }),
    })

    handleLicenseLockedResponse(client)
    resolveRequest?.(['late-campaign'])
    await request.catch(() => undefined)

    expect(client.getQueryData(['campaigns'])).toBeUndefined()
  })

  it('routes imperative request failures through the existing MutationCache lock handler', async () => {
    const client = createQueryClient()
    client.setQueryData(['license', 'session'], session)
    client.setQueryData(['funnels'], [{ id: 'funnel-1' }])

    await expect(
      executeObservedRequest(client, async () => {
        throw new LicenseLockedError('Locked', {
          code: 423,
          errorCode: 'LICENSE_LOCKED',
          message: 'Locked',
        })
      }),
    ).rejects.toBeInstanceOf(LicenseLockedError)

    expect(useAuthStore.getState().licenseLockedByResponse).toBe(true)
    expect(client.getQueryData(['funnels'])).toBeUndefined()
  })

  it('routes protected query failures through the existing QueryCache lock handler', async () => {
    const client = createQueryClient()
    client.setQueryData(['license', 'session'], session)
    client.setQueryData(['pages'], [{ id: 'page-1' }])

    await expect(
      client.fetchQuery({
        queryKey: ['domains'],
        retry: false,
        queryFn: async () => {
          throw new LicenseLockedError('Locked', {
            code: 423,
            errorCode: 'LICENSE_LOCKED',
            message: 'Locked',
          })
        },
      }),
    ).rejects.toBeInstanceOf(LicenseLockedError)

    expect(useAuthStore.getState().licenseLockedByResponse).toBe(true)
    expect(client.getQueryData(['pages'])).toBeUndefined()
  })
})

describe('license presentation helpers', () => {
  it('does not expose an unknown backend reason code as display text', () => {
    expect(
      getSafeLicenseReason({
        state: 'locked',
        reasonCode: '<script>untrusted detail</script>',
        nextCheckAt: '0',
        canRevalidate: false,
      }),
    ).toBe('This FunnelFlux license is inactive or suspended.')
  })

  it('uses the backend next-check time with safe lower and upper timer bounds', () => {
    const now = Date.parse('2026-07-14T12:00:00Z')
    expect(getLicenseRefreshDelay({ ...allowedLicense, nextCheckAt: '1784030430' }, now)).toBe(30_000)
    expect(getLicenseRefreshDelay({ ...allowedLicense, nextCheckAt: '1784026800' }, now)).toBe(1_000)
    expect(getLicenseRefreshDelay({ ...allowedLicense, nextCheckAt: '4070908800' }, now)).toBe(3_600_000)
  })
})
