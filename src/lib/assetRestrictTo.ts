import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { flattenRestrictIds } from '@/lib/parseRestrictIds'
import type { UserProfile } from '@/types/api'

export type AssetRestrictScope =
  | 'campaigns'
  | 'trafficSources'
  | 'offerSources'
  | 'offers'
  | 'landers'

export interface AssetRestrictFilter {
  assetIds: Set<string>
  categoryIds: Set<string>
}

export function getAssetRestrictFilter(
  user: UserProfile | null | undefined,
  scope: AssetRestrictScope,
): AssetRestrictFilter | null {
  if (!user?.permissions || user.isAdmin) return null

  if (scope === 'offers' || scope === 'landers') {
    const section = user.permissions[scope]
    const assetIds = flattenRestrictIds(section.restrictToAssetIds ?? [])
    const categoryIds = flattenRestrictIds(section.restrictToCategoryIds ?? [])
    if (assetIds.length === 0 && categoryIds.length === 0) return null
    return { assetIds: new Set(assetIds), categoryIds: new Set(categoryIds) }
  }

  const ids = flattenRestrictIds(user.permissions[scope].restrictTo ?? [])
  if (ids.length === 0) return null
  return { assetIds: new Set(ids), categoryIds: new Set() }
}

export function isEntityRowAllowedByRestrictFilter(
  row: EntityGridRow,
  filter: AssetRestrictFilter | null | undefined,
): boolean {
  if (!filter) return true
  if (row.id === '__totals__') return true
  if ((row as { _isCategoryHeader?: boolean })._isCategoryHeader) return true

  const categoryId = row.categoryId != null ? String(row.categoryId) : ''
  const matchesAsset = filter.assetIds.has(row.id)
  const matchesCategory = categoryId !== '' && filter.categoryIds.has(categoryId)

  if (filter.assetIds.size > 0 && filter.categoryIds.size > 0) {
    return matchesAsset || matchesCategory
  }
  if (filter.assetIds.size > 0) return matchesAsset
  if (filter.categoryIds.size > 0) return matchesCategory
  return true
}

export function filterRowsByAssetRestrict<T extends EntityGridRow>(
  rows: T[],
  filter: AssetRestrictFilter | null | undefined,
): T[] {
  if (!filter) return rows
  return rows.filter((row) => isEntityRowAllowedByRestrictFilter(row, filter))
}
