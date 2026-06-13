import { describe, expect, it } from 'vitest'
import {
  filterRowsByAssetRestrict,
  getAssetRestrictFilter,
  isEntityRowAllowedByRestrictFilter,
} from './assetRestrictTo'
import type { UserProfile } from '@/types/api'

function userWithTrafficSourceRestrict(ids: string[]): UserProfile {
  return {
    id: '1',
    login: 'u',
    firstname: '',
    lastname: '',
    email: 'u@test.com',
    avatarURL: '',
    isAdmin: false,
    enabled: true,
    permissions: {
      stats: { enabled: true, canView: true, canEditCustomViews: false },
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
        enabled: true,
        canView: true,
        canCreateNew: true,
        canEdit: true,
        canArchive: true,
        canDelete: true,
        restrictTo: ids,
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
    },
  }
}

describe('getAssetRestrictFilter', () => {
  it('returns null for admin users', () => {
    const user = userWithTrafficSourceRestrict(['1'])
    user.isAdmin = true
    expect(getAssetRestrictFilter(user, 'trafficSources')).toBeNull()
  })

  it('splits legacy merged restrictTo entries', () => {
    const filter = getAssetRestrictFilter(
      userWithTrafficSourceRestrict(['1771233115515945252 2042599472509348758']),
      'trafficSources',
    )
    expect(filter?.assetIds).toEqual(
      new Set(['1771233115515945252', '2042599472509348758']),
    )
  })
})

describe('filterRowsByAssetRestrict', () => {
  it('keeps only allowed traffic source rows', () => {
    const filter = getAssetRestrictFilter(
      userWithTrafficSourceRestrict(['1771233115515945252', '2042599472509348758']),
      'trafficSources',
    )
    const rows = [
      { id: '1771233115515945252', name: 'Taboola', cells: [] },
      { id: '2042599472509348758', name: 'Google', cells: [] },
      { id: '999', name: 'Other', cells: [] },
    ]
    expect(filterRowsByAssetRestrict(rows, filter).map((row) => row.id)).toEqual([
      '1771233115515945252',
      '2042599472509348758',
    ])
  })

  it('always keeps totals rows', () => {
    const filter = getAssetRestrictFilter(userWithTrafficSourceRestrict(['1']), 'trafficSources')
    expect(isEntityRowAllowedByRestrictFilter({ id: '__totals__', name: 'Totals', cells: [] }, filter)).toBe(true)
  })
})
