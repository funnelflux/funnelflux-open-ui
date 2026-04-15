# UI Kit

The shared design-system layer. Every page should compose these primitives
instead of reaching for raw Ant Design components or hand-rolled tables.

`DataTable` is built on `@tanstack/react-table` 8 plus
`@tanstack/react-virtual` 3. The legacy AG Grid wrappers (`DataGrid`,
`TreeDataGrid`, `reportColumns.tsx`, `ag-grid-theme.css`) have been
removed — do not resurrect them.

## Rules

1. **Add new exports to `index.ts`.** Anything not re-exported there is private to the kit. Pages must import from `@/components/ui-kit`, never from a deep path like `@/components/ui-kit/data-table/DataTable`.
2. **No hardcoded colors, spacing, radii, or typography.** Use CSS variables from `src/styles/design-tokens.css` (or the JS mirror in `src/lib/antd-theme.ts` for Ant Design tokens). If a token is missing, add it to the token file first, then use it. `data-table.css` in `data-table/` already uses tokens — keep it that way.
3. **`columns` passed to `DataTable` MUST be memoized in the caller.** A new array each render thrashes TanStack Table state (column sizing, visibility, sort order). See `docs/_ai_context/performance-hooks-rules.md`. Use the `useRef` pattern for action handlers inside memoized columns.
4. **Controlled table state must be real state.** If you pass `sorting`, `rowSelection`, `pagination`, `columnVisibility`, or `expanded` to `DataTable`, hold it in `useState` (or a zustand store) and pair each prop with its `onChange` handler. Never derive those objects inline.
5. **Use the column factories from `ui-kit/data-table/columnDefs.tsx`** (`nameColumn`, `idColumn`, `visitsColumn`, `clicksColumn`, `ctrColumn`, `convColumn`, `revenueColumn`, `costColumn`, `plColumn`, `roiColumn`, `actionsColumn`, `selectionColumn`) and the cell helpers `cellRaw` / `cellFmt` instead of redefining accessors, sorters, or formatters per page. All of them are re-exported from `@/components/ui-kit`.
6. **Tag numeric columns with `meta: { numeric: true }`** so the `dt-cell--numeric` style (right-aligned) applies. Use `meta: { flex: N }` for columns that should stretch instead of having a fixed width. The built-in factories already set these where appropriate.
7. **Row selection goes through `selectionColumn()`**, not hand-rolled checkboxes. Pair with controlled `rowSelection` / `onRowSelectionChange` and `getRowId` so selection survives re-sorts and re-fetches.
8. **Tree views use `DataTable` with `treeMode`**, not a separate component. Provide `getSubRows` for pre-loaded children or `onExpandRow` for lazy/async loading. `TreeDataGrid` no longer exists.
9. **Toasts go through `useToastApi`**, not Ant Design's `message.*` directly. The hook wires the FunnelFlux toast theme and stays in sync with dark mode.
10. **Confirm destructive actions via `ConfirmModal`** — never `window.confirm` and never inline modal JSX in page components.
11. **Page chrome belongs in `PageShell`.** Title, breadcrumbs, primary actions all come from the shell; pages render their content inside the shell, not above or around it.
12. **`SmartSelect` / `SmartMultiSelect` are the standard select widgets.** They handle async loading, search, and design-system styling. Reach for raw Ant `Select` only when SmartSelect genuinely cannot express the UX.
13. **Timezone handling goes through `TimezoneSelect` + `getStoredTimezone`.** Do not parse or store timezone strings ad hoc.
14. **Date/time pickers use `DateTimeRangePicker`**, which already integrates with the dashboard date presets in `src/lib/date-presets.ts`.

## Inventory

Exported from `src/components/ui-kit/index.ts`:

