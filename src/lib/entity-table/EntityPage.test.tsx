import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PageShell } from '@/components/ui-kit/PageShell'

describe('EntityPage / PageShell workflow', () => {
  it('PageShell hides primary children and shows error + retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <PageShell
        title="Test"
        bodyState={{ status: 'error', message: 'Network down', onRetry }}
      >
        <div>Secret grid</div>
      </PageShell>,
    )
    expect(screen.getByText('Network down')).toBeInTheDocument()
    expect(screen.queryByText('Secret grid')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('PageShell shows loading state instead of children', () => {
    render(
      <PageShell title="T" bodyState={{ status: 'loading' }}>
        <div>Body</div>
      </PageShell>,
    )
    expect(screen.queryByText('Body')).not.toBeInTheDocument()
  })
})
