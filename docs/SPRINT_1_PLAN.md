# Sprint 1 Plan — `funnelflux-open-ui`

**Goal:** Improve onboarding docs and break up two god-files — **no behavior changes**.

**Estimated effort:** ~2 days (1 hr + 1 day + 0.5 day)

**Done when:** All checkboxes below are ticked and `pnpm run lint && pnpm test && pnpm run build` pass.

---

## Recommended order

Do tasks in this sequence — each one de-risks the next:

| # | Task | Why this order |
|---|---|---|
| 1 | Docs (`README` + `CONTRIBUTING`) | Fast win, zero code risk, unblocks new contributors immediately |
| 2 | `useCampaignsController` extraction | Smaller refactor; establishes the pattern before the bigger toolbar split |
| 3 | `DrilldownToolbar` split | Largest change; do last when you have momentum and a clean baseline |

---

## Task 1 — Fix onboarding docs (~1 hour)

### Files to edit

- `README.md`
- `CONTRIBUTING.md`

Use `CLAUDE.md` as the source of truth (it is already correct).

### Checklist — README.md

- [ ] Replace every `npm install` / `npm run …` with `pnpm install` / `pnpm run …`
- [ ] Prerequisites: say **pnpm 10.11.1** (pinned in `package.json#packageManager`), not npm 10+
- [ ] Fix component path: `src/components/ui/` → `src/components/ui-kit/`
- [ ] Fix import example: `@/components/ui-kit` (not `@/components/ui/button`)
- [ ] Mention key directories newcomers will hit:
  - `src/components/ui-kit/` — design system
  - `src/components/funnel-builder/` — funnel canvas
  - `src/lib/entity-table/` — shared list+stats table engine
  - `src/lib/funnel-graph/` — funnel validation/hydration helpers
- [ ] Point to `CLAUDE.md` and `CONTRIBUTING.md` for deeper conventions
- [ ] Keep it short — README is a landing page, not a second CLAUDE.md

### Checklist — CONTRIBUTING.md

- [ ] Same pnpm fixes as README
- [ ] Directory table: rename `ui/` → `ui-kit/`, add missing rows:

  | Path | Purpose |
  |------|---------|
  | `src/components/ui-kit/` | Design system (AntD wrappers) |
  | `src/components/ui-kit/data-table/` | DataTable + column helpers (import separately, not from ui-kit barrel) |
  | `src/components/funnel-builder/` | Visual funnel editor |
  | `src/lib/entity-table/` | Entity list + drilldown stats engine |
  | `src/lib/funnel-graph/` | Funnel graph validation/coercion |
  | `src/pages/<feature>/use*Controller.ts` | Page orchestration hooks (see offer-sources pattern) |

- [ ] Canonical examples section:
  - Entity page with controller: `src/pages/offer-sources/OfferSourcesPage.tsx` + `useOfferSourcesController.ts`
  - Complex entity page (campaign tree): `src/pages/campaigns/CampaignsPage.tsx` (will reference controller after Task 3)
  - API hooks: `src/api/hooks/useCampaigns.ts`
  - Forms: `src/schemas/page.ts` + `src/components/forms/PageForm.tsx`
- [ ] PR checklist: change `npm run build/lint` → `pnpm run build/lint/test`
- [ ] Add one line: `.cursor/rules/` holds enforced conventions (AntD in ui-kit only, pnpm, memoized columnDefs, etc.)

### Acceptance criteria

- [ ] No `npm install` or `src/components/ui/` references remain in README or CONTRIBUTING
- [ ] A new dev can follow README alone and run the app with pnpm

---

## Task 2 — Extract `useCampaignsController.ts` (~half day)

### Goal

Move orchestration out of `CampaignsPage.tsx` (~770 LOC) into a hook, matching the existing pattern:

```
OfferSourcesPage.tsx          → thin JSX shell
useOfferSourcesController.ts  → state, mutations, grid, handlers
OfferSourcesDialogs.tsx       → modals (optional follow-up)
```

### Target layout

