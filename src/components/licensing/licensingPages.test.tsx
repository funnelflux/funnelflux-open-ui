import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LicenseGraceBanner } from '@/components/licensing/LicenseGraceBanner'
import { LicenseLockedPage } from '@/components/licensing/LicenseLockedPage'
import { useLicenseRevalidation } from '@/hooks/useLicenseRevalidation'
import { useAuthStore } from '@/store/auth'
import type { LicenseStatus, SessionResponse } from '@/types/api'

vi.mock('@/hooks/useLicenseRevalidation', () => ({
  useLicenseRevalidation: vi.fn(),
}))

const mutate = vi.fn()

const lockedLicense: LicenseStatus = {
  state: 'wrong_domain',
  reasonCode: 'RAW_BACKEND_DETAIL_SHOULD_NOT_RENDER',
  nextCheckAt: '1784030400',
  canRevalidate: true,
}

function revalidationState(overrides: Record<string, unknown> = {}) {
  return {
    mutate,
    isPending: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useLicenseRevalidation>
}

describe('license presentation', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useLicenseRevalidation).mockReturnValue(revalidationState())
  })

  it('renders safe locked-state guidance and permits manual revalidation', () => {
    render(<LicenseLockedPage license={lockedLicense} />)

    expect(screen.getByRole('heading', { name: 'FunnelFlux access is locked' })).toBeInTheDocument()
    expect(screen.getByText('This installation is not licensed for the current domain.')).toBeInTheDocument()
    expect(screen.queryByText(lockedLicense.reasonCode)).not.toBeInTheDocument()
    expect(screen.getByText(/license will be checked again/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Revalidate my license now' }))
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('renders allowed grace as a non-blocking warning with retry', () => {
    const graceLicense: LicenseStatus = {
      state: 'allowed_grace',
      reasonCode: 'SERVICE_UNREACHABLE',
      nextCheckAt: '1784030400',
      graceUntil: '1784116800',
      canRevalidate: true,
    }
    const session: SessionResponse = {
      authenticated: true,
      userId: '1',
      username: 'user',
      isAdmin: false,
      license: graceLicense,
    }
    useAuthStore.setState({ session })

    render(<LicenseGraceBanner />)

    expect(screen.getByRole('status')).toHaveTextContent('signed offline grace period')
    expect(screen.getByRole('status')).toHaveTextContent('until')
    fireEvent.click(screen.getByRole('button', { name: 'Retry license check' }))
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
