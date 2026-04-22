# Plan 07: DRY — Entity Page Abstraction & CRUD Hook Factory

**Complexity:** Large — ~10 files modified, ~3 new files, ~4 files significantly reduced  
**Depends on:** Plan 4 (React Query migration)  

## Problem

- Entity pages (Landers, Offers, TrafficSources, OfferSources) are 85-90% identical (~1,170 lines that could be ~300)
- CRUD hooks (usePages, useTrafficSources, useOfferSources) repeat the same list/detail/save/delete/clone/archive pattern
- Filtering logic (search + category + archive status) is copy-pasted
- Bulk actions are serial `await` loops with no concurrency

## 7A. CRUD Hook Factory

### Current State

Every entity hook file repeats: `useQuery(list)`, `useQuery(detail)`, `useMutation(save)`, `useMutation(delete)`, `useMutation(clone)`, `useMutation(archive)`.

### Steps

1. **Create `src/api/hooks/createEntityHooks.ts`:**

   ```ts
   interface EntityHookConfig<TEntity> {
     entityKey: string
     endpoints: {
       list: string
       detail: string
       save: string
       delete: string
       clone?: string
       archive?: string
     }
     idParam: string  // e.g. 'idPage', 'idTrafficSource'
   }

   export function createEntityHooks<TEntity, TSaveInput = Partial<TEntity>>(
     config: EntityHookConfig<TEntity>,
   ) {
     const keys = {
       all: [config.entityKey] as const,
       list: (params?: Record<string, string>) => [config.entityKey, 'list', params] as const,
       detail: (id: string) => [config.entityKey, 'detail', id] as const,
     }

     function useList(params?: Record<string, string>) { /* useQuery */ }
     function useDetail(id: string, options?: { enabled?: boolean }) { /* useQuery */ }
     function useSave() { /* useMutation, invalidates keys.all */ }
     function useDelete() { /* useMutation, invalidates keys.all */ }
     function useClone() { /* useMutation if config.endpoints.clone, invalidates keys.all */ }
     function useArchive() { /* useMutation if config.endpoints.archive, invalidates keys.all */ }

     return { useList, useDetail, useSave, useDelete, useClone, useArchive, keys }
   }
   ```

2. **Refactor each entity hook file** to use the factory. Entity-specific hooks (templates, etc.) remain as standalone exports:

   ```ts
   // src/api/hooks/usePages.ts
   const pageHooks = createEntityHooks<Page, SavePageInput>({
     entityKey: 'pages',
     endpoints: { list: '/data/page/list/', detail: '/data/page/find/byId/', save: '/data/page/save/', delete: '/data/page/delete/' },
     idParam: 'idPage',
   })

   export const usePages = pageHooks.useList
   export const usePage = pageHooks.useDetail
   export const useSavePage = pageHooks.useSave
   // ... etc

   // Entity-specific: stays standalone
   export function usePageTemplates() { ... }
   ```

3. **Entity-specific overrides** — where entities have special behavior (e.g., traffic sources have different archived fetch), add the override in the entity file, not the factory.

## 7B. Generic Entity Page Hook

### Current State

LandersPage (345 lines), OffersPage (350 lines), TrafficSourcesPage (258 lines), OfferSourcesPage (221 lines) all have identical: state declarations, dateRange/tz/search/archive state, filtering logic, category grouping logic, CRUD handlers.

### Steps

