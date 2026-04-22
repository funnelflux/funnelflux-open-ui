# Plan 09: Dead Code & Type System Cleanup

**Complexity:** Medium — ~10 files modified/deleted  
**Depends on:** Nothing (but best done before Plans 4 and 7 to reduce noise)  

## 9A. Remove Dead/Deprecated Hooks

### Steps

1. **Verify zero imports:**
   ```bash
   grep -rn "useEntityReport\b" src/ --include="*.ts" --include="*.tsx"
   grep -rn "useEntityGridReport\b" src/ --include="*.ts" --include="*.tsx"
   grep -rn "useLoadDashboard\b" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Delete orphaned files:**
   - `src/api/hooks/useEntityReport.ts` — orphaned, also abuses `useState` as side-effect trigger
   - `src/api/hooks/useEntityGridReport.ts` — explicitly `@deprecated` at line 1

3. **Check `useExportCsv`** in `src/api/hooks/useDrilldown.ts:21-25`:
   - If imported nowhere: remove (re-add in Plan 2C with the fixed `postBlob` approach)
   - If imported: fix in Plan 2C

4. **Remove from barrel export** `src/api/hooks/index.ts` — delete the corresponding `export *` lines.

5. **Check for any other dead exports** in the barrel:
   ```bash
   # For each export in index.ts, verify it's imported somewhere
   ```

## 9B. Fix Type Divergence

### Problem
Generated types (`src/types/generated/data.ts`) define `FunnelNode.nodeType` as string union. The app's `src/types/funnel.ts` defines `NodeTypeValue` as numeric (`0 | 1 | 2 | ...`). The store casts between them unsafely. The Zod schemas validate against shapes that don't match generated types.

### Steps

1. **Check the OpenAPI specs** in `docs/api-specs/` — what does the API actually return for `nodeType`? String or number?

2. **If API returns strings (most likely):**
   - Update `src/types/funnel.ts` `NodeTypeValue` to use the string union from generated types
   - Remove unsafe `as NodeTypeValue` casts in `src/store/funnelEditor.ts`
   - Update UI code that compares `nodeType` to numeric values (search: `nodeType === 0`, `nodeType === 1`, etc.)

3. **If API returns numbers:**
   - Fix the OpenAPI spec and regenerate types

4. **Align extended types** — `src/types/entities.ts` extends generated types with extra fields (`categoryId`, `numberOfActions`). Document which fields are client-only additions vs API fields:
   ```ts
   /** Client-side extension: categoryId comes from a separate category assignment endpoint */
   export type Page = GeneratedPage & {
     categoryId?: string
     numberOfActions?: number
   }
   ```

5. **Align Zod schemas** with the corrected types. If a schema validates fields not in the generated type, document whether they're client-only or missing from the spec.

## 9C. DataTable `as never` Type Casts

### Problem
`src/components/ui-kit/data-table/DataTable.tsx:176-195` — eight `as never` casts suppress type checking for TanStack Table handler callbacks. This makes type errors invisible.

### Steps

1. **Read DataTable.tsx** and understand why the casts are needed — likely the generic `<TData>` isn't properly constraining TanStack Table's type parameters.

2. **Fix the generic constraint** so TanStack Table infers the correct handler types:
   ```ts
   // Instead of:
   onSortingChange: handleSortingChange as never,
   // The handler should match TanStack's expected signature:
   onSortingChange: handleSortingChange,
   // If there's a mismatch, fix the handler's type, not the call site
   ```

3. **Root cause is usually** that the wrapper component's `TData` generic doesn't flow through to the state setter types. Fix by ensuring `useReactTable<TData>` is properly parameterized.

## 9D. Decompose Funnel Editor God Object

### Problem
`src/store/funnelEditor.ts` (317 lines) contains node CRUD, edge CRUD, serialization, API-to-Flow conversion, Flow-to-API conversion, coordinate re-exports, and metadata management. Pure conversion functions don't belong in the store.

### Steps

1. **Extract pure conversion functions** into `src/lib/funnelConversions.ts`:
   - API-to-Flow node/edge conversion (lines ~21-70)
   - Flow-to-API serialization (lines ~70-111)
   - Any coordinate helpers that are re-exported

2. **Keep the store slim** — only Zustand state + actions that read/write state:
   - `nodes`, `edges`, `metadata` state
   - `addNode`, `removeNode`, `updateNode` actions
   - `addEdge`, `removeEdge` actions
   - `loadFromApi(apiData)` — calls the extracted conversion, then `set()`
   - `toApiPayload()` — calls the extracted serialization

3. **The store should be < 150 lines** after extraction.

## 9E. Theme Store SSR Guards

### Problem
`src/store/theme.ts:12,14,25` — `localStorage`, `window`, `document` accessed at module import time. This is a CSR-only app, but it will crash in test environments (jsdom may not have everything) and is SSR-hostile.

### Steps

1. **Guard browser globals:**
   ```ts
   function getInitialMode(): ThemeMode {
     if (typeof window === 'undefined') return 'light'
     const stored = localStorage.getItem('ff-theme-mode')
     // ...
   }

   function applyMode(mode: ThemeMode) {
     if (typeof document === 'undefined') return
     // ...
   }
   ```

## Verification

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `grep -rn "useEntityReport\|useEntityGridReport" src/api/hooks/index.ts` — no results
- [ ] Funnel editor works with corrected types (no runtime type errors)
- [ ] DataTable has zero `as never` casts
- [ ] `src/store/funnelEditor.ts` is < 150 lines
- [ ] Tests can import theme store without crashing (after Plan 10 sets up vitest)
