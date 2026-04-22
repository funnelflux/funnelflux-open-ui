# Plan 08: Performance & Bundle Optimization

**Complexity:** Medium — ~10 files modified, 2 deps removed  
**Depends on:** Nothing (but 8E depends on Plan 4 for the hook structure)  

## 8A. Route-Level Code Splitting

### Problem
`App.tsx` eagerly imports all 20+ page components. Only `DesignSystemPage` is lazy-loaded. The funnel editor pulls in `@xyflow/react` (~150KB) and the dashboard pulls in `recharts` (~120KB) even if the user never visits those pages.

### Steps

1. **Lazy-import all page components in `App.tsx`:**
   ```ts
   const CampaignsPage = lazy(() => import('@/pages/campaigns/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
   const FunnelEditorPage = lazy(() => import('@/pages/funnels/FunnelEditorPage').then(m => ({ default: m.FunnelEditorPage })))
   const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
   // ... all pages
   ```

2. **Add Suspense fallback** inside `AppLayout` around `<Outlet />`:
   ```tsx
   <Suspense fallback={<div className="flex items-center justify-center h-full"><Spin /></div>}>
     <Outlet />
   </Suspense>
   ```

3. **Priority targets** (heaviest imports):
   - `FunnelEditorPage` — `@xyflow/react`
   - `DashboardPage` — `recharts`
   - `DrilldownTreePage` / `DrilldownFlatPage` — heavy table logic
   - Settings pages — rarely visited

4. **Verify chunks:** After build, check `dist/assets/` — should see separate chunks for each route.

## 8B. Consolidate Date Libraries

### Current State
- `date-fns` v4 + `@date-fns/tz`: used in 9 files for `subDays`, `format`, `startOfDay`, timezone handling
- `dayjs` v1: used in only 2 files (`DateRangePicker.tsx`, `DateTimeRangePicker.tsx`) — exclusively because Ant Design's DatePicker requires dayjs

### Decision
Keep `date-fns` as primary (more files, tree-shakeable, already handles timezones). Isolate `dayjs` to only the Ant Design DatePicker wrappers.

### Steps

1. **Create thin adapters** in the DatePicker wrappers that accept `Date` objects and convert to/from dayjs internally:
   ```ts
   // Inside DateRangePicker.tsx
   import dayjs from 'dayjs'
   // Props use Date, internally convert: dayjs(date) → antd, .toDate() → callback
   ```

2. **Ensure no other file imports dayjs** — add a note in CLAUDE.md or an ESLint rule.

3. **Do NOT add dayjs anywhere new.** If a new component needs date manipulation, use `date-fns`.

## 8C. Remove Dead Dependencies

### Steps

1. **Verify zero usage:**
   ```bash
   grep -rn "from ['\"]cmdk" src/
   grep -rn "from ['\"]react-day-picker" src/
   ```

2. **Remove:**
   ```bash
   npm uninstall cmdk react-day-picker
   ```

3. **Evaluate downshift** — `src/components/shared/MultiSelect.tsx` (350 lines) rebuilds Ant Design's `Select mode="multiple"`. If antd's Select suffices:
   - Replace usages of `MultiSelect` with antd `Select mode="multiple"`
   - Delete `MultiSelect.tsx`
   - `npm uninstall downshift`
   
   If custom behavior is genuinely needed, keep it but document why in a comment.

## 8D. Serial Operations → Concurrent/Batched

Covered in Plan 7C. Key wins:
- Bulk archive: single API call with `ids: string[]`
- Bulk delete: concurrent with concurrency limit of 5
- CSV import: batch rows into groups of 50

## 8E. Runtime Pagination Mode Toggle

### Problem
Entity pages fetch up to 5,000 rows and filter/group client-side. For users with large asset counts this degrades. Env vars won't work because the app is a pre-built artifact.

### Approach
**localStorage flags** toggled via a UI settings panel. Each user can flip server-side pagination on for specific entity types where they hit scale issues.

### Steps

1. **Create `src/lib/paginationConfig.ts`:**

   ```ts
   const STORAGE_KEY = 'ff-server-pagination'

   export type PaginatableEntity = 'traffic-sources' | 'offer-sources' | 'landers' | 'offers' | 'campaigns'

   export function isServerPaginated(entityType: PaginatableEntity): boolean {
     try {
       const stored = localStorage.getItem(STORAGE_KEY)
       if (!stored) return false
       const config: Record<string, boolean> = JSON.parse(stored)
       return config[entityType] === true
     } catch {
       return false
     }
   }

   export function setServerPaginated(entityType: PaginatableEntity, enabled: boolean): void {
     try {
       const stored = localStorage.getItem(STORAGE_KEY)
       const config: Record<string, boolean> = stored ? JSON.parse(stored) : {}
       config[entityType] = enabled
       localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
     } catch {
       // ignore storage errors
     }
   }

   export function getServerPaginationConfig(): Record<PaginatableEntity, boolean> {
     try {
       const stored = localStorage.getItem(STORAGE_KEY)
       const config = stored ? JSON.parse(stored) : {}
       return {
         'traffic-sources': config['traffic-sources'] === true,
         'offer-sources': config['offer-sources'] === true,
         'landers': config['landers'] === true,
         'offers': config['offers'] === true,
         'campaigns': config['campaigns'] === true,
       }
     } catch {
       return { 'traffic-sources': false, 'offer-sources': false, 'landers': false, 'offers': false, 'campaigns': false }
     }
   }
   ```

2. **Add a "Performance" section to System Settings page** (`src/pages/settings/SystemSettingsPage.tsx`):
   - Toggle switches for each entity type
   - Short explanation: "Enable server-side pagination for entity types where you have a large number of items. This reduces browser memory usage but adds latency to filtering."
   - Reads/writes via `getServerPaginationConfig()` / `setServerPaginated()`

3. **In `useEntityGrid` hook (from Plan 4)**, branch on this flag:

   ```ts
   const serverPaginated = isServerPaginated(options.entityKey as PaginatableEntity)

   if (serverPaginated) {
     // Send paging, search, categoryId to API
     // API handles pagination and filtering
   } else {
     // Fetch all rows, paginate/filter client-side (current behavior)
   }
   ```

4. **When server-side mode is on:**
   - Search input debounces (300ms) and sends query param to API
   - Category selector sends filter param to API
   - Pagination controls send `start`/`length` to API
   - React Query key includes page/search/category so each combo is cached

5. **When server-side mode is off:**
   - Current behavior: fetch all, filter in browser
   - Fast for most users with < 1000 assets

## Verification

- [ ] `npm run build` — check output chunk sizes (initial bundle should be smaller)
- [ ] FunnelEditorPage loads lazily (check network tab for separate chunk)
- [ ] `npm ls cmdk react-day-picker` — not installed
- [ ] System Settings shows pagination toggles
- [ ] Entity page works in client-side mode (default)
- [ ] Entity page works in server-side mode after toggling
- [ ] Switching modes applies immediately (page refetches)
