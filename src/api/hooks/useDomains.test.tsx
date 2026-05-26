import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import {
  useDomains,
  useEditDomain,
  useSaveDomain,
  useSetDefaultTrackingDomain,
  useSetWebRootDomain,
  useWebRootDomain,
} from './useDomains'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
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

describe('useDomains', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(api.put).mockReset()
    vi.mocked(api.delete).mockReset()
  })

  it('loads inventory and tracking default from separate endpoints', async () => {
    vi.mocked(api.get).mockImplementation((endpoint: string) => {
      if (endpoint === '/system/domain/list/') {
        return Promise.resolve(['example.com', 'track.example.com'])
      }
      if (endpoint === '/system/domain/default/') {
        return Promise.resolve('track.example.com')
      }
      return Promise.reject(new Error(`Unexpected endpoint ${endpoint}`))
    })

    const { result } = renderHook(() => useDomains(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/system/domain/list/')
    expect(api.get).toHaveBeenCalledWith('/system/domain/default/')
    expect(result.current.data?.map((domain) => [domain.domain, domain.isDefault])).toEqual([
      ['example.com', false],
      ['track.example.com', true],
    ])
  })

  it('uses the webroot endpoint for login / license domain state', async () => {
    vi.mocked(api.get).mockResolvedValue({
      domain: 'login.example.com',
      webRoot: 'https://login.example.com/',
    })

    const { result } = renderHook(() => useWebRootDomain(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/system/domain/webroot/')
    expect(result.current.data).toEqual({
      domain: 'login.example.com',
      webRoot: 'https://login.example.com/',
    })
  })

  it('keeps add, edit, tracking default, and webroot mutations on distinct endpoints', async () => {
    vi.mocked(api.post).mockResolvedValue({})
    vi.mocked(api.put).mockResolvedValue({})

    const add = renderHook(() => useSaveDomain(), { wrapper })
    const edit = renderHook(() => useEditDomain(), { wrapper })
    const tracking = renderHook(() => useSetDefaultTrackingDomain(), { wrapper })
    const webRoot = renderHook(() => useSetWebRootDomain(), { wrapper })

    await add.result.current.mutateAsync('new.example.com')
    await edit.result.current.mutateAsync({
      oldDomain: 'old.example.com',
      newDomain: 'new.example.com',
    })
    await tracking.result.current.mutateAsync('track.example.com')
    await webRoot.result.current.mutateAsync('login.example.com')

    expect(api.post).toHaveBeenCalledWith('/system/domain/save/', undefined, {
      domain: 'new.example.com',
    })
    expect(api.put).toHaveBeenCalledWith('/system/domain/save/', undefined, {
      oldDomain: 'old.example.com',
      newDomain: 'new.example.com',
    })
    expect(api.put).toHaveBeenCalledWith('/system/domain/default/', undefined, {
      domain: 'track.example.com',
    })
    expect(api.put).toHaveBeenCalledWith('/system/domain/webroot/', undefined, {
      domain: 'login.example.com',
    })
  })
})
