# FunnelFlux Open UI

## Rules

1. Build before committing: `npm run build`
2. Lint before committing: `npm run lint`
3. Follow existing component patterns — check `src/pages/campaigns/CampaignsPage.tsx` for entity pages, `src/components/ui-kit/` for shared components
4. Use the `@/` import alias for all src imports (configured in vite.config.ts + tsconfig)
5. Do not commit or push without explicit permission
6. Do not leave TODO placeholders in completed code
7. Check the verification checklist at the end of this file before completing work

## System Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19 + TypeScript 5.9 | UI components |
| Build | Vite 8 | Dev server + bundling |
| Routing | react-router-dom 7 | Client-side routing |
| State | Zustand 5 | Global stores (auth, dashboard, drilldown, funnelEditor, theme) |
| Data Fetching | @tanstack/react-query 5 | Server state + caching |
| UI Library | Ant Design 6 | Component library (buttons, forms, modals, etc.) |
| Data Grids | AG Grid 35 | High-performance tables (DataGrid, TreeDataGrid in ui-kit) |
| Styling | Tailwind CSS 4 + CSS design tokens | Utility-first CSS + `src/styles/design-tokens.css` |
| Forms | react-hook-form 7 + Zod 4 | Validation + form state |
| Canvas | @xyflow/react 12 | Funnel builder (nodes/edges) |
| Charts | Recharts 3 | Dashboard + reporting charts |
| Theming | Zustand + CSS vars + Ant Design | Light/dark mode via `useThemeStore` |

## Build, Test & Lint

```bash
npm run build    # tsc -b && vite build
npm run dev      # Vite dev server on :5173 (proxies /admin/api/v2 to :8080)
npm run lint     # ESLint
```

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `src/api/` | API client (`client.ts`), query keys, hooks (one hook file per entity) |
| `src/api/hooks/` | React Query hooks — one file per entity (e.g. `useCampaigns.ts`) |
| `src/components/ui-kit/` | Design system components (DataGrid, PageShell, FormField, etc.) |
| `src/components/funnel-builder/` | Funnel canvas: nodes, edges, context menus, conditions |
| `src/components/forms/` | Entity-specific form components |
| `src/components/shared/` | Legacy shared components (DataTable, DateRangePicker, etc.) |
| `src/components/layout/` | App shell, navigation |
| `src/pages/` | Page-level components, one dir per section |
| `src/store/` | Zustand stores (auth, dashboard, drilldown, funnelEditor, theme) |
| `src/schemas/` | Zod validation schemas per entity |
| `src/types/` | TypeScript type definitions (api, entities, funnel, stats, ui) |
| `src/hooks/` | Custom React hooks (useAuth, useNotifications) |
| `src/lib/` | Utilities (antd-theme, chart-theme, date-presets, id-generator, utils) |
| `src/styles/` | CSS: design-tokens.css (color/spacing vars), ag-grid-theme.css |
| `docs/` | Specs, API guides, exec plans |
| `docs/api-specs/` | OpenAPI YAML specs (data-api, stats-api, ui-api) |

## Context Map

| Working on... | Read these |
|---------------|-----------|
| New entity page | `docs/REACT_UI_EXEC_PLAN.md`, `src/pages/campaigns/CampaignsPage.tsx` |
| UI kit components | `src/components/ui-kit/index.ts`, `src/styles/design-tokens.css` |
| API integration | `docs/FUNNEL_API_GUIDE.md`, `docs/api-specs/`, `src/api/client.ts` |
| Funnel builder | `src/store/funnelEditor.ts`, `src/components/funnel-builder/` |
| Reporting/stats | `src/store/drilldown.ts`, `src/api/hooks/useDrilldown.ts` |
| Theming/dark mode | `src/styles/design-tokens.css`, `src/lib/antd-theme.ts`, `src/store/theme.ts` |
| Charts | `src/lib/chart-theme.ts` |
| Data grids | `src/components/ui-kit/DataGrid.tsx`, `src/styles/ag-grid-theme.css` |
| Code quality | `docs/_ai_context/code-quality-guidelines.md` |
| Architecture | `docs/_ai_context/architecture-overview.md` |
| Debugging | `docs/_ai_context/debugging-methodology.md` |
| Planning | `docs/_ai_context/work-planning-process.md` |
| Terminology | `docs/_ai_context/_glossary.md` |

