import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'

describe('BulkActionsBar', () => {
  it('prevents a second bulk mutation while an extra action is running', async () => {
    let finishAction: (() => void) | undefined
    const extraAction = vi.fn(
      () => new Promise<void>((resolve) => {
        finishAction = resolve
      }),
    )
    const archive = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <BulkActionsBar
        count={2}
        onDeselectAll={vi.fn()}
        onArchive={archive}
        extraActions={[{ key: 'mark-read', label: 'Mark read', onAction: extraAction }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Mark read' }))

    expect(extraAction).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    expect(archive).not.toHaveBeenCalled()

    await act(async () => finishAction?.())

    expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled()
  })
})