1. **Create `src/hooks/useEntityPage.ts`:**

   ```ts
   interface UseEntityPageOptions {
     entityKey: string
     entityLabel: string          // "Lander", "Offer", etc.
     gridConfig: Omit<UseEntityGridOptions, 'dateFrom' | 'dateTo' | 'timezone'>
     categoryEntityType?: string  // for useCategories
   }

   export function useEntityPage(options: UseEntityPageOptions) {
     // === Shared state ===
     const [search, setSearch] = useState('')
     const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
     const [selectedCategoryId, setSelectedCategoryId] = useState('')
     const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
     const [tz, setTz] = useState('UTC')
     const [dateRange, setDateRange] = useState(() => ({
       from: subDays(new Date(), 365),
       to: new Date(),
     }))
     const [sheetOpen, setSheetOpen] = useState(false)
     const [editId, setEditId] = useState<string | null>(null)
     const [deleteId, setDeleteId] = useState<string | null>(null)

     // === Data fetching (from Plan 4) ===
     const grid = useEntityGrid({
       ...options.gridConfig,
       dateFrom: dateRange.from,
       dateTo: dateRange.to,
       timezone: tz,
     })

     // === Categories ===
     const { data: categories } = useCategories(options.categoryEntityType)
     const categoryMap = useMemo(/* shared */)

     // === Filtering + category grouping ===
     const filtered = useMemo(/* shared filter logic */)

     // === Handlers ===
     const handleCreate = () => { setEditId(null); setSheetOpen(true) }
     const handleEdit = useCallback((id: string) => { setEditId(id); setSheetOpen(true) }, [])

     return {
       // Data
       ...grid, filtered, categories, categoryMap,
       // State + setters
       search, setSearch, archiveStatus, setArchiveStatus,
       selectedCategoryId, setSelectedCategoryId,
       rowSelection, setRowSelection, tz, setTz,
       dateRange, setDateRange, sheetOpen, setSheetOpen,
       editId, setEditId, deleteId, setDeleteId,
       selectedIds: Object.keys(rowSelection),
       handleCreate, handleEdit,
     }
   }
   ```

2. **Each entity page becomes thin** (~100-150 lines) — just:
   - Column definitions (differ per entity: name column rendering, action buttons)
   - Page actions (Import CSV button, Add button)
   - Form component (PageForm vs TrafficSourceForm)
   - Any entity-specific toolbar widgets above the table

3. **Preserve entity-specific differences** — the hook returns state/setters, the page controls the JSX layout. Differences in what appears above the table, custom column rendering, and entity-specific forms all stay in the page file.

## 7C. Shared Bulk Actions

### Current State

Bulk archive/delete are serial `await` loops in every page. CSV imports are serial row-by-row writes. Campaign bulk delete does O(N*M) recursive tree scan per row.

### Steps

1. **Create `src/lib/bulkActions.ts`:**

   ```ts
   interface BulkResult {
     succeeded: string[]
     failed: Array<{ id: string; error: unknown }>
   }

   export async function bulkMutate(
     ids: string[],
     mutateAsync: (id: string) => Promise<unknown>,
     concurrency = 5,
   ): Promise<BulkResult> {
     const results: BulkResult = { succeeded: [], failed: [] }
     // Process in batches of `concurrency`
     for (let i = 0; i < ids.length; i += concurrency) {
       const batch = ids.slice(i, i + concurrency)
       const settled = await Promise.allSettled(
         batch.map(async (id) => {
           await mutateAsync(id)
           return id
         }),
       )
       for (const result of settled) {
         if (result.status === 'fulfilled') results.succeeded.push(result.value)
         else results.failed.push({ id: batch[settled.indexOf(result)], error: result.reason })
       }
     }
     return results
   }
   ```

2. **For entities that support bulk endpoints** (archive sends `ids: string[]`), use a single API call instead of looping at all.

3. **For CSV imports**, batch rows into groups of 50 and send each batch (or use a bulk-import endpoint if the API supports it).

4. **Fix campaign bulk delete** — precompute the tree-to-id mapping once, not per selected row.

## Verification

- [ ] Entity pages render identically to before
- [ ] CRUD operations still work (create, edit, clone, archive, delete)
- [ ] Bulk archive sends single API call where supported
- [ ] Bulk delete runs with concurrency (visible in network tab)
- [ ] CSV import is batched
- [ ] Each entity page is < 150 lines
- [ ] `npm run build` passes
