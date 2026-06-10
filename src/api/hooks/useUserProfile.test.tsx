import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { useChangeCurrentUserPassword } from './useUserProfile'

vi.mock('@/api/client', () => ({
  api: {
    post: vi.fn(),
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

describe('useChangeCurrentUserPassword', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  it('posts the authenticated current-user password change body', async () => {
    vi.mocked(api.post).mockResolvedValue({})

    const { result } = renderHook(() => useChangeCurrentUserPassword(), { wrapper })
    const body = {
      oldPassword: 'current-password',
      newPassword: 'new-password',
      newPasswordConfirmation: 'new-password',
    }

    await result.current.mutateAsync(body)

    expect(api.post).toHaveBeenCalledWith('/ui/userprofile/changePassword/', body)
  })
})
