# Entity Table System

Architecture doc: `docs/ENTITY_TABLE_ARCHITECTURE.md`

Focused helpers for **list + drilldown stats** flows used by Campaigns, Landers, Offers, Offer Sources, and Traffic Sources.

## What lives here

| Area | Responsibility |
|------|----------------|
| `types.ts` | Shared drilldown param shapes (`EntityGridDrilldownParams`, `CampaignTreeDrilldownParams`). |
| `request.ts` | Build `DrilldownRequest` bodies: flat grids vs paged funnel tree. |
| `fetchFlatAssetDrilldown.ts` | Flat drilldown fetch (`buildFlatAssetDrilldownRequest` + `fetchAllFlatDrilldownRows`). |
| `pagination.ts` | Max page size cap (`200`) for paged drilldown. |
| `sorting.ts` | Map table sort → API `sortingColumns`, and local numeric-aware row sort. |
| `cacheKeys.ts` | Shared React Query key segments (re-exports entity grid keys + campaigns bundle id). |
| `useAssetTableEngine.ts` | Main hook entrypoint (adapter in, table-ready state out). |

## What adapters / pages own

- Entity list endpoints, archive tabs, category strips, CRUD modals, navigation.
- Campaign-specific hierarchy/report mapping now lives inside `pages/campaigns/CampaignsPage.tsx`.
- Table UI configuration (`EntityPage`, column chooser, bulk actions).

## Request / cache / sort / page lifecycle (flat grids)

1. **List query**: load entities (MySQL) — key includes list endpoint + params.
2. **Stats query**: `useEntityGrid` calls `fetchFlatAssetDrilldownReport` with `groupBy`, date range, timezone, optional metric subset.
3. **Merge**: `buildMergedRows` attaches cells to each entity row.
4. **Local sort**: Category-strip pages use `sortAssetTableRows` on the filtered row set (numeric-aware).
5. **Paging**: Client pagination over category segments or plain row lists.

React Query stats keys must include everything that shapes the drilldown: `groupBy`, date range, timezone, metrics.

## Campaign tree (paged server drilldown)

1. **Parallel**: MySQL hierarchy wire + **one** paged flat drilldown grouped by `Element: Funnel`.
2. **Paging**: `start = pageIndex * length`, `length = clampAssetPageSize(pageSize)` (≤ 200).
3. **Sort**: table sorting is local on the current loaded page via `sortAssetTableRows` (no sort-triggered refetch).
4. **Row order**: `buildCampaignTreeOrderedByReport` preserves **drilldown row order** (not hierarchy-first walks).

## When to use server paging vs full stats

| Mode | When |
|------|------|
| **Full flat drilldown** | Landers, offers, traffic sources, offer sources — all entities need stats merged; internal paging may batch requests. |
| **Paged funnel drilldown** | Campaigns — too many funnels to load at once; one page of funnel rows per table page. |

## Adding a new flat asset page

1. Pass list endpoint + `groupBy` + metric visibility into **`useEntityGrid`** (or `useEntityPage` wrapper).
2. Keep CRUD and UI in the page controller.
3. If you add a custom strip/paging layer, reuse `sortAssetTableRows` after filters.
