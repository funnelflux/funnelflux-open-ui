import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { useSaveCampaign } from '@/api/hooks/useCampaigns'

vi.mock('@/api/client', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/lib/id-generator', () => ({
  generateEntityId: vi.fn(() => '1770000000000000001'),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useSaveCampaign', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.post).mockResolvedValue({
      idCampaign: '1770000000000000001',
      campaignName: 'Test',
      acculumatedUrlParams: [],
      customTokens: [],
      isArchived: false,
    })
  })

  it('generates a numeric campaign id before creating a campaign', async () => {
    const { result } = renderHook(() => useSaveCampaign(), { wrapper })

    result.current.mutate({
      create: true,
      campaignName: 'Test',
      isArchived: false,
    })

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))

    expect(api.post).toHaveBeenCalledWith('/data/campaign/save/', {
      idCampaign: '1770000000000000001',
      campaignName: 'Test',
      acculumatedUrlParams: [],
      customTokens: [],
      isArchived: false,
    })
    expect(api.put).not.toHaveBeenCalled()
  })
})
