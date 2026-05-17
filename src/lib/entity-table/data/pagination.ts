/** Matches drilldown UI cap for lazy asset tables. */
export const MAX_ASSET_TABLE_PAGE_SIZE = 200

export function clampAssetPageSize(size: number): number {
  const n = Number.isFinite(size) ? Math.trunc(size) : 50
  return Math.min(MAX_ASSET_TABLE_PAGE_SIZE, Math.max(1, n))
}
