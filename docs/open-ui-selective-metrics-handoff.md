# Open UI Selective Metrics Handoff

## Purpose

FunnelFlux now has opt-in V2 drilldown API support for returning only requested metric columns. The Open UI should use this so reports and entity grids stop requesting every metric when they only render a subset.

The work must remain backward compatible with the old PHP UI. Do not change the default V2 drilldown response shape. Do not require V1 adapters or old UI bridge code to understand a new response format.

## Current State

Parent repo branch:

- `php-8-upgrade`
- Current remote tip at time of review: `a75ea2193 Keep public UMR redirects on tracking path`

Open UI submodule pointer:

- `funnelflux-open-ui` at `366369cbd39899ccb7ebd9d7f1bf8075b3b535ff`

Backend support already exists in parent repo:

- `admin/api/v2/_models/stats/drilldownRequest.php`
- `admin/api/v2/_models/stats/metricRegistry.php`
- `admin/api/v2/stats/reporting/drilldown/_queryHandlerClickhouse.php`
- `docs/exec-plans/selective-metrics-drilldown-api.md`

Live API smoke test passed:

- Without `metrics`: V2 drilldown returned `52` columns.
- With `metrics: ["Entrances", "Revenue", "P/L", "ROI"]`: V2 drilldown returned exactly `5` columns:
  - `Element: Campaign`
  - `Entrances`
  - `Revenue`
  - `P/L`
  - `ROI`
- Row cell count and totals cell count matched returned columns.

Host PHPUnit could not run because local PHP was missing `dom`, `xml`, and `xmlwriter`. Use the project runtime or Docker when adding PHP-side tests.

## API Contract

Endpoint:

```text
POST /admin/api/v2/stats/reporting/drilldown/?apiKey=<key>
```

Add optional top-level property:

```json
{
  "metrics": ["Entrances", "Revenue", "P/L", "ROI"]
}
```

Compatibility behavior:

- `metrics` absent: current behavior, all metrics returned.
- `metrics: null`: current behavior, all metrics returned.
- `metrics: []`: current behavior, all metrics returned.
- Unknown metric names are ignored by backend. If all names are unknown, backend falls back to current behavior.
- Grouping columns are always preserved.
- Requested metric columns are returned in request order.
- Row `cells` and `totals.cells` are filtered to match returned `columns`.
- Backend still keeps internal required metrics for calculations where needed.
- Backend keeps derived metrics referenced by sorting or column filters in SQL even if they are not in display metrics.

Important: backend expects API metric names, not Open UI registry IDs. For example:

- Open UI `visits` -> API `Entrances`
- Open UI `profitAndLoss` -> API `P/L`
- Open UI `returnOnInvestment` -> API `ROI`

## Non-Goals

Do not implement the compact response format in this pass.

Do not alter old PHP UI bridge code:

- `admin/js/v2StatsAdapter.js`
- `admin/js/statsQuickviewBridge.js`
- `admin/js/drilldownV2APIBridge.js`

Do not change default V2 drilldown JSON shape:

```json
{
  "columns": [],
  "rows": [{ "cells": [] }],
  "totals": { "cells": [] },
  "rowsReturned": 0,
  "rowsTotal": 0
}
```

Do not send `metrics` from any old PHP UI adapter.

## Open UI Target Files

Main likely files:

- `funnelflux-open-ui/src/types/stats.ts`
- `funnelflux-open-ui/src/api/drilldown.ts`
- `funnelflux-open-ui/src/api/hooks/useDrilldown.ts`
- `funnelflux-open-ui/src/api/hooks/useEntityGrid.ts`
- `funnelflux-open-ui/src/pages/campaigns/CampaignsPage.tsx`
- `funnelflux-open-ui/src/pages/DashboardPage.tsx`
- `funnelflux-open-ui/src/pages/reports/DrilldownFlatPage.tsx`
- `funnelflux-open-ui/src/pages/reports/DrilldownTreePage.tsx`
- `funnelflux-open-ui/src/components/ui-kit/data-table/columnDefs.tsx`
- `funnelflux-open-ui/src/components/ui-kit/data-table/columnRegistry.ts`
- `funnelflux-open-ui/src/lib/entityGridColumnVisibility.ts`
- `funnelflux-open-ui/src/store/tableConfig.ts`