```
src/pages/campaigns/
├── CampaignsPage.tsx              # ~150–200 LOC — layout only
├── useCampaignsController.ts      # NEW — all hook/state/handler logic
├── campaignTreeAdapter.ts         # unchanged
├── AddFunnelModal.tsx             # unchanged
├── CloneFunnelModal.tsx           # unchanged
└── CampaignEditorModal.tsx        # unchanged (or CampaignEditForm.tsx)
```

**Optional (same sprint if time):** `CampaignsDialogs.tsx` for the 4 overlays currently inline in `CampaignsPage`. Not required for sprint success — controller extraction is the must-have.

### What moves into `useCampaignsController.ts`

| Category | Move to controller |
|---|---|
| Constants | `TABLE_KEY`, `CAMPAIGNS_MAX_PAGE_SIZE`, `PendingAction` type |
| Helpers | `buildCampaignTotalsRow`, `archiveCampaignRemote`, `archiveFunnelRemote` |
| State | search, archiveStatus, tz, dateRange, pagination, rowSelection, modals, pendingAction, confirmLoading, table refs |
| Data | `useEntityTable` call, metric column derivation, `loadPageData`, stat cols |
| Handlers | clone/delete/archive (single + bulk), edit navigation, funnel created, campaign persisted, confirm flow |
| Derived | `columnDefs`, `pinnedBottomRows`, `bulkTargetRows`, confirm title/description, `pageBodyState` inputs |
| Permissions | `canEditCampaigns` from auth store |

### What stays in `CampaignsPage.tsx`

- JSX for `EntityPage` (title, headerActions, searchToolbarProps, tableProps, bulkActions)
- Wiring: `const controller = useCampaignsController()`
- Module-level row helpers that are purely presentational: `canSelectCampaignRow`, `campaignRowClassName`
- Thin `useCallback` wrappers only if they exist solely to adapt controller API to JSX props (prefer exposing stable handlers from the controller instead)

### Controller return shape (mirror offer-sources)

Export a single object with grouped concerns:

```ts
export function useCampaignsController() {
  return {
    // labels (if useful)
    tableRef,
    setTableForChooser,
    tableForChooser,

    // grid
    controller,          // or flatten: rows, isLoading, error, reload, sorting, pageCount, totalRows
    columnDefs,
    pinnedBottomRows,
    pageBodyState,

    // filters
    search, setSearch,
    archiveStatus, setArchiveStatus,
    dateRange, setDateRange, handleDateRangeChange,
    tz, setTz,
    pagination, handlePaginationChange,

    // selection / bulk
    rowSelection, handleRowSelectionChange,
    bulkTargetRows,
    handleBulkDeselectAll, handleBulkArchive, handleBulkDelete,

    // modals
    addFunnelModalOpen, setAddFunnelModalOpen, addFunnelModalKey,
    cloneFunnelSource, setCloneFunnelSource, cloneFunnelModalKey,
    campaignModal, setCampaignModal,
    pendingAction, confirmLoading, confirmTitle, confirmDescription, confirmDanger,
    handleCancelConfirm, handleConfirmAction,
    handleFunnelCreated, handleCampaignPersisted,

    // table config
    tableConfig, handleTableColumnSizingChange, handleTableColumnVisibilityChange,
    selectedColumnIds, handleChooserColumnsChange,

    // permissions
    canEditCampaigns,
  }
}
```

Flatten or nest — match `useOfferSourcesController` style for consistency.

### Step-by-step

1. [ ] Create `useCampaignsController.ts`; copy logic from `CampaignsPage` body (no JSX)
2. [ ] Export `CampaignRow`-related types re-used by the hook if needed (or import from `campaignTreeAdapter.ts`)
3. [ ] Slim `CampaignsPage.tsx` to controller + JSX only
4. [ ] Run `pnpm run lint` — fix any hook dependency warnings
5. [ ] Manual smoke: campaigns list loads, search, archive tab, sort, pagination, edit campaign, add funnel, clone/delete/archive single row, bulk actions, column chooser, totals row

