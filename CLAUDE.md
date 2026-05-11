# FunnelFlux Open UI

Open-source React 19 + TypeScript admin UI for the FunnelFlux self-hosted tracking platform. Lives as a git submodule at `funnelflux-open-ui/` inside the parent PHP application; the build output is deployed to the parent's `v2-ui/` folder and served under the `/v2-ui/` base path.

## Rules

1. **Package manager is `pnpm`** (locked to `pnpm@10.11.1` via `package.json#packageManager`). Do NOT run `npm install` or `yarn`. The lockfile is `pnpm-lock.yaml` and there is a local `.pnpm-store/`.
2. Build before committing: `pnpm run build`
3. Lint before committing: `pnpm run lint`
4. Run tests before committing: `pnpm test`
5. Follow existing component patterns — check `src/pages/campaigns/CampaignsPage.tsx` for entity pages, `src/components/ui-kit/` for shared components.
6. Use the `@/` import alias for all `src/` imports (configured in `vite.config.ts` + `tsconfig.app.json`).
7. Do not commit or push without explicit permission.
8. Do not leave TODO placeholders in completed code.
9. Check the verification checklist at the end of this file before completing work.

## System Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19.2 + TypeScript 5.9 | UI components |
| Build | Vite 8 | Dev server + bundling |
| Package manager | pnpm 10.11 | Dependency management |
| Routing | react-router-dom 7 | Client-side routing (basename `/v2-ui`, lazy-loaded routes in `src/App.tsx`) |
| State | Zustand 5 | Global stores in `src/store/` (auth, dashboard, drilldown, funnelEditor, tableConfig, theme) |
| Data Fetching | @tanstack/react-query 5 | Server state + caching (default `staleTime: 30s`, `retry: 1` set in `src/App.tsx`) |
| UI Library | Ant Design 6 | Component library wrapped in `src/components/ui-kit/` |
| Data Grids | @tanstack/react-table 8 + react-virtual 3 | High-performance tables (DataGrid, TreeDataGrid in ui-kit) |
| Styling | Tailwind CSS 4 + CSS design tokens | Utility-first CSS + `src/styles/design-tokens.css` |
| Forms | react-hook-form 7 + Zod 4 (`@hookform/resolvers`) | Validation + form state |
| Canvas | @xyflow/react 12 | Funnel builder (nodes/edges) |
| Charts | Recharts 3 | Dashboard + reporting charts |
| Dates | date-fns 4 + `@date-fns/tz` | All date math (do NOT use dayjs in app code — it is only present transitively for AntD's DatePicker) |
| Sanitization | dompurify 3 | HTML sanitization (`src/lib/sanitize.ts`) |
| Theming | Zustand + CSS vars + Ant Design | Light/dark mode via `useThemeStore` (`src/store/theme.ts`) |
| Tests | vitest 4 + @testing-library/react + jsdom | Unit/component tests, setup at `src/test/setup.ts` |
| Linting | ESLint 9 (flat config) + typescript-eslint + eslint-plugin-jsx-a11y | `eslint.config.js` |

## Build, Test & Lint

```bash
pnpm install          # install dependencies (uses pnpm-lock.yaml)
pnpm run dev          # Vite dev server on :5173, proxies /admin to VITE_DEV_API_TARGET (default http://localhost:8080)
pnpm run dev:force    # same as dev, with Vite cache invalidated
pnpm run build        # tsc -b && vite build, outputs to dist/
pnpm run preview      # serve the built dist/
pnpm run lint         # ESLint
pnpm test             # vitest run (single pass)
pnpm run test:watch   # vitest watch mode
pnpm run generate-types  # node scripts/generate-types.mjs (regenerates types from OpenAPI specs in docs/api-specs/)
pnpm run check-generated-types  # regen + fail if src/types/generated differs from git (CI hygiene)
```

The dev server proxies `/admin/*` requests (PHP login + V2 API) to the backend so session cookies share the same origin. Backend must be running locally on port 8080 (Docker host) for the UI to function.

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, `packageManager` pin to pnpm@10.11.1 |
| `pnpm-lock.yaml` | pnpm lockfile (do not delete or replace with package-lock.json) |
| `vite.config.ts` | Vite config: `base: '/v2-ui/'`, `@/` alias, `/admin` proxy, port 5173 |
| `vitest.config.ts` | Vitest config: jsdom env, `src/test/setup.ts`, only matches `src/**/*.test.{ts,tsx}` |
| `tsconfig.json` | Project references root |
| `tsconfig.app.json` | App TS config (strict, ES2023, `@/*` path alias) |
| `tsconfig.node.json` | Build/tooling TS config |
| `eslint.config.js` | ESLint flat config (TS + react-hooks + react-refresh + jsx-a11y as warnings, ignores `dist`, `.claude`) |
| `postcss.config.js` | Tailwind 4 + autoprefixer pipeline |
| `index.html` | Vite entry HTML |
| `.env.example` | `VITE_BASE_PATH_PREFIX`, `VITE_API_PATH` (default `/admin/api/v2`), `VITE_UI_BASENAME` (default `/v2-ui`) |
| `scripts/generate-types.mjs` | Generates TS types from OpenAPI YAML specs in `docs/api-specs/` |

## Directory Structure

### Top-level

| Path | Purpose |
|------|---------|
| `src/` | Application source |
| `public/` | Static assets served as-is |
| `docs/` | Specs, API guides, exec plans, screenshots |
| `scripts/` | Build/codegen helpers |
| `.claude/`, `.agents/`, `.augment/`, `.commandcode/`, `.cursor/`, `.lerim/` | AI tooling configs (ignored by ESLint) |
| `dist/` | Build output (gitignored) |

### `src/` entry points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React root, mounts `<App />` |
| `src/App.tsx` | Router, AuthGate, QueryClient, theme ConfigProvider, lazy-loaded route definitions, permission guards (`canViewDashboard`, `isAdminUser`) |
| `src/index.css` | Global stylesheet (imports Tailwind + design tokens) |

### `src/api/`

| Path | Purpose |
|------|---------|
| `src/api/client.ts` | Fetch-based API client (handles auth, base URL, JSON parsing, and explicit `postDrilldown` bigint-safe parsing) |
| `src/api/auth.ts` | Auth endpoints |
| `src/api/queryKeys.ts` | Centralized React Query key factories |
| `src/api/drilldown.ts` | Drilldown report fetcher |
| `src/api/normalizeTemplateList.ts`, `offerSourceTemplateLoad.ts`, `trafficSourceTemplateLoad.ts` | Template normalization |
| `src/api/useAuth.ts`, `useEntityPage.ts`, `useNotifications.ts` | High-level page hooks |
| `src/api/generated/` | Auto-generated API types (do NOT hand-edit; regen via `pnpm run generate-types`) |
| `src/api/hooks/` | One React Query hook file per entity: `useCampaigns`, `useCategories`, `useCodeSnippets`, `useConditions`, `useDashboard`, `useDomains`, `useDrilldown`, `useEntityGrid`, `useFunnels`, `useGroupingFilterAssetOptions`, `useInbox`, `useOfferSources`, `usePages`, `useSavedViews`, `useStoredLinks`, `useSystemLinks`, `useSystemSettings`, `useTags`, `useTrafficFilters`, `useTrafficSources`, `useUserManagement`, and `index.ts` barrel |

### `src/components/`

| Path | Purpose |
|------|---------|
| `src/components/ui-kit/` | Design system primitives wrapping AntD: Button, Modal, Select, FormField, PageShell, ConfirmModal, DateTimeRangePicker, EmptyState, SearchToolbar, StatCard, TimezoneSelect, icons, toast, plus `index.ts` barrel and `data-table/` subdir |
| `src/components/funnel-builder/` | Visual funnel canvas: `FunnelCanvas.tsx`, `CanvasContextMenu`, `EdgeContextMenu`, `NodeContextMenu`, `EntityPickerDialog`, `FunnelAdvancedSettings`, `FunnelQuickStatsModal`, `FunnelSettingsModal`, `FunnelSettingsPanel`, `FunnelTopForm`, `FunnelUrlModal`, `LanderNodeEditModal`, `OfferNodeEditModal`, `NodePropertiesModal`, `HeatmapOverlay`, `HeatmapNodeBadge`, `ConditionEditor`, `ConditionBlock`, `ConditionRuleRow`, `ConditionFieldValueInput`, `validation.ts`, plus `nodes/` and `edges/` subdirs |
| `src/components/forms/` | Entity-specific forms (PageForm, TrafficSourceForm, etc.) using react-hook-form + Zod resolvers |
| `src/components/shared/` | Cross-page composed components (DataTable, ErrorBoundary, etc.) |
| `src/components/layout/` | App shell (`AppLayout`), navigation |
| `src/components/dashboard/` | Dashboard widgets |
| `src/components/drilldown/` | Drilldown report components |
| `src/components/settings/` | Settings page components |

### `src/pages/`

One directory per section. Page components are lazy-loaded in `src/App.tsx`.

| Path | Purpose |
|------|---------|
| `src/pages/DashboardPage.tsx` | Top-level dashboard |
| `src/pages/LoginPage.tsx` | Login form (used by `AuthGate`) |
| `src/pages/campaigns/` | Campaigns list (canonical entity-page example: `CampaignsPage.tsx`) |
| `src/pages/funnels/` | `FunnelEditorPage`, `FunnelBuilderLegacyRedirect` |
| `src/pages/traffic-sources/` | Traffic source management |
| `src/pages/offer-sources/` | Offer source management |
| `src/pages/PageEntitiesPage.tsx` | Shared offers/landers entity page shell (category-strip + table flow) |
| `src/pages/offers/`, `src/pages/landers/` | Thin wrappers around `PageEntitiesPage` with type-specific config |
| `src/pages/reports/` | `DrilldownTreePage`, `DrilldownFlatPage` |
| `src/pages/quickview/` | `QuickViewPage` |
| `src/pages/links/` | `SystemLinksPage`, `StoredLinksPage` |
| `src/pages/settings/` | `SystemSettingsPage`, `TagsPage`, `TrafficFiltersPage`, `GlobalConditionsPage`, `AccessLogPage`, `UserManagementPage`, `UserEditPage` |
| `src/pages/data-updates/` | `ConversionsPage`, `CostUpdatePage`, `ResetStatsPage` |
| `src/pages/inbox/` | `InboxPage` |
| `src/pages/design-system/` | `DesignSystemPage` (no-auth reference page at `/design-system`) |

### `src/store/` (Zustand)

| File | Purpose |
|------|---------|
| `src/store/auth.ts` | Auth state + user profile + permissions |
| `src/store/dashboard.ts` | Dashboard date range / filter state |
| `src/store/drilldown.ts` | Drilldown report filters, groupings, sorting |
| `src/store/funnelEditor.ts` | Funnel canvas state (nodes, edges, selection) |
| `src/store/tableConfig.ts` | Persisted column visibility / order config |
| `src/store/theme.ts` | Light/dark theme mode |

### `src/schemas/` (Zod)

One schema per entity: `campaign.ts`, `condition.ts`, `funnel.ts`, `landerNode.ts`, `offerNode.ts`, `offerSource.ts`, `page.ts`, `systemSettings.ts`, `trafficFilter.ts`, `trafficSource.ts`, `userEdit.ts`.

### `src/types/`

| File | Purpose |
|------|---------|
| `src/types/api.ts` | API request/response types, `UserProfile` (used by permission guards in App.tsx) |
| `src/types/entities.ts` | Domain entity types |
| `src/types/funnel.ts` | Funnel/canvas types |
| `src/types/stats.ts` | Reporting / drilldown stat types |
| `src/types/ui.ts` | UI helper types |

### `src/hooks/`

Custom React hooks. Page-level hooks live in `src/api/` (e.g. `useAuth.ts`, `useEntityPage.ts`). Shared table/page orchestration hooks (for example `useCategoryStripTableFlow.ts`) live here.

### `src/lib/`

Utilities, theming, and pure helpers (most have unit tests):

| File | Purpose |
|------|---------|
| `antd-theme.ts` | `lightTheme` / `darkTheme` AntD config tokens |
| `chart-theme.ts` | Recharts color palette tied to design tokens |
| `controlSize.ts` | Sizing helpers for form controls |
| `date-presets.ts` | Date range presets (Last 7d, MTD, etc.) |
| `id-generator.ts` | Stable ID generation |
| `sanitize.ts` | dompurify wrapper (with `sanitize.test.ts`) |
| `routeAccess.ts` | `canViewDashboard`, `isAdminUser` permission helpers |
| `routeRegistry.tsx` | Typed `ROUTE_ENTRIES`, nav builders, `getDefaultAuthorizedPath` |
| `paginationConfig.ts` (+ test), `bulkActions.ts` (+ test) | Grid behavior |
| `entityGridUtils.ts` (+ test), `entityGridSorting.ts` (+ test), `entityGridColumnVisibility.ts`, `entityPageDefaultColIds.ts` | Entity grid helpers |
| `categoryStripSelection.ts`, `categoryStripTable.tsx`, `paginateCategorySegments.ts` | Category strip UI |
| `drilldownGroupings.ts`, `drilldownTableSort.ts`, `groupingFilterAssets.ts`, `reportRowCells.ts`, `urlTrackingFieldGrouping.ts` | Drilldown report logic |
| `funnelApiV2.ts`, `funnelConditionFormBridge.ts`, `funnelCoords.ts`, `funnelEdgeGeometry.ts`, `funnelQuickStats.ts` | Funnel builder logic |
| `normalizeDomainsFromApi.ts`, `trafficFilterConstants.ts`, `urlTokens.ts`, `utils.ts` | Misc helpers |

### `src/styles/`

| File | Purpose |
|------|---------|
| `src/styles/design-tokens.css` | Color/spacing/radius/shadow CSS variables (light + dark) |

(Tailwind 4 reads tokens directly via CSS vars; AG Grid theme overrides may live alongside.)

### `src/test/`

| File | Purpose |
|------|---------|
| `src/test/setup.ts` | Vitest + Testing Library global setup |

### `docs/`

| Path | Purpose |
|------|---------|
| `docs/REACT_UI_EXEC_PLAN.md` | Master spec for the React UI rewrite |
| `docs/ARCHITECTURE.md` | System design and architecture |
| `docs/ADMIN_UI_SPEC.md` | Admin UI behavior spec |
| `docs/FUNNEL_API_GUIDE.md` | Funnel API usage reference |
| `docs/FRONTEND_ARCHITECTURE_REVIEW.md` | Frontend architecture review |
| `docs/V2_API_GAP_PLAN.md` | API gap tracking |
| `docs/CODEX_TASKS.md`, `docs/PROGRESS.md` | Task tracking |
| `docs/api-specs/data-api.yaml`, `stats-api.yaml`, `ui-api.yaml` | OpenAPI YAML specs (input for `pnpm run generate-types`) |
| `docs/_ai_context/` | AI context: `architecture-overview.md`, `code-quality-guidelines.md`, `debugging-methodology.md`, `work-planning-process.md`, `_glossary.md`, `context-engineering-guide.md`, `README.md` |
| `docs/exec-plans/` | Implementation plans |
| `docs/screenshots/` | UI screenshots |

## Context Map

| Working on... | Read these |
|---------------|-----------|
| New entity page | `docs/REACT_UI_EXEC_PLAN.md`, `src/pages/campaigns/CampaignsPage.tsx` |
| UI kit components | `src/components/ui-kit/index.ts`, `src/styles/design-tokens.css` |
| API integration | `docs/FUNNEL_API_GUIDE.md`, `docs/api-specs/`, `src/api/client.ts` |
| Funnel builder | `src/store/funnelEditor.ts`, `src/components/funnel-builder/` |
| Reporting/stats | `src/store/drilldown.ts`, `src/api/hooks/useDrilldown.ts`, `src/lib/drilldownGroupings.ts` |
| Theming/dark mode | `src/styles/design-tokens.css`, `src/lib/antd-theme.ts`, `src/store/theme.ts` |
| Charts | `src/lib/chart-theme.ts` |
| Data grids | `src/components/ui-kit/data-table/`, entity-grid helpers in `src/lib/entityGrid*.ts` |
| Permissions / route guards | `src/lib/routeAccess.ts`, `src/App.tsx` (PermissionGuard, AuthGate) |
| Code quality | `docs/_ai_context/code-quality-guidelines.md` |
| Architecture | `docs/_ai_context/architecture-overview.md`, `docs/ARCHITECTURE.md` |
| Debugging | `docs/_ai_context/debugging-methodology.md` |
| Planning | `docs/_ai_context/work-planning-process.md` |
| Terminology | `docs/_ai_context/_glossary.md` |

## State Management Rules

- **Server data → React Query.** All data fetched from the API uses `@tanstack/react-query` with hooks in `src/api/hooks/`. Caching, background refetching, and loading/error states belong here.
- **Client UI state → Zustand.** Auth, theme, drilldown filters, funnel canvas state, persisted table config — anything that does not come from the server.
- Do not use React Query for purely local UI state. Do not use Zustand for server-fetched data.

## API & Query Guardrails

- Add new query keys in `src/api/queryKeys.ts`; do not create ad hoc literal key arrays at call sites.
- Use `api.postDrilldown(...)` for drilldown report requests so `raw` bigint metrics are parsed safely.
- `codeEdgeRole` on funnel code edges is UI-only; never add it to PHP-facing save payloads.
- Keep offers/landers page differences in wrapper files; shared table/category-strip behavior belongs in `src/pages/PageEntitiesPage.tsx` + `src/hooks/useCategoryStripTableFlow.ts`.

## UI / Styling Rules

- Import design-system primitives from `@/components/ui-kit` (do NOT add shadcn/ui, MUI, or other libraries).
- Import `DataTable` and related column helpers from `@/components/ui-kit/data-table` (not from the ui-kit barrel).
- Performance-critical bootstrap/layout files may import specific ui-kit modules directly (for example `@/components/ui-kit/ConfigProvider`) to keep shared chunks small.
- Use Tailwind utilities for layout. Use CSS vars from `src/styles/design-tokens.css` for colors/spacing — no hardcoded hex outside token files.
- Compose conditional classes with `clsx` or `tailwind-merge`.
- All dates: `date-fns` (+ `@date-fns/tz`). `dayjs` is transitively present for AntD's DatePicker only — do NOT import it in app code.
- Use `@/` alias for every import inside `src/`. No relative `../../../` chains.

## Performance Rules for Hooks & Effects

Tables render thousands of rows. A single unstable dependency in a `useEffect` can cascade into grid API thrashing and freeze the UI. These rules are non-negotiable.

### 1. Memoize `columnDefs` with `useMemo`

Column definition arrays MUST be wrapped in `useMemo`. A bare `const columnDefs = [...]` inside a component body creates a new array on every render and propagates to every consumer.

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
// WRONG — cloneMutation changes identity every render
const columnDefs = useMemo(() => [
  nameColumn({ actions: (p) => <Button onClick={() => cloneMutation.mutate(p.data.id)} /> }),
], [cloneMutation])

// RIGHT — ref holds latest callback, memo deps stay stable
const handleCloneRef = useRef(handleClone)
handleCloneRef.current = handleClone
const columnDefs = useMemo(() => [
  nameColumn({ actions: (p) => <Button onClick={() => handleCloneRef.current(p.data.id)} /> }),
], [])
```

### 3. Never put derived arrays/objects in `useEffect` dependencies

`.filter()`, `.map()`, `[...spread]`, `{ ...spread }` create new references every render. Effects depending on them fire every render.

```tsx
// WRONG — toggleable is a new array every render
const toggleable = columnDefs.filter(c => c.colId)
useEffect(() => { /* ... */ }, [toggleable])

// RIGHT — derive a stable key, or move the derivation inside the effect
const colIds = useMemo(() => columnDefs.map(c => c.colId).join(','), [columnDefs])
```

### 4. Never call expensive APIs in effects without diffing

If a `useEffect` calls grid APIs, localStorage writes, or network requests, it MUST guard against no-op calls — diff previous vs current state and only act on actual changes.

### 5. Verify the cascade

Before writing any `useEffect` that receives props from a grid parent, trace the full chain: parent state change → does the prop reference change → does the effect fire → does it call grid APIs? If yes to all and the data hasn't semantically changed, you have a bug.

## Routing & Auth

- All authenticated routes are mounted under `<AppLayout />` in `src/App.tsx`. The router basename is `import.meta.env.VITE_UI_BASENAME || '/v2-ui'`.
- `<AuthGate />` blocks the tree until `useAuth()` resolves; on `AUTH_REQUIRED` it renders `<LoginPage />`.
- `<PermissionGuard check={...}>` wraps each route that needs an entitlement check. Helpers live in `src/lib/routeAccess.ts`.
- `/design-system` is intentionally outside `<AuthGate>` so the design reference can be inspected without logging in.

## Verification Checklist

Before marking work as complete, verify:
- [ ] `pnpm run build` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm test` passes
- [ ] No TODO placeholders remain in completed code
- [ ] Changes are scoped to what was requested
- [ ] New components follow existing patterns (check similar pages/components)
- [ ] Design tokens used for colors/spacing — no hardcoded hex values outside token files
- [ ] No unstable references in `useEffect` deps (no inline `.filter()`, `.map()`, object literals)
- [ ] `columnDefs` and expensive computations wrapped in `useMemo` with stable deps
- [ ] Action handlers in memoized `columnDefs` use the `useRef` pattern
- [ ] New/updated drilldown report calls use `api.postDrilldown(...)`
- [ ] New react-query keys are added to `src/api/queryKeys.ts` (no ad hoc literal key arrays)
- [ ] New settings/entity forms follow RHF + Zod pattern (`src/schemas/*`)
- [ ] Import alias `@/` used for all `src/` imports
- [ ] Used `pnpm` (never `npm` or `yarn`) for any dependency changes
