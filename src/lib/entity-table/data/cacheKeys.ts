/**
 * React Query key segments for asset tables.
 *
 * List + stats keys must stay compatible with {@link entityGridQueryCache} helpers
 * (invalidate, optimistic updates).
 */
export { ENTITY_GRID_LIST_KEY, ENTITY_GRID_STATS_KEY } from '@/lib/entity-table/data/queryCache'

/** Campaigns: hierarchy + paged drilldown bundle. */
export const ASSET_CAMPAIGNS_HIERARCHY_REPORT = 'hierarchy-report' as const