### Acceptance criteria

- [ ] `CampaignsPage.tsx` ≤ ~250 LOC
- [ ] `useCampaignsController.ts` exists and owns all mutations / cache patches
- [ ] No behavior change (same API calls, same cache invalidation, same UX)
- [ ] `pnpm test && pnpm run build` pass

### Out of scope for this task

- Changing campaign tree adapter logic
- Adding new tests (quarter goal)
- Extracting `CampaignsDialogs.tsx` (nice-to-have)

---

## Task 3 — Split `DrilldownToolbar.tsx` (~1 day)

### Goal

Break the 991-line file into a folder. **Keep the public import path unchanged:**

```ts
import { DrilldownToolbarProvider, … } from '@/components/drilldown/DrilldownToolbar'
```

Consumers today: `DrilldownTreePage.tsx`, `DrilldownFlatPage.tsx`.

### Target layout

```
src/components/drilldown/DrilldownToolbar/
├── index.tsx                 # re-exports everything (public API)
├── types.ts                  # DrilldownToolbarProps, DrilldownExportRequest
├── context.tsx               # DrilldownToolbarContext + useDrilldownToolbarContext
├── state.ts                  # useDatePickerState, useDrilldownToolbarState
├── exportCsv.ts              # pure export helper (extracted from handleExport)
├── HeaderFilters.tsx         # DrilldownToolbarHeaderFilters
├── ReportActions.tsx         # DrilldownToolbarReportActions + saved-view modals
├── SettingsDrawer.tsx        # DrilldownSettingsDrawer (private)
├── FiltersDrawer.tsx         # DrilldownFiltersDrawer (private)
├── ConfigPanel.tsx           # DrilldownToolbarConfigPanel
├── Controls.tsx              # DrilldownToolbarControls (legacy combo)
└── DrilldownToolbar.tsx      # standalone legacy layout wrapper
```

**Delete** the old monolith file after the folder + `index.tsx` re-export is in place.

### File mapping (line ranges from current monolith)

| New file | Contents from current `DrilldownToolbar.tsx` |
|---|---|
| `types.ts` | `DrilldownToolbarProps`, `DrilldownExportRequest`, `DrilldownToolbarContextValue`, `TIME_ATTRIBUTION_OPTIONS` |
| `state.ts` | `useDatePickerState`, `useDrilldownToolbarState` (lines ~61–430) |
| `context.tsx` | context create + `useDrilldownToolbarContext` + `DrilldownToolbarProvider` |
| `exportCsv.ts` | `buildDrilldownExportRequest` + `downloadDrilldownCsv` (logic from `handleExport`) |
| `HeaderFilters.tsx` | `DrilldownToolbarHeaderFilters` + `presetRanges` helper |
| `SettingsDrawer.tsx` | `DrilldownSettingsDrawer` |
| `FiltersDrawer.tsx` | `DrilldownFiltersDrawer` |
| `ReportActions.tsx` | `DrilldownToolbarReportActions` (saved views UI, apply/export buttons, modals) |
| `ConfigPanel.tsx` | `DrilldownToolbarConfigPanel`, deprecated `DrilldownToolbarGroupings` |
| `Controls.tsx` | `DrilldownToolbarControls` |
| `DrilldownToolbar.tsx` | standalone `DrilldownToolbar` composite |
| `index.tsx` | `export * from './…'` for all public symbols |

### `exportCsv.ts` sketch

Pure functions — easy to unit test later:

```ts
export function buildDrilldownExportRequest(
  request: DrilldownRequest,
  dateFrom: Date,
  dateTo: Date,
): DrilldownExportRequest

export async function downloadDrilldownCsv(
  request: DrilldownExportRequest,
  filename: string,
): Promise<void>
```

`state.ts` `handleExport` becomes a thin wrapper calling these + toast on error.

### Step-by-step

