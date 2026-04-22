# Plan 02: Bug Fixes — Functional Correctness

**Complexity:** Small-Medium — ~6 files, ~60 lines changed  
**Depends on:** Nothing  

## 2A. Malformed Bulk Archive Payload (TrafficSourcesPage)

**Problem:** `src/pages/traffic-sources/TrafficSourcesPage.tsx:213` — bulk archive likely joins selected IDs incorrectly. The individual `useArchiveTrafficSource` hook sends `{ ids: [id], archive }` which works for one ID, but the bulk handler loops calling this for each ID serially instead of sending all IDs in one call.

**Fix:**
1. Read `TrafficSourcesPage.tsx` bulk archive handler and confirm the bug.
2. For bulk operations, call the API directly with all IDs: `api.put('/data/trafficsource/archive/', { ids: selectedIds, archive: true })`.
3. Apply the same pattern to all entity pages' bulk archive handlers (Landers, Offers, OfferSources) — they all have the same serial loop problem.

---

## 2B. GlobalConditions Edit Always Opens as New

**Problem:** `src/pages/settings/GlobalConditionsPage.tsx:66,162` — the edit action doesn't pass the selected condition to the editor; `ConditionEditor` always receives `null`.

**Fix:**
1. Trace the edit handler in `GlobalConditionsPage.tsx`.
2. Add an `editingCondition` state variable.
3. Pass the selected condition's data to `ConditionEditor` when editing.
4. Verify `ConditionEditor.tsx:224` correctly reads the incoming condition prop when non-null.

---

## 2C. CSV Export Hook Broken

**Problem:** `src/api/hooks/useDrilldown.ts:24` — `useExportCsv` types the return as `Blob`, but `ApiClient.handleResponse` (`src/api/client.ts:79-83`) always parses as text/JSON. Also, `src/components/drilldown/DrilldownToolbar.tsx:112` bypasses the `ApiClient` entirely with a raw `fetch`.

**Fix:**
1. Add a `postBlob` method to `ApiClient`:
   ```ts
   async postBlob(endpoint: string, body?: unknown): Promise<Blob> {
     const res = await fetch(this.buildUrl(endpoint), {
       method: 'POST',
       credentials: 'same-origin',
       headers: { 'Content-Type': 'application/json' },
       body: body ? JSON.stringify(body) : undefined,
     })
     if (!res.ok) {
       const error = await res.json().catch(() => ({ code: res.status, message: res.statusText }))
       throw error
     }
     return res.blob()
   }
   ```
2. Update `useExportCsv` to use `api.postBlob()`.
3. Replace the raw `fetch` in `DrilldownToolbar.tsx:112` with `api.postBlob()`.

---

## 2D. QuickView Row Parser Divergence

**Problem:** `src/pages/quickview/QuickViewPage.tsx:46` reads legacy numeric keys and ignores `row.cells`, unlike the shared parser in `src/lib/reportRowCells.ts:10`.

**Fix:**
1. Refactor QuickViewPage to use the shared `cellRaw` / `cellFmt` helpers from `src/lib/reportRowCells.ts`.

---

## 2E. Drilldown Pages: 50-Row Limit with noPagination

**Problem (Critical):** Both drilldown pages request only 50 rows from the API but render with `noPagination` flag, so users cannot access rows beyond the first 50.
- Flat: `DrilldownFlatPage.tsx:35,49,128`
- Tree: `DrilldownTreePage.tsx:119,155,314`

**Fix:**
1. Remove `noPagination` flag from both DataTable usages.
2. Either increase the page size to a reasonable default (e.g., 100-200) with proper pagination controls, or implement a "load more" pattern.
3. The drilldown store already tracks paging params — wire them to the DataTable's pagination state.
4. For tree mode specifically, lazy-expand child rows should also paginate (currently requests `length: 99999` at `DrilldownTreePage.tsx:208`). Cap at a reasonable limit (e.g., 500) and add a "load more" indicator for subtrees.

---

## 2F. FunnelQuickStats Row ID Collision

**Problem:** `src/components/funnel-builder/FunnelQuickStatsModal.tsx:585` generates row IDs via `Object.values(row).join('')`. This is expensive (serializes all values) and collision-prone for rows with identical values.

**Fix:**
1. Add an index-based row ID: `getRowId={(_, index) => \`qs-${index}\``
2. Or if rows have a natural key (like a node ID + metric combo), use that.

## Verification

- [ ] `npm run build` passes
- [ ] Bulk archive on TrafficSourcesPage sends correct payload (check network tab)
- [ ] GlobalConditions edit opens with existing data populated
- [ ] CSV export downloads a file
- [ ] QuickView renders data correctly
- [ ] Drilldown flat page shows pagination controls, can navigate beyond 50 rows
- [ ] Drilldown tree page shows pagination, child expansion works with bounded results