Tests likely belong near existing Open UI tests:

- `funnelflux-open-ui/src/lib/*.test.ts`
- or a new focused test file under `funnelflux-open-ui/src/lib/`

## Implementation Design

### 1. Add Typed Request Support

Extend Open UI `DrilldownRequest` type in `src/types/stats.ts`:

```ts
export type DrilldownRequest = GeneratedDrilldownRequest & {
  trackingFieldMappings?: Record<string, { id: string }>
  metrics?: string[]
}
```

Generated OpenAPI types may not include `metrics` yet. Do not regenerate types just for this unless the API spec is also updated deliberately.

### 2. Create Canonical Metric Mapping Helper

Create a small helper, likely:

```text
src/lib/drilldownMetrics.ts
```

Responsibilities:

- Map Open UI column IDs to backend API metric names.
- Derive a `metrics: string[]` array from a selected/visible set of Open UI column IDs.
- Return `undefined` when mapping is incomplete and fallback should request all metrics.
- Keep ordering stable and aligned with the table/column registry order.

Recommended exported functions:

```ts
export function apiMetricNameForColumnId(columnId: string): string | undefined
export function apiMetricNamesForColumnIds(columnIds: Iterable<string>): string[] | undefined
export function defaultApiMetricNames(): string[]
```

Fallback rule:

- If a requested visible metric column has no mapping and is a real metric column, return `undefined`.
- Caller should omit `metrics` from the API body.
- This is safer than accidentally hiding data because of an incomplete mapping.

Ignore non-metric UI columns:

- `name`
- `select`
- action columns such as `btn_*`
- `id` / entity ID if not from drilldown stats

### 3. Mapping Table

Backend V2 metric names come from `MetricNames::$metricsOrder` and current report columns.

Initial mapping should include at least all current registry metrics that can be returned by V2 drilldown:

```ts
const COLUMN_ID_TO_API_METRIC: Record<string, string> = {
  visits: 'Entrances',
  visitors: 'Unique Entrances',

  landerViews: 'Lander Views',
  landerViewsUnique: 'Unique Lander Views',
  landerClicks: 'Lander Clicks',
  landerClicksUnique: 'Unique Lander Clicks',
  landerClickthroughRate: 'Lander CTR',
  landerClickthroughRateUnique: 'Unique Lander CTR',

  offerViews: 'Offer Views',
  offerViewsUnique: 'Unique Offer Views',
  offerClicks: 'Offer Clicks',
  offerClicksUnique: 'Unique Offer Clicks',
  offerClickthroughRate: 'Offer CTR',
  offerClickthroughRateUnique: 'Unique Offer CTR',

  conversions: 'Conv.',
  indirectConversions: 'Indirect Conv.',
  conversionsLifetime: 'Lifetime Conv.',

  revenue: 'Revenue',
  revenueIndirect: 'Indirect Revenue',
  revenueLifetime: 'Lifetime Revenue',
  cost: 'Cost',
  profitAndLoss: 'P/L',
  returnOnInvestment: 'ROI',

  revenuePerConversion: 'EPa',
  costPerConversion: 'CPa',

  conversionPerVisit: 'CVRe',
  revenuePerVisit: 'EPe',
  costPerVisit: 'CPe',

  conversionPerOfferView: 'CVRov',
  revenuePerOfferView: 'EPov',
  costPerOfferView: 'CPov',

  conversionPerLanderView: 'CVRlv',
  revenuePerLanderView: 'EPlv',
  costPerLanderView: 'CPlv',

  conversionRateNodeViews: 'CVRnv',
  revenuePerNodeView: 'EPnv',
  costPerNodeView: 'CPnv',

  conversionPerUniqueVisitor: 'Unique CVRe',
  revenuePerUniqueVisitor: 'Unique EPe',
  costPerUniqueVisitor: 'Unique CPe',

  conversionPerUniqueOfferView: 'Unique CVRov',
  revenuePerUniqueOfferView: 'Unique EPov',
  costPerUniqueOfferView: 'Unique CPov',

  conversionPerUniqueLanderView: 'Unique CVRlv',
  revenuePerUniqueLanderView: 'Unique EPlv',
  costPerUniqueLanderView: 'Unique CPlv',

  conversionRateNodeViewsUnique: 'Unique CVRnv',
  revenuePerUniqueNodeView: 'Unique EPnv',
  costPerUniqueNodeView: 'Unique CPnv',
}
```

