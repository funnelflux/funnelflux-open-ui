import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { useLicenseRevalidation } from '@/hooks/useLicenseRevalidation'

vi.mock('@/api/client', () => ({
  api: { revalidateLicense: vi.fn() },
}))

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useLicenseRevalidation', () => {
  beforeEach(() => {
    vi.mocked(api.revalidateLicense).mockReset()
  })

  it('posts to the backend endpoint and refreshes session state after success', async () => {
    vi.mocked(api.revalidateLicense).mockResolvedValue({
      revalidated: true,
      license: {
        state: 'allowed',
        reasonCode: 'ACTIVE',
        nextCheckAt: '1784030400',
        canRevalidate: true,
      },
    })
    const client = new QueryClient()
    const refetchSpy = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined)
    const { result } = renderHook(() => useLicenseRevalidation(), {
      wrapper: makeWrapper(client),
    })

    await act(async () => result.current.mutateAsync())

    expect(api.revalidateLicense).toHaveBeenCalledWith()
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: ['license', 'session'],
      exact: true,
      type: 'active',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('keeps the failure local while still refreshing authoritative session state', async () => {
    vi.mocked(api.revalidateLicense).mockRejectedValue(new Error('service unavailable'))
    const client = new QueryClient()
    const refetchSpy = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined)
    const { result } = renderHook(() => useLicenseRevalidation(), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(refetchSpy).toHaveBeenCalled()
  })
})
