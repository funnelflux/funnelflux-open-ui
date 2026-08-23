import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Badge } from '@/components/ui-kit/Badge'
import { FormModal, FormModalHeader } from '@/components/ui-kit/FormModal/FormModal'
import { Tag } from '@/components/ui-kit/Tag'

vi.mock('@/components/ui-kit/Modal', () => ({
  Modal: ({ children, onCancel }: { children: ReactNode; onCancel?: (event: unknown) => void }) => (
    <div>
      <button type="button" aria-label="Trigger modal cancel" onClick={() => onCancel?.({})}>
        Trigger modal cancel
      </button>
      {children}
    </div>
  ),
}))

describe('FormModal', () => {
  const confirmMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('confirm', confirmMock)
    confirmMock.mockReset()
    confirmMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('guards dirty dismissal until the user confirms', () => {
    const onCancel = vi.fn()

    render(
      <FormModal open isDirty onCancel={onCancel}>
        <FormModalHeader title="Edit funnel" />
      </FormModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trigger modal cancel' }))
    expect(confirmMock).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close this form?')
    expect(onCancel).not.toHaveBeenCalled()

    confirmMock.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('semantic status variants', () => {
  it('applies tokenized Tag classes', () => {
    render(<Tag variant="success">Active</Tag>)

    expect(screen.getByText('Active').closest('.ant-tag')).toHaveClass(
      '!bg-success/10',
      '!border-success/30',
      '!text-success-text',
    )
  })

  it('uses tokenized Badge indicator colors', () => {
    render(<Badge variant="error" count={2} />)

    expect(screen.getByText('2').closest('.ant-badge-count')).toHaveStyle({
      background: 'var(--ff-error)',
    })
  })
})
