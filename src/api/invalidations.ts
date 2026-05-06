import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import type { ApiError } from '@/types/api'

/** Result of a bulk API workflow with per-id failures preserved. */
export type BulkResult<T> = {
  succeeded: T[]
  failed: { id: string; error: ApiError }[]
}

export function emptyBulkResult<T>(): BulkResult<T> {
  return { succeeded: [], failed: [] }
}

/**
 * Invalidate loaded page lists, entity-grid caches keyed under {@link queryKeys.pages},
 * and drilldown grouping dropdown assets for pages.
 */
export async function invalidatePageData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.pages.all }),
    qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.pageList('lander') }),
    qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.pageList('offer') }),
    qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.pageCategories() }),
  ])
}

/** Traffic sources grids + grouping filter asset list for drilldown. */
export async function invalidateTrafficSourceData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all }),
    qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.trafficSourcesList() }),
  ])
}

/** Offer sources grids + grouping filter asset union query. */
export async function invalidateOfferSourceData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.offerSources.all }),
    qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.offerSourcesAllStatuses() }),
  ])
}

/**
 * Category strip lists and dependent grouping assets / entity grids for the given entity.
 */
export async function invalidateCategoryData(
  qc: QueryClient,
  entityType?: string,
): Promise<void> {
  await qc.invalidateQueries({ queryKey: queryKeys.categories.all })
  if (entityType === 'page' || entityType == null) {
    await qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.pageCategories() })
  }
  if (entityType === 'page') {
    await invalidatePageData(qc)
  } else if (entityType === 'trafficsource') {
    await invalidateTrafficSourceData(qc)
  }
}
