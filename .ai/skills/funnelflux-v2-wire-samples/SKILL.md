---
name: funnelflux-v2-wire-samples
description: >-
  Documents real HTTP wire shapes for selected FunnelFlux V2 admin APIs (stats
  drilldown reporting and compact data list endpoints). Use when implementing or
  debugging funnelflux-open-ui hooks, report/drilldown pages, entity grids, offer
  or traffic source lists, traffic filters UI load, or any code calling
  /admin/api/v2/stats/reporting/ or the sampled /admin/api/v2/data/ and
  /admin/api/v2/ui/ routes. Complements OpenAPI; does not replace
  definition.yaml or generated types.
---

# FunnelFlux V2 — sampled request/response wire shapes

## When to use

- Implementing or debugging hooks, report/drilldown pages, entity grids, lists, or traffic filters UI that call the sampled routes below.
- Wire samples disagree with YAML: trust `definition.yaml` and generated types; fix the client.

## Relationship to OpenAPI

- **Canonical contracts** live in `admin/api/v2/*/definition.yaml` (on disk as `../admin/api/v2/...` when this app sits in `funnelflux-open-ui/` beside `admin/`) and `src/types/generated/` (regenerate with `pnpm generate-types` from this package root).
- This skill captures **observed JSON on the wire** from captured traffic (`structure.txt` in repo root). If YAML and a sample disagree, **trust YAML** and fix the client.

## Instructions

### Auth and base URL

- Browser/dev: requests go to the Vite origin (e.g. `http://localhost:5173`) and path `/admin/api/v2/...` (proxied to PHP).
- Session cookie **`PHPSESSID`** (and legacy admin session) authenticate the same as the PHP admin UI.

### POST `/admin/api/v2/stats/reporting/drilldown/`

**Headers:** `Content-Type: application/json`, session cookie.

**Body (representative):**

```json
{
  "timeRange": {
    "start": {
      "date": { "year": 2025, "month": 4, "day": 14 },
      "time": { "hour": 10, "minutes": 46 }
    },
    "end": {
      "date": { "year": 2026, "month": 4, "day": 14 },
      "time": { "hour": 23, "minutes": 59 }
    }
  },
  "timeZone": { "name": "UTC" },
  "groupings": [
    {
      "groupBy": "Element: Offer",
      "whitelistFilters": [],
      "blacklistFilters": []
    }
  ],
  "paging": { "start": 0, "length": 5000 },
  "options": { "viewType": "flat" }
}
```

**Notes:**

- `groupBy` is a **display/API string** for the dimension (e.g. `Element: Offer`); other groupings follow the same object shape.
- `options.viewType` is typically `"flat"` or tree-oriented variants per product UI (check OpenAPI enum).
- `whitelistFilters` / `blacklistFilters` are arrays (often empty); when populated, match the stats API filter model from YAML.

**Response (top level):**

| Field | Meaning |
|--------|---------|
| `columns` | Ordered column definitions for the grid |
| `rows` | Data rows; last row may be totals |
| `rowsReturned` | Count returned in this response |
| `rowsTotal` | Total rows for query |
| `sqlLog` | Debug (often `null` in prod) |
| `treeGrid` / `treeGridTotals` | Tree drilldown extras when applicable |

**`columns[]` item:**

- `name` — header label (grouping dimension or metric name, e.g. `Entrances`, `Revenue`).
- `type` — `"grouping"` or `"metric"`.
- `description` — human-readable help text.

**`rows[]` item (data row):**

- `cells` — array parallel to `columns`; each cell: `{ "formatted": string, "raw": number | string }` (display vs sort/math).
- `rowId` — stable row id (string); **totals row** uses `rowId: "totals"`.
- `ctrLanderConfidenceRate`, `ctrOfferConfidenceRate`, `cvrConfidenceRate`, `epvConfidenceRate` — objects like `{ "rate": number }` (`-1` when N/A in samples).
- `children` — array (empty for flat).
- `parentRowId` — `null` for root flat rows.
- `formatter_tree_row_group_by` — often `null` in flat view.

**UI implications:**

- Map columns by **index** to `cells[i]`.
- Prefer **`raw`** for sorting, aggregations, and export; use **`formatted`** for display.
- First column is usually the grouping label; `raw` may still be an entity id string for offers/pages/etc.

### GET `/admin/api/v2/data/page/list/?pageType=offer`

**Query:** `pageType` — e.g. `offer` (and other page types per API).

**Response:** JSON **array** of minimal page refs:

```json
[{ "id": "<string>", "name": "<string>" }]
```

### GET `/admin/api/v2/data/page/category/list/`

**Response:** JSON **array**:

```json
[{ "id": "<string>", "name": "<string>" }]
```

### GET `/admin/api/v2/data/offersource/find/byStatus/?status=active`

**Query:** `status` — e.g. `active`.

**Response:** JSON **array** of offer-source rows (representative fields from wire):

| Field | Sample type | Notes |
|--------|-------------|--------|
| `idOfferSource` | string | Entity id |
| `offerSourceName` | string | |
| `subId`, `querySeparator`, `postbackSubId`, `postbackTxId`, `postbackPayout` | string | Often `""` |
| `isArchived` | number | `0` / `1` style in sample |

OpenAPI may expose booleans or renamed fields — align types with generated wrappers.

### GET `/admin/api/v2/data/trafficsource/list/`

**Response:** JSON **array** (representative):

```json
[
  {
    "id": "<string>",
    "name": "<string>",
    "defaultCostPerEntrance": "0",
    "costType": 0
  }
]
```

**Note:** `defaultCostPerEntrance` appears as a **string** on the wire in samples.

### GET `/admin/api/v2/ui/trafficfilters/load/`

**Response:** JSON **object** (not a top-level array). The table rows live in **`filters`**.

| Field | Shape | Notes |
|--------|--------|--------|
| `filters` | `TrafficFilter[]` | Use this for grids and lists. Each item has `idTrafficFilter`, `trafficFilterName`, `filterType`, `filterEntries`, `redirectToURL`, `isEnabled`, etc. |
| `availableCountries` | `{ key, value }[]` | ISO-ish country codes and labels for filter UI |
| `treeGrid` | object | Legacy formatter: `Body` is **`[[{...}, {...}]]`** (outer array = “pages”, inner array = row objects). **Do not** assume `rows` is a flat array. Prefer **`filters`** for React tables. |

**Minimal client pattern:**

```ts
const { filters, availableCountries, treeGrid } = await api.get<TrafficFiltersData>('/ui/trafficfilters/load/')
// rows for DataTable: filters (array), not the raw response
```

OpenAPI `TrafficFiltersData.filters` is an **array** of `TrafficFilter`; older clients that typed the response as `TrafficFilter[]` will show an empty table because the payload is wrapped.

### When editing related UI code

1. Confirm shapes against **`funnelflux-v2-api-openapi`** skill and YAML.
2. Use **`pnpm generate-types`** after YAML changes.
3. For drilldown/report tables, keep **column index** and **`formatted`/`raw`** split consistent with the API.
4. For list endpoints, expect a **top-level JSON array** (not `{ data: [...] }`) unless YAML says otherwise.

### Optional full dumps

Verbose curl/response captures: `structure.txt` at repository root (not for hand-editing types).