## Performance Rules for Hooks & Effects

Tables render thousands of rows. A single unstable dependency in a `useEffect` can cascade into grid API thrashing and freeze the UI. These rules are non-negotiable.

### 1. Memoize `columnDefs` with `useMemo`

Column definitions arrays MUST be wrapped in `useMemo`. A bare `const columnDefs: ColDef[] = [...]` inside a component body creates a new array on every render, which propagates to every consumer (ColumnChooser, AG Grid).

```tsx
// WRONG — new array every render
const columnDefs: ColDef[] = [nameColumn(), idColumn(), ...]

// RIGHT — stable reference, only recomputes when column indices change
const columnDefs = useMemo<ColDef[]>(() => [
  nameColumn(), idColumn(), ...
], [iVisits, iClicks, ...])
```

### 2. Use refs for unstable callbacks inside memoized values

Action handlers that reference mutations/toast/reload are unstable (new identity every render). Use `useRef` to break the dependency chain:

```tsx
// WRONG — cloneMutation changes identity every render, breaks memoization
const columnDefs = useMemo(() => [
  nameColumn({ actions: (p) => <Button onClick={() => cloneMutation.mutate(p.data.id)} /> }),
], [cloneMutation]) // defeats the purpose — deps change every render

// RIGHT — ref holds latest callback, memo deps stay stable
const handleCloneRef = useRef(handleClone)
handleCloneRef.current = handleClone
const columnDefs = useMemo(() => [
  nameColumn({ actions: (p) => <Button onClick={() => handleCloneRef.current(p.data.id)} /> }),
], []) // stable — state setters and refs don't need to be deps
```

### 3. Never put derived arrays/objects in `useEffect` dependencies

`.filter()`, `.map()`, `[...spread]`, and `{ ...spread }` create new references every render. A `useEffect` depending on them fires every render.

```tsx
// WRONG — toggleable is a new array every render, effect fires every render
const toggleable = columnDefs.filter(c => c.colId)
useEffect(() => {
  api.setColumnsVisible(...)   // called on EVERY parent state change
  localStorage.setItem(...)    // written on EVERY parent state change
}, [toggleable])               // new reference every time

// RIGHT — derive a stable key, or move the derivation inside the effect
const colIds = useMemo(() => columnDefs.map(c => c.colId).join(','), [columnDefs])
```

### 4. Never call expensive APIs in effects without diffing

If a `useEffect` calls AG Grid API methods, localStorage writes, or network requests, it MUST guard against no-op calls. Compare previous vs current state and only act on actual changes.

### 5. Verify the cascade

Before writing any `useEffect` or component that receives props from a parent with AG Grid, trace the full chain: what state change triggers the parent re-render → does the prop reference change → does the effect fire → does it call grid APIs? If the answer to all is "yes" and the data hasn't semantically changed, you have a bug.

## Verification Checklist

Before marking work as complete, verify:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No TODO placeholders remain in completed code
- [ ] Changes are scoped to what was requested
- [ ] New components follow existing patterns (check similar pages/components)
- [ ] Design tokens used for colors/spacing — no hardcoded hex values outside token files
- [ ] No unstable references in useEffect deps (no inline `.filter()`, `.map()`, object literals)
- [ ] `columnDefs` and expensive computations wrapped in `useMemo` with stable deps
- [ ] Action handlers in memoized columnDefs use `useRef` pattern, not direct mutation/toast refs
