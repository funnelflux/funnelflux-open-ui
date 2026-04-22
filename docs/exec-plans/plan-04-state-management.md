# Plan 04: State Management — Migrate Server Data to React Query

**Complexity:** Large — ~8 files significantly refactored, ~3 files deleted  
**Depends on:** Nothing (but Plan 5, 7 build on this)  

## Problem

The entity grid stores (`src/store/entityGrid.ts`) and DashboardPage make direct `api.post()` calls inside Zustand actions, bypassing React Query's caching, deduplication, background refetch, and error handling. Errors are silently swallowed. This creates a parallel data-fetching layer that conflicts with the React Query hooks that already exist.

**Rule of thumb going forward:** Zustand = UI-only state (selections, filters, open/close). React Query = anything from the server.

## 4A. Entity Grid: Replace Zustand Data Fetching with React Query

### Current Flow
Zustand store calls `api.post()` → sets state → entity pages trigger via `useEffect(() => fetchAll(...))`.

### Target Flow
React Query hook fetches data → entity pages consume via `useQuery`. No Zustand for server data.

### Steps

1. **Create `src/api/hooks/useEntityGrid.ts`** — generic hook combining entity list + drilldown stats:

   ```ts
   import { useQuery } from '@tanstack/react-query'
   import { api } from '@/api/client'
   import type { Report, ReportCell, ReportColumn } from '@/types/stats'
   import { toApiDateTimeRange } from '@/types/stats'

   export interface ListEntity {
     id: string
     name: string
     [key: string]: unknown
   }

   interface UseEntityGridOptions {
     entityKey: string
     listEndpoint: string
     listParams?: Record<string, string>
     groupBy: string
     dateFrom: Date
     dateTo: Date
     timezone: string
     mapListToEntities?: (items: unknown[]) => ListEntity[]
     enabled?: boolean
   }

   export function useEntityGrid(options: UseEntityGridOptions) {
     const {
       entityKey, listEndpoint, listParams, groupBy,
       dateFrom, dateTo, timezone, mapListToEntities, enabled = true,
     } = options

     const listQuery = useQuery({
       queryKey: [entityKey, 'list', listParams],
       queryFn: async () => {
         const raw = await api.get<unknown>(listEndpoint, listParams)
         const arr = Array.isArray(raw) ? raw : []
         return mapListToEntities ? mapListToEntities(arr) : (arr as ListEntity[])
       },
       enabled,
     })

     const statsQuery = useQuery({
       queryKey: [entityKey, 'stats', groupBy, dateFrom.toISOString(), dateTo.toISOString(), timezone],
       queryFn: () =>
         api.post<Report>('/stats/reporting/drilldown/', {
           timeRange: toApiDateTimeRange(dateFrom, dateTo),
           timeZone: { name: timezone },
           groupings: [{ groupBy, whitelistFilters: [], blacklistFilters: [] }],
           paging: { start: 0, length: 5000 },
           options: { viewType: 'flat' },
         }),
       enabled,
     })

     // Derive merged rows (same logic as existing buildMergedRows)
     const mergedRows = useMemo(() =>
       buildMergedRows(listQuery.data ?? [], statsById, statsQuery.data?.columns ?? []),
       [listQuery.data, statsQuery.data],
     )

     return {
       entities: listQuery.data ?? [],
       mergedRows,
       reportColumns: statsQuery.data?.columns ?? [],
       totalsCells: statsQuery.data?.totals?.cells ?? null,
       isLoading: listQuery.isLoading || statsQuery.isLoading,
       error: listQuery.error || statsQuery.error,
       refetch: () => { listQuery.refetch(); statsQuery.refetch() },
     }
   }
   ```

2. **Move pure utility functions** (`buildMergedRows`, `buildTotalsRow`, `pagesToListEntities`) from `src/store/entityGrid.ts` to `src/lib/entityGridUtils.ts` — these are pure data transforms that don't belong in a store.

3. **Update each entity page** (LandersPage, OffersPage, TrafficSourcesPage, OfferSourcesPage):
   - Remove `useEffect(() => fetchAll(...))` pattern
   - Replace `useLanderGridStore()` with `useEntityGrid({ entityKey: 'landers', ... })`
   - Replace `upsertEntity` / `removeEntity` calls with `queryClient.invalidateQueries()`
   - Replace `reload()` with `refetch()` from the hook

4. **Delete the Zustand store instances** from `entityGrid.ts` once all pages are migrated. The file can be deleted entirely if only the pure functions remain (moved to lib).

5. **Error handling improves automatically** — React Query surfaces errors; entity pages should render an error state instead of a silent empty table.

## 4B. Dashboard: Migrate to React Query

### Current Flow
`DashboardPage.tsx` (376 lines): raw `api.post()` inside `useCallback` + `useEffect` + manual `useState` for loading/data/error + `setInterval(30s)` for polling. Fires 5 parallel API calls every 30 seconds regardless of data changes.

### Target Flow
React Query with `refetchInterval`. Automatic deduplication and stale-while-revalidate.

### Steps

1. **Create/update dashboard hooks in `src/api/hooks/useDashboard.ts`:**

   ```ts
   export function useDashboardReport(request: DrilldownRequest | null) {
     return useQuery({
       queryKey: ['dashboard', 'report', request],
       queryFn: () => api.post<Report>('/stats/reporting/drilldown/', request!),
       enabled: !!request,
       refetchInterval: 30_000,
     })
   }

   export function useDashboardWidget(widgetKey: string, request: unknown | null) {
     return useQuery({
       queryKey: ['dashboard', 'widget', widgetKey, request],
       queryFn: () => api.post<Report>('/stats/reporting/drilldown/', request),
       enabled: !!request,
       refetchInterval: 30_000,
     })
   }
   ```

2. **Refactor DashboardPage:**
   - Replace manual `loadData` callback + `useEffect` + `useState` with the React Query hooks above.
   - Each of the 5 API calls becomes an independent `useQuery` with automatic deduplication.
   - Remove `setInterval` (line 316) — `refetchInterval` handles it.
   - Remove manual loading/error state — use React Query's `isLoading`, `error`.

3. **Move QueryClient creation inside App component** (currently at module scope, `App.tsx:45`):
   ```ts
   export default function App() {
     const [queryClient] = useState(() => new QueryClient({ ... }))
     // ...
   }
   ```
   This makes it testable (each test gets a fresh client) and follows React Query best practices.

## Verification

- [ ] `npm run build` passes
- [ ] Entity pages load and display data identically to before
- [ ] Dashboard refreshes every 30s
- [ ] Errors are surfaced to user (not silently swallowed)
- [ ] Network tab: no duplicate requests for same data
- [ ] Changing date range on entity page triggers new fetch (React Query keys change)
- [ ] `src/store/entityGrid.ts` deleted (or contains only re-exported pure functions)
