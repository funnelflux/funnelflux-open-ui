import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import type { ApiError } from '@/types/api'
import { ENTITY_GRID_LIST_KEY, ENTITY_GRID_STATS_KEY } from '@/lib/entityGridQueryCache'

/** Result of a bulk API workflow with per-id failures preserved. */
export type BulkResult<T> = {
  succeeded: T[]
  failed: { id: string; error: ApiError }[]
}

export function emptyBulkResult<T>(): BulkResult<T> {
  return { succeeded: [], failed: [] }
}

/**
 * Entity-grid React Query keys use `[prefix, entityGridList|entityGridStats, ...]`.
 * Broad `invalidateQueries({ queryKey: prefix })` refetches **both** list + expensive drilldown stats.
 * After `setQueryData` list patches, prefer {@link invalidatePageAuxiliaryAfterGridPatch} (and TS/OS analogs)
 * so drilldown is not re-run unless metrics could have changed.
 */

function segmentAt(queryKey: unknown, index: number): unknown {
  const k = queryKey as unknown[]
  return Array.isArray(k) ? k[index] : undefined
}

/* ─── Pages ─────────────────────────────────────────────────────────── */

export async function invalidatePageSimpleListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.pages.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === 'list',
    refetchType: 'inactive',
  })
}

export async function invalidatePageEntityGridListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.pages.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_LIST_KEY,
  })
}

export async function invalidatePageEntityGridStatsQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.pages.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_STATS_KEY,
  })
}

export async function invalidatePageGroupingAssets(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({
      queryKey: queryKeys.groupingFilterAssets.pageList('lander'),
      refetchType: 'inactive',
    }),
    qc.invalidateQueries({
      queryKey: queryKeys.groupingFilterAssets.pageList('offer'),
      refetchType: 'inactive',
    }),
    qc.invalidateQueries({
      queryKey: queryKeys.groupingFilterAssets.pageCategories(),
      refetchType: 'inactive',
    }),
  ])
}

/**
 * After mutating entity-grid list rows via `entityGridQueryCache` helpers: sync plain `usePages` lists
 * and drilldown grouping dropdown assets without refetching drilldown stats for the grid.
 */
export async function invalidatePageAuxiliaryAfterGridPatch(qc: QueryClient): Promise<void> {
  await Promise.all([invalidatePageSimpleListQueries(qc), invalidatePageGroupingAssets(qc)])
}

/**
 * Category renames / moves: list rows (and category column) must refresh; stats typically unchanged.
 */
export async function invalidatePageDataAfterCategoryChange(qc: QueryClient): Promise<void> {
  await Promise.all([
    invalidatePageEntityGridListQueries(qc),
    invalidatePageSimpleListQueries(qc),
    invalidatePageGroupingAssets(qc),
  ])
}

/**
 * Full invalidation: imports, unknown server-side changes, or when list cache was not patched.
 * Refetches all `pages` queries including entity-grid drilldown stats.
 */
export async function invalidatePageData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.pages.all }),
    invalidatePageGroupingAssets(qc),
  ])
}

/* ─── Traffic sources ───────────────────────────────────────────────── */

export async function invalidateTrafficSourceSimpleListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.trafficSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === 'list',
  })
}

export async function invalidateTrafficSourceEntityGridListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.trafficSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_LIST_KEY,
  })
}

export async function invalidateTrafficSourceEntityGridStatsQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.trafficSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_STATS_KEY,
  })
}

export async function invalidateTrafficSourceGroupingAsset(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.trafficSourcesList() })
}

export async function invalidateTrafficSourceAuxiliaryAfterGridPatch(qc: QueryClient): Promise<void> {
  await Promise.all([
    invalidateTrafficSourceSimpleListQueries(qc),
    invalidateTrafficSourceGroupingAsset(qc),
  ])
}

export async function invalidateTrafficSourceDataAfterCategoryChange(qc: QueryClient): Promise<void> {
  await Promise.all([
    invalidateTrafficSourceEntityGridListQueries(qc),
    invalidateTrafficSourceSimpleListQueries(qc),
    invalidateTrafficSourceGroupingAsset(qc),
  ])
}

/** Full: all trafficSources keys + grouping asset (includes entity-grid stats). */
export async function invalidateTrafficSourceData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all }),
    invalidateTrafficSourceGroupingAsset(qc),
  ])
}

/* ─── Offer sources ───────────────────────────────────────────────────── */

export async function invalidateOfferSourceSimpleListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.offerSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === 'list',
  })
}

export async function invalidateOfferSourceEntityGridListQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.offerSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_LIST_KEY,
  })
}

export async function invalidateOfferSourceEntityGridStatsQueries(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    queryKey: queryKeys.offerSources.all,
    predicate: (q) => segmentAt(q.queryKey, 1) === ENTITY_GRID_STATS_KEY,
  })
}

export async function invalidateOfferSourceGroupingAsset(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({ queryKey: queryKeys.groupingFilterAssets.offerSourcesAllStatuses() })
}

export async function invalidateOfferSourceAuxiliaryAfterGridPatch(qc: QueryClient): Promise<void> {
  await Promise.all([
    invalidateOfferSourceSimpleListQueries(qc),
    invalidateOfferSourceGroupingAsset(qc),
  ])
}

/** Full: all offerSources keys + grouping asset. */
export async function invalidateOfferSourceData(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.offerSources.all }),
    invalidateOfferSourceGroupingAsset(qc),
  ])
}

/* ─── Categories ────────────────────────────────────────────────────── */

/**
 * Category strip lists and dependent grouping assets / entity list rows for the given entity.
 * Avoids invalidating entity-grid **stats** when only category metadata changed.
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
    await invalidatePageDataAfterCategoryChange(qc)
  } else if (entityType === 'trafficsource') {
    await invalidateTrafficSourceDataAfterCategoryChange(qc)
  }
}