| Export | Source | Purpose |
|--------|--------|---------|
| `PageShell` | `PageShell.tsx` | Standard page wrapper (title, breadcrumbs, actions) |
| `DataTable` | `data-table/DataTable.tsx` | TanStack-based grid with sorting, pagination, resizing, selection, tree mode, virtualization |
| `DataTableProps`, `ColumnDef`, `SortingState`, `VisibilityState`, `RowSelectionState`, `Table` | `data-table/types.ts` | TanStack Table types re-exported for consumers |
| `nameColumn`, `idColumn`, `visitsColumn`, `clicksColumn`, `ctrColumn`, `convColumn`, `revenueColumn`, `costColumn`, `plColumn`, `roiColumn`, `actionsColumn`, `selectionColumn` | `data-table/columnDefs.tsx` | Pre-built `ColumnDef<T, unknown>` factories for stats rows (`HasCells`, `HasName`) and common concerns (selection, row actions) |
| `cellRaw`, `cellFmt` | `data-table/columnDefs.tsx` | Read `raw` / `formatted` off a `ReportCell` with safe defaults |
| `FormField` | `FormField.tsx` | Consistent label/input/error layout |
| `SearchToolbar` | `SearchToolbar.tsx` | Filter/search bar for entity lists |
| `StatCard` | `StatCard.tsx` | Metric card for dashboards |
| `EmptyState` | `EmptyState.tsx` | Empty-list placeholder |
| `ConfirmModal` | `ConfirmModal.tsx` | Destructive action confirmation |
| `useToastApi` | `toast.ts` | Toast notification hook |
| `SmartSelect`, `SmartMultiSelect`, `SmartSelectOption` | `SmartSelect.tsx` | Async/searchable selects |
| `TimezoneSelect`, `getStoredTimezone` | `TimezoneSelect.tsx` | Timezone picker + persistence |
| `DateTimeRangePicker` | `DateTimeRangePicker.tsx` | Date+time range with presets |

## `DataTable` cheat sheet

```tsx
import {
  DataTable,
  nameColumn,
  visitsColumn,
  clicksColumn,
  actionsColumn,
  selectionColumn,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@/components/ui-kit'

type Row = { id: string; name: string; cells: ReportCell[] }

function EntityList() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'visits', desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // useRef so the memoized columns don't capture stale handlers
  const handleEditRef = useRef(handleEdit)
  handleEditRef.current = handleEdit

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      selectionColumn<Row>(),
      nameColumn<Row>({
        actions: (r) => (
          <Button size="small" onClick={() => handleEditRef.current(r)}>Edit</Button>
        ),
      }),
      visitsColumn<Row>(0),
      clicksColumn<Row>(1),
      actionsColumn<Row>((r) => <RowActions row={r} />),
    ],
    [],
  )

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      sorting={sorting}
      onSortingChange={setSorting}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      enableRowSelection
      virtualizeThreshold={100}
    />
  )
}
```

## Adding a new component

1. Build it in this directory using design tokens and existing primitives
2. Export it from `index.ts` with a **named** export (no default exports)
3. If it pairs with helpers (formatters, hooks, CSS), colocate them in the same directory — subdirectories are fine for larger features (see `data-table/` for the pattern) — and re-export through `index.ts`
4. If it renders a `DataTable` or wraps one, re-read `docs/_ai_context/performance-hooks-rules.md` before shipping and verify the `columns` / controlled-state rules
5. If it introduces new tokens, add them to `src/styles/design-tokens.css` first, then reference via `var(--...)` — never hardcode

## Orphaned files

`src/components/ui-kit/dataGridHelpers.ts` is a local, untracked AG-Grid-era
helper file (`numericColumn`, `currencyColumn`, `percentColumn`,
`profitLossColumn` as `Partial<ColDef>`). The equivalent concepts live in
`data-table/columnDefs.tsx` (`meta: { numeric: true }`, the `colorize`
option on `plColumn`/`roiColumn`, etc.). Do not import from
`dataGridHelpers.ts` in new code, and delete it once nothing in local
WIP depends on it.