1. [ ] Create folder `DrilldownToolbar/`
2. [ ] Extract `types.ts` and `context.tsx` first (everything else depends on them)
3. [ ] Move `state.ts` — largest piece; verify imports
4. [ ] Extract `exportCsv.ts`; wire `handleExport` to use it
5. [ ] Move UI components one at a time: `HeaderFilters` → drawers → `ReportActions` → `ConfigPanel` → `Controls` → legacy `DrilldownToolbar`
6. [ ] Add `index.tsx` re-exporting the same public API as today:

   ```ts
   export type { DrilldownToolbarProps } from './types'
   export { DrilldownToolbarProvider } from './context'
   export { DrilldownToolbarHeaderFilters } from './HeaderFilters'
   export { DrilldownToolbarReportActions } from './ReportActions'
   export { DrilldownToolbarConfigPanel, DrilldownToolbarGroupings } from './ConfigPanel'
   export { DrilldownToolbarControls } from './Controls'
   export { DrilldownToolbar } from './DrilldownToolbar'
   ```

7. [ ] Delete `src/components/drilldown/DrilldownToolbar.tsx` (the old file)
8. [ ] Confirm imports in `DrilldownTreePage.tsx` and `DrilldownFlatPage.tsx` still resolve (path unchanged)
9. [ ] Run lint/build/test

### Rules while splitting

- **No behavior changes** — copy/paste first, refactor second
- Keep `useCallback` / `useMemo` patterns intact (performance rules in CLAUDE.md)
- Drawers stay private (not exported) — they were already file-local
- Do not move `DrilldownConfigPanel.tsx` or `DrilldownFiltersPanel.tsx` — they are separate shared panels already

### Manual smoke (both report pages)

- [ ] Tree drilldown: change date range, timezone, attribution → Apply → rows load
- [ ] Flat drilldown: same
- [ ] Saved views: save, load, rename, delete
- [ ] Export CSV downloads
- [ ] Filters drawer opens and applies whitelist/blacklist
- [ ] Settings drawer toggles filtered traffic / winners
- [ ] Groupings panel add/remove/reorder levels

### Acceptance criteria

- [ ] No file in `DrilldownToolbar/` exceeds ~350 LOC
- [ ] Public import path `@/components/drilldown/DrilldownToolbar` unchanged
- [ ] All exported symbols preserved (including deprecated `DrilldownToolbarGroupings`)
- [ ] `pnpm run lint && pnpm test && pnpm run build` pass

---

## Sprint verification gate

Run once after all three tasks:

```bash
cd funnelflux-open-ui
pnpm run lint
pnpm test
pnpm run build
```

Manual checks:

- [ ] Campaigns page — full CRUD smoke (Task 2)
- [ ] Drilldown tree + flat — toolbar smoke (Task 3)
- [ ] Fresh clone: follow README with pnpm only (Task 1)

---

## Out of scope (Sprint 1)

Do **not** do these in this sprint — they belong to the quarter plan:

- `routeRegistry.tsx` split
- Hook-level / Playwright tests
- Bundle audit
- Zod auth boundary
- `PageForm.tsx` split
- `DrilldownTreePage.tsx` split
- `CampaignsDialogs.tsx` (unless you finish Task 2 early)

---

## Suggested PR strategy

| PR | Contents | Review focus |
|---|---|---|
| PR 1 | Task 1 — docs only | Copy accuracy vs CLAUDE.md |
| PR 2 | Task 2 — campaigns controller | Behavior parity, hook deps |
| PR 3 | Task 3 — DrilldownToolbar folder | Import path stable, no logic drift |

Three small PRs beat one 2-day mega-PR.

---

## Quick reference — canonical patterns

| Pattern | Reference file |
|---|---|
| Thin page + controller hook | `src/pages/offer-sources/OfferSourcesPage.tsx` |
| Controller implementation | `src/pages/offer-sources/useOfferSourcesController.ts` |
| Dialogs extracted | `src/pages/offer-sources/OfferSourcesDialogs.tsx` |
| Entity table engine | `src/lib/entity-table/useEntityTable.ts` |
| Project conventions | `CLAUDE.md` |