Do not map registry columns that are not currently V2 drilldown metrics unless verified:

- `offerPayout`
- `offerURL`
- `landerURL`
- `resourceId`
- `uniqueness`
- `costPerVisitor`
- `revenuePerVisitor`
- parent-relative metrics like `visitPercentVsParent`
- custom event metrics, unless backend report columns prove they exist

If these become visible in a table and cannot be mapped, omit `metrics` for that request.

### 4. Decide Metric Set Per Request

Different screens have different needs.

#### Entity grids

Files:

- `src/api/hooks/useEntityGrid.ts`
- page callers under traffic sources / pages / offer sources

Goal:

- Request metrics for columns currently visible by default/user choice.
- Include only stats columns, not entity/action columns.
- If visibility state is not known before the first request, use default visible column IDs.

Data flow option:

1. Page computes/owns visible column IDs using `useEntityGridColumnVisibility`.
2. Page passes selected metric IDs to `useEntityGrid`.
3. `useEntityGrid` converts IDs to API names and attaches `metrics`.

This is more explicit than reading localStorage inside API code.

#### Campaigns page

File:

- `src/pages/campaigns/CampaignsPage.tsx`

Current request at review:

```ts
const drilldownBody: DrilldownRequest = {
  timeRange,
  timeZone,
  groupings: [{ groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] }],
  options: { viewType: 'flat' },
}
```

Needed:

- Derive selected metric IDs from `tableConfig.columnVisibility` and default campaign table columns.
- Attach `metrics` to `drilldownBody`.
- Make sure parent campaign row aggregation still receives all metrics that the UI needs to aggregate.
- Since `buildCampaignTreeFromMysqlAndFlatFunnelReport()` uses returned report columns dynamically, filtered response should work if requested metrics match visible metric columns.

#### Dashboard

File:

- `src/pages/DashboardPage.tsx`

Dashboard uses helper extraction functions and fixed chart/card metrics. It should send only metrics needed by:

- stat cards
- chart series
- current top tables, if any

Do not use table visibility here unless there is an actual dashboard column chooser.

#### Drilldown reports

Files:

- `src/pages/reports/DrilldownFlatPage.tsx`
- `src/pages/reports/DrilldownTreePage.tsx`

Use current selected visible columns if the page has a column chooser.

Important for reports:

- Sorting/filtering metrics still work server-side even when the sorted metric is not requested, because backend preserves sorting/filter aliases in SQL.
- But if the UI lets users sort/filter by a hidden column, decide whether that hidden column must also be included in `metrics`. Safer first pass:
  - include visible metrics
  - include currently sorted metric
  - include currently column-filtered metric

### 5. Prevent Query Churn

Metrics array should be stable:

- Deduplicate.
- Preserve registry/table order.
- Use `useMemo`.
- Include the metric list in React Query keys where it affects the response.

If `metrics` changes because user toggles a column, refetch report.

### 6. LocalStorage / Visibility Handling

Open UI has two visibility systems:

- `useEntityGridColumnVisibility()` with `ff_columns_*` localStorage.
- `useTableConfigStore()` for some pages like campaigns.

Do not duplicate hidden-column parsing in API helpers unless necessary.

Preferred:

- UI layer owns selected visible column IDs.
- API hook accepts desired metric IDs or API metric names.
- API hook only attaches `metrics`.

This keeps storage concerns out of API code.

### 7. Add Tests

Minimum Open UI tests:

