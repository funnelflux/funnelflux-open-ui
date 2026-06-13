import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Permissions } from '@/types/api'
import { PermissionsGrid } from './PermissionsGrid'

function emptyPermissions(): Permissions {
  return {
    stats: { enabled: false, canView: false, canEditCustomViews: false },
    campaigns: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canArchive: false,
      canDelete: false,
      restrictTo: [],
    },
    trafficSources: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canArchive: false,
      canDelete: false,
      restrictTo: [],
    },
    offerSources: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canArchive: false,
      canDelete: false,
      restrictTo: [],
    },
    offers: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canArchive: false,
      canDelete: false,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    landers: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canArchive: false,
      canDelete: false,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    systemLinks: { enabled: false, canView: false },
    storedLinks: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canDelete: false,
      canResetStats: false,
    },
    trafficFilters: {
      enabled: false,
      canView: false,
      canCreateNew: false,
      canEdit: false,
      canDelete: false,
      canApplyToPastStats: false,
    },
    dataUpdates: {
      enabled: false,
      canUpdateConversions: false,
      canUpdateTrafficCost: false,
      canResetStats: false,
    },
    systemUpdates: { enabled: false, canView: false, canInstallUpdate: false },
  }
}

describe('PermissionsGrid restrictTo inputs', () => {
  it('keeps trailing comma visible while typing', async () => {
    const user = userEvent.setup()
    render(<PermissionsGrid value={emptyPermissions()} onChange={vi.fn()} />)

    const input = screen.getAllByPlaceholderText('Comma-separated IDs')[0]!
    await user.type(input, '1,')

    expect(input).toHaveValue('1,')
  })

  it('normalizes draft on blur and updates parent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PermissionsGrid value={emptyPermissions()} onChange={onChange} />)

    const input = screen.getAllByPlaceholderText('Comma-separated IDs')[0]!
    await user.type(input, ' 1 , 2 , ')
    await user.tab()

    expect(input).toHaveValue('1, 2')
    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Permissions
    expect(lastCall.campaigns.restrictTo).toEqual(['1', '2'])
  })

  it('splits space-separated pasted IDs on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PermissionsGrid value={emptyPermissions()} onChange={onChange} />)

    const input = screen.getAllByPlaceholderText('Comma-separated IDs')[0]!
    await user.click(input)
    await user.paste('1771233115515945252 2042599472509348758')
    await user.tab()

    expect(input).toHaveValue('1771233115515945252, 2042599472509348758')
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Permissions
    expect(lastCall.campaigns.restrictTo).toEqual([
      '1771233115515945252',
      '2042599472509348758',
    ])
  })
})
