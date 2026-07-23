import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { useOfferSources } from '@/api/hooks/useOfferSources'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useOfferSources', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockResolvedValue([])
  })

  it('includes archived offer sources by default for entity forms', async () => {
    const { result } = renderHook(() => useOfferSources(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/data/offersource/find/byStatus/', {
      status: 'all',
    })
  })

  it('preserves explicit status filtering for list views', async () => {
    const { result } = renderHook(() => useOfferSources('active'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/data/offersource/find/byStatus/', {
      status: 'active',
    })
  })
})