1. `apiMetricNameForColumnId('visits')` returns `Entrances`.
2. `apiMetricNameForColumnId('profitAndLoss')` returns `P/L`.
3. Unknown metric column returns `undefined`.
4. `apiMetricNamesForColumnIds(['visits', 'revenue', 'returnOnInvestment'])` returns `['Entrances', 'Revenue', 'ROI']`.
5. Non-metric IDs like `name`, `select`, and action button IDs are ignored.
6. If a real visible column is unmapped, helper returns `undefined` so caller omits `metrics`.
7. Request builder preserves `metrics` across paging in `fetchAllFlatDrilldownRows()`.

Recommended command:

```bash
cd funnelflux-open-ui
pnpm test -- --run
pnpm build
```

If full test/build is too slow, run focused Vitest first, then full build before commit.

### 8. Parent Repo Verification

After Open UI code changes:

1. Commit inside `funnelflux-open-ui`.
2. Push Open UI branch.
3. Return to parent repo.
4. Update parent submodule pointer.
5. Commit parent submodule pointer.
6. Push parent branch.

Parent verification:

```bash
git status --short --branch
git -C funnelflux-open-ui status --short --branch
git diff --submodule
```

API smoke test pattern:

```bash
curl -sS 'http://localhost:8080/admin/api/v2/stats/reporting/drilldown/?apiKey=6B2B-E68A' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "timeRange": {
      "start": {"date": {"year": 2025, "month": 1, "day": 1}, "time": {"hour": 0, "minutes": 0}},
      "end": {"date": {"year": 2026, "month": 1, "day": 1}, "time": {"hour": 23, "minutes": 59}}
    },
    "timeZone": {"name": "UTC"},
    "groupings": [{"groupBy": "Element: Campaign", "whitelistFilters": [], "blacklistFilters": []}],
    "paging": {"start": 0, "length": 5},
    "sorting": {"sortingColumns": [{"columnName": "Entrances", "order": "desc"}]},
    "options": {"viewType": "flat"},
    "metrics": ["Entrances", "Revenue", "P/L", "ROI"]
  }'
```

Expected:

- `columns.length === 5`
- names: `Element: Campaign`, `Entrances`, `Revenue`, `P/L`, `ROI`
- every `row.cells.length === columns.length`
- `totals.cells.length === columns.length`

## Compact Response Format Follow-Up

Do not implement compact response in the selective metrics pass. Design only after Open UI is successfully using `metrics`.

Recommended future opt-in:

```json
{
  "responseFormat": "compact-v1"
}
```

or, if backend model conventions prefer nesting:

```json
{
  "options": {
    "responseFormat": "compact-v1"
  }
}
```

Default remains current verbose shape.

Possible compact shape:

```json
{
  "format": "compact-v1",
  "columns": [
    ["Element: Campaign", "grouping", ""],
    ["Entrances", "metric", "Number of entrances"],
    ["Revenue", "metric", "Revenue"]
  ],
  "rows": [
    {
      "id": "row-id",
      "cells": [["Campaign A", "Campaign A"], [123, "123"], [45.67, "$45.67"]]
    }
  ],
  "totals": [["", ""], [123, "123"], [45.67, "$45.67"]],
  "rowsReturned": 1,
  "rowsTotal": 1
}
```

Even more compact later:

```json
{
  "format": "compact-v1",
  "columns": [["Element: Campaign", "g"], ["Entrances", "m"], ["Revenue", "m"]],
  "rows": [["row-id", [["Campaign A", "Campaign A"], [123, "123"], [45.67, "$45.67"]]]],
  "totals": [["", ""], [123, "123"], [45.67, "$45.67"]]
}
```

Compact response rules:

- Must be explicitly requested.
- Must never affect old V2 response.
- Open UI adapter must support both current and compact formats during rollout.
- Add tests proving old response is unchanged when `responseFormat` is absent.

## Acceptance Criteria

Selective metrics pass is complete when:

- Open UI sends `metrics` on eligible drilldown requests.
- Requests omit `metrics` when mapping is incomplete.
- V2 API returns fewer columns for Open UI report/entity requests.
- Existing Open UI tables still render correctly with filtered columns.
- Old PHP UI remains unchanged because it does not send `metrics`.
- Tests cover mapping and request preservation across paging.
- Open UI build passes.
- Parent repo submodule pointer is updated and pushed.

