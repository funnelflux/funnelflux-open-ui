# React Query invalidation (entity grids)

## Problem

Entity grids register **two** queries under the same prefix, e.g. `['pages']`:

- `…, entityGridList, /data/page/find/byStatus/, params`
- `…, entityGridStats, groupBy, …` (expensive drilldown POST)

Calling `invalidateQueries({ queryKey: ['pages'] })` marks **both** stale, so a single row edit refetches the full drilldown report.

## Frontend pattern (current)

- After `setQueryData` list patches (`entityGridQueryCache`), mutations call **auxiliary** invalidation only: plain `usePages` / `useTrafficSources` **list** queries + `groupingFilterAssets` keys—not the full prefix.
- Category renames/assignments refetch **entity grid list** + simple lists + grouping assets, not stats (`invalidatePageDataAfterCategoryChange`, etc.).
- CSV import and similar “unknown full state” flows still use **`invalidatePageData`** (full `pages` subtree + grouping assets).
- `useEntityGrid().refetch()` still refreshes **list + stats** together (explicit user/toolbar reload).

Helpers live in [`src/api/invalidations.ts`](../src/api/invalidations.ts); list/stats segments match [`ENTITY_GRID_LIST_KEY` / `ENTITY_GRID_STATS_KEY`](../src/lib/entityGridQueryCache.ts).
