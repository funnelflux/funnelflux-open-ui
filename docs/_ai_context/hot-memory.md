# Hot Memory — FunnelFlux Open UI (React 19)

Runtime source of truth for non-obvious operational knowledge. See Hot Memory Protocol in `CLAUDE.md`.

Format: `YYYY-MM-DD | status | scope | rule`. Status: `active`, `resolved`, `superseded`.

---

## Design System — Framework Choices

- **2026-04-12 | active | src/components/** — Ant Design v6 is the foundation. Remove shadcn wrappers; import directly from `antd`. Keep Tailwind (layout/spacing utilities) and react-hook-form + Zod (forms). Do NOT migrate to Ant Design Form.
- **2026-04-12 | active | src/styles/design-tokens.css + src/lib/antd-theme.ts** — Design tokens are defined twice: CSS variables for Tailwind/AG Grid, TypeScript constants for Ant Design `ThemeConfig` (cannot read CSS vars at runtime). All page styles use semantic tokens (`text-success`, `bg-primary`, `var(--ff-success)`) — no raw `text-green-600` or hex outside the token files.
- **2026-04-12 | active | antd ThemeConfig** — Use hex values (not OKLch) — ThemeConfig is hex-only.
- **2026-04-12 | active | src/lib/antd-theme.ts** — Dark mode flips `.dark` on `<html>`. Raw palette values stay constant; semantic aliases do the flipping.
- **2026-04-12 | active | toolbar/form controls** — Uniform 32px heights. Set antd `controlHeight: 32`. Explicitly override `Segmented` tokens. Remove every `size="small"` from toolbar-level controls (forces 24px and breaks density).
- **2026-04-12 | active | motion tokens** — Button hover animations disabled in theme config for a cleaner feel.

## Component Mappings (shadcn → antd)

- **2026-04-12 | active | Button** — `variant="ghost"` → `type="text"`; `variant="destructive"` → `danger type="primary"`; default → `type="primary"`; HTML `type` → `htmlType`. Drop the `variant` prop.
- **2026-04-12 | active | Select** — Flatten compound `SelectTrigger/Content/Item` to the flat `options` prop. Use `value={v || undefined}` and `className="w-full"`.
- **2026-04-12 | active | Sheet / Dialog** — Become `Drawer` / `Modal`. Move `SheetFooter` actions to Drawer's `extra` prop (header placement).
- **2026-04-12 | active | Badge** — Use antd `Tag` for most uses; reserve antd `Badge` (count variant) for notification counters — avoids naming collision with lucide-react's `Tag` icon.
- **2026-04-12 | active | Command (cmdk)** — Replace with `Modal + Input + List` pattern.

## Ant Design v6 Pitfalls

- **2026-04-12 | active | Modal / Drawer** — `destroyOnClose` is deprecated in v6 and triggers runtime warnings. Replace globally with `destroyOnHidden`.
- **2026-04-12 | active | Accordion → Collapse** — Flatten compound children to `items` array. `onValueChange` → `onChange`. Set `accordion` boolean to preserve single-open behavior.
- **2026-04-12 | active | RangePicker with showTime** — Selecting a date does not auto-advance panels — the state machine waits for an explicit "OK" click. Programmatically click OK with ~80ms delay after date selection. See `DateTimeRangePicker`.
- **2026-04-12 | active | Card** — `className` on Card sub-elements does not apply padding. Use `styles={{ header: {...}, body: {...} }}` prop.
- **2026-04-12 | active | Skeleton** — `className` width/height is ignored. Use typed subcomponents (`Skeleton.Input`, `Skeleton.Button`) with `active` and inline style dimensions.
- **2026-04-12 | active | Tag with downshift** — `Tag` does not reliably accept `getSelectedItemProps()` spread (strict prop typing). Render selected chips as styled `<span>`; reserve `Tag` for static elements like overflow indicators.
- **2026-04-12 | active | Dropdown checkbox items** — No direct equivalent to shadcn `DropdownMenuCheckboxItem`. Render a native `<label><input type="checkbox">` inside the menu item — do NOT force antd `Checkbox` into the menu structure.
- **2026-04-12 | active | Input ref typing** — Type as `InputRef` from `antd`, not `HTMLInputElement`. `.focus()` works directly; `.select()` must go through `ref.current.input.select()`.
- **2026-04-12 | active | Select with `as const` options** — Readonly arrays trip strict typing. Chain `.map()` to produce a mutable copy that satisfies antd types.
- **2026-04-12 | active | toasts** — Use antd `message` API (not `notification`). Center-aligned snackbar style, auto-dismiss 2s, max stack 3. The `useToastApi` hook uses `App.useApp()` — remove the custom `<ToastProvider>` wrapper; `<AntApp>` is enough.

## Layout & Shared Components

- **2026-04-12 | active | src/components/ui-kit/PageShell** — Replaces `PageHeader`. Actions go via the `actions` prop, never as children — prevents unpredictable DOM nesting.
- **2026-04-12 | active | src/components/ui-kit/SearchToolbar** — Use the `trailing` prop (rendered with `ml-auto`) for right-aligned controls. `DateTimeRangePicker` and `TimezoneSelect` always go in `trailing`, never mixed into the main `filters` array.
- **2026-04-12 | active | editing UI** — Open in Modals (not Drawers). Background gets `.ant-modal-mask { backdrop-filter: blur(4px); }`.
- **2026-04-12 | active | asset pages (campaigns, landers)** — Remove standalone "Rename"/"Delete" buttons from top headers. The floating `BulkActionsBar` is the only entry point for multi-row operations; appears on row selection.
- **2026-04-12 | active | BulkActionsBar** — Validate actions against selected asset hierarchy: "Move Category" only when children selected (not parents). Delete/Archive strictly require a confirmation dialog.

## Data Tables — TanStack React Table (post-migration)

- **2026-04-10 | active | src/components/ui-kit/data-table/** — `DataTable` (TanStack Table v8 + `@tanstack/react-virtual` 3) is the only grid. AG Grid was removed in commit `6359dc0` — `DataGrid`, `TreeDataGrid`, `reportColumns.tsx`, `ag-grid-theme.css`, `src/components/ui/data-grid/` are gone. Do not resurrect them; do not add `ag-grid-community` back to deps.
- **2026-04-10 | active | ui-kit imports** — Import from `@/components/ui-kit` only; never deep-import from `@/components/ui-kit/data-table/DataTable`. Column factories are re-exported there: `nameColumn`, `idColumn`, `visitsColumn`, `clicksColumn`, `ctrColumn`, `convColumn`, `revenueColumn`, `costColumn`, `plColumn`, `roiColumn`, `actionsColumn`, `selectionColumn`. Use the factories and the `cellRaw`/`cellFmt` helpers instead of redefining accessors/sorters/formatters per page.
- **2026-04-10 | active | DataTable columns** — Memoize `columns` with `useMemo`. A fresh array every render thrashes TanStack state (sizing, visibility, sort). Inside memoized columns, invoke page handlers via `useRef` so closures don't capture stale state. Enforced by the root verification checklist.
- **2026-04-10 | active | DataTable controlled state** — If you pass `sorting`, `rowSelection`, `pagination`, `columnVisibility`, or `expanded`, hold it in `useState` (or a zustand store) and pair each with its `onChange`. Never derive those objects inline.
- **2026-04-10 | active | DataTable styling** — Tag numeric columns with `meta: { numeric: true }` to get right-aligned `dt-cell--numeric`. Use `meta: { flex: N }` for stretch columns. Built-in factories already do this.
- **2026-04-10 | active | row selection** — Always use `selectionColumn()` + controlled `rowSelection` / `onRowSelectionChange` + `getRowId`. Selection survives re-sorts and re-fetches only with `getRowId`. No hand-rolled checkboxes.
- **2026-04-10 | active | tree tables** — `DataTable` with `treeMode` replaces `TreeDataGrid`. Provide `getSubRows` (pre-loaded children) or `onExpandRow` (lazy/async). No separate tree component exists.
- **2026-04-10 | active | report pages** — `useEntityGridReport` now drives `DataTable` (not AG Grid). Hook still manages pagination/sorting callbacks; DataTable handles sort/display/virtualization with `virtualizeThreshold={100}` or similar.
- **2026-04-12 | active | ColumnChooser** — Persists visibility to localStorage as `ff_columns_{storageKey}` — no backend storage. Column state is per-entity.
- **2026-04-12 | active | ColumnChooser perf** — The AG-Grid cascade bug is gone, but the discipline still applies: `useMemo` column definitions with stable deps; don't put arrays in `useEffect` deps when derived inline. Recreating columns every render resets TanStack column state.
- **2026-04-12 | active | BulkActionsBar** — `onSelectAll` still stays effectively no-op — rely on the native header-checkbox flow. `selectionColumn()` exposes header checkbox semantics.
- **2026-04-10 | active | src/components/ui-kit/dataGridHelpers.ts** — Local, untracked AG-Grid-era helper (`numericColumn`, `currencyColumn`, `percentColumn`, `profitLossColumn` as `Partial<ColDef>`). Do NOT import in new code. Equivalents: `meta: { numeric: true }`, `colorize` on `plColumn`/`roiColumn`. Delete once local WIP frees it.
- **2026-04-10 | active | src/pages/design-system/sections/CachingSection.tsx** — Still references a removed `DataGrid`. Broken reference, refactor to `DataTable` when touched.
- **2026-04-10 | active | ConfirmModal + useToastApi** — Destructive actions must go through `ConfirmModal`; never `window.confirm` or inline modal JSX. Toasts go through `useToastApi`, not `message.*` directly — it wires the FF theme and dark-mode sync.

### Superseded (AG Grid era)

- ~~Inline action icons pinned right in first column with solid white hover background~~ — was AG-Grid specific UX; TanStack action column uses `actionsColumn()` factory.
- ~~`cellRenderer: (params) => params.data`, `ColDef` with `field`/`valueGetter`~~ — replaced by TanStack `ColumnDef<T, unknown>` + `accessorFn` + factories.
- ~~`ThemeQuartz` theming~~ — replaced by `data-table.css` using design tokens only.
- ~~gridRef via plain prop (not `forwardRef`) to preserve generics~~ — AG-Grid concern; TanStack uses `Table<T>` return from `useReactTable`, no grid ref needed.

## Hooks & React 19 Stability

- **2026-04-12 | active | useMemo deps** — No `?? []` in dependency arrays. Reference the source property directly. Fallback defaults create new array identities every render.
- **2026-04-12 | active | unstable hook references (e.g. `useDrilldownReport()`)** — Wrap with `useCallback` or extract stable primitives. Do NOT pass raw hook returns into downstream memo deps.
- **2026-04-12 | active | React Compiler ESLint** — Mutate `ref.current` inside `useEffect` (not during render) to satisfy compiler rules.
- **2026-04-12 | active | react-refresh/only-export-components** — Extract utility constants and helpers out of component files into dedicated modules. Otherwise HMR breaks.

## State Management

- **2026-04-12 | active | src/store/ + src/api/hooks/** — Zustand for transient client UI state (dashboard, funnelEditor, drilldown, auth, theme). React Query for server state via entity hook files (`useCampaigns.ts` etc.). Do NOT introduce Redux, Context API for data, or manual fetch wrappers.

## v1 Feature Parity

- **2026-04-12 | active | page schema + UI** — `FluxifyParams` is defined in `src/types/entities.ts` but the Zod schema in `src/schemas/page.ts` lacks validation and `PageForm.tsx` renders no UI. When restoring: update all three layers together.
- **2026-04-12 | active | campaign schema + UI** — v1 admin supports campaign-level incoming-traffic cost overrides and traffic-source postback overrides — completely absent from React UI, entities.ts, and campaign Zod schema. Restore all three layers in one pass.
- **2026-04-12 | active | general rule** — v1 restoration always touches TypeScript types (`entities.ts`), Zod schema (`src/schemas/<entity>.ts`), and React form component simultaneously. Missing any one layer = silent data loss.
- **2026-04-12 | active | funnel builder** — Excluded from v1 parity work (separate team).

## Auth

- **2026-04-15 | active | src/api/client.ts** — React UI authenticates via PHP session cookies only (same-origin, `credentials: 'same-origin'`). Never add API key storage, input fields, headers, or query params. Login redirects to `/admin/login.php`.

## Backend Traffic Source Integration

- **2026-04-13 | active | src/api/hooks/useTrafficSources.ts + postback forms** — Backend `Postback` constructor requires `idTrafficSource`. On UPDATE: inject parent `idTrafficSource` into the `postback` sub-object before submit. On new TS POST: omit the `postback` object entirely — otherwise backend throws chicken-and-egg ID validation errors.

## Concurrent Agents

- **2026-04-11 | active | multi-agent sessions** — Design system / AG Grid migrations may be running in parallel. Re-check `src/pages/` + `src/components/shared/` imports before assuming a ui-kit component is dead code. A migration batch can land mid-session.
