---
name: entity-table-architecture
description: Use when working on entity table pages (campaigns, offers, landers, offer-sources, traffic-sources), useEntityTable, category strips, entity grid caching, or React Query invalidation for list vs stats queries.
---

# Entity Table Architecture

Centralized table-first pages share one architecture so page files stay focused on page-specific behavior (mutations, dialogs, copy), while shared table data flow and UI behavior live in `src/lib/entity-table/`.

## Pages using this system

- `campaigns`
- `offers`
- `landers`
- `offer-sources`
- `traffic-sources`

## Module boundaries

- `src/lib/entity-table/engine/` — reusable table orchestration logic (`useEntityTableState`, `useEntityTableColumns`, category strip helpers).
- `src/lib/entity-table/data/` — request/sort/cache/merge primitives.
- `src/lib/entity-table/columns/` — shared column visibility/storage/defaults.
- `src/pages/<feature>/` — feature-specific behavior only.

## Runtime flow

1. Page controller calls `useEntityTable(...)` with its mode and config.
2. Shared state is managed in `useEntityTableState` (search, archive tab, date range, row selection, modal ids).
3. Data is loaded through the flat entity list + stats merge path (`useEntityGrid`), with client-side search, sort, and pagination.
4. Row/column behavior is normalized through shared helpers:
   - category strip helpers (`categoryStripTable`, `categoryStripSelection`, `paginateCategorySegments`)
   - shared action columns (`useEntityTableColumns`)
5. `EntityPage` renders the shared shell (`PageShell`, `SearchToolbar`, `DataTable`), while page controllers provide custom dialogs and mutation handlers.

## When adding a new table page

1. Create page controller under `src/pages/<feature>/`.
2. Use `useEntityTable` with `mode: 'flat-client-paged'` for list + merged stats pages.
3. Use `useEntityTableColumns` unless the page has truly unique action-column behavior.
4. Keep new shared logic in `src/lib/entity-table/*`, not inside feature page files.

## React Query invalidation trap

Entity grids register **two** queries under the same prefix, e.g. `['pages']`:

- `…, entityGridList, /data/page/find/byStatus/, params`
- `…, entityGridStats, groupBy, …` (expensive drilldown POST)

Calling `invalidateQueries({ queryKey: ['pages'] })` marks **both** stale, so a single row edit refetches the full drilldown report.

### Frontend pattern (current)

- After `setQueryData` list patches (`entityGridQueryCache`), mutations call **auxiliary** invalidation only: plain `usePages` / `useTrafficSources` **list** queries + `groupingFilterAssets` keys—not the full prefix.
- Category renames/assignments refetch **entity grid list** + simple lists + grouping assets, not stats (`invalidatePageDataAfterCategoryChange`, etc.).
- CSV import and similar "unknown full state" flows still use **`invalidatePageData`** (full `pages` subtree + grouping assets).
- `useEntityGrid().refetch()` still refreshes **list + stats** together (explicit user/toolbar reload).

Helpers live in `src/api/invalidations.ts`; list/stats segments match `ENTITY_GRID_LIST_KEY` / `ENTITY_GRID_STATS_KEY` in `src/lib/entityGridQueryCache.ts`.
