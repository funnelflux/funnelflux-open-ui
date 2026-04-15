# Performance Rules for Hooks & Effects

Tables in this app render thousands of rows through `DataTable`
(`src/components/ui-kit/data-table/`), which is a thin wrapper around
`@tanstack/react-table` with row virtualization via `@tanstack/react-virtual`.
A single unstable prop can make `useReactTable` rebuild state, lose column
sizing, reset selection, or re-run effects in a loop. These rules are
non-negotiable.

Read this doc whenever you are about to:
- Author or edit a `useEffect` that touches `DataTable`, localStorage, or network
- Add or modify the `columns` or `data` prop for any `DataTable`
- Wire controlled state (`sorting`, `rowSelection`, `pagination`, `columnVisibility`, `expanded`) into a `DataTable`
- Pass props from a parent into a memoized table wrapper

## 1. Memoize `columns` with `useMemo`

`DataTable`'s `columns` prop MUST be a stable reference. A bare
`const columns: ColumnDef<T, unknown>[] = [...]` inside a component body
creates a new array on every render. TanStack Table treats that as a new
column set on every tick — column sizing, visibility state, and sort state
can be reset or thrash.

```tsx
// WRONG — new array every render
const columns: ColumnDef<Row, unknown>[] = [
  selectionColumn<Row>(),
  nameColumn<Row>(),
  visitsColumn<Row>(0),
  clicksColumn<Row>(1),
  actionsColumn<Row>((r) => <RowActions row={r} />),
]

// RIGHT — stable reference, only recomputes when cell indices or
// feature flags change
const columns = useMemo<ColumnDef<Row, unknown>[]>(() => [
  selectionColumn<Row>(),
  nameColumn<Row>({ actions: (r) => <RowActions row={r} /> }),
  visitsColumn<Row>(iVisits),
  clicksColumn<Row>(iClicks),
], [iVisits, iClicks])
```

Do the same for `data` when it comes from a derived source: if you're
filtering or mapping a query result inline, wrap it in `useMemo` keyed on
the upstream query data — not on the filtered array itself.

## 2. Use refs for unstable callbacks inside memoized columns

Action handlers that reference mutations, toast, navigation, or reload
functions are unstable (new identity every render). Closing over them
directly inside `useMemo` either freezes stale closures or forces you to
put the mutation in the deps array — which defeats the memo.

```tsx
// WRONG — cloneMutation changes identity every render, breaks memoization
const columns = useMemo(() => [
  nameColumn<Row>({
    actions: (r) => (
      <Button onClick={() => cloneMutation.mutate(r.id)}>Clone</Button>
    ),
  }),
], [cloneMutation]) // deps change every render

// RIGHT — ref holds latest callback, memo deps stay stable
const handleCloneRef = useRef(handleClone)
handleCloneRef.current = handleClone

const columns = useMemo(() => [
  nameColumn<Row>({
    actions: (r) => (
      <Button onClick={() => handleCloneRef.current(r.id)}>Clone</Button>
    ),
  }),
], []) // stable — refs do not need to be deps
```

The same pattern applies to `cellContent`, `enableRowSelection`
predicates, and anything else you pass into a column factory that closes
over fresh state.

## 3. Controlled state must be owned, not derived

`DataTable` supports controlled `sorting`, `rowSelection`, `pagination`,
`columnVisibility`, and `expanded`. If you pass a controlled value, it
MUST come from component/store state — never from an inline derivation
that produces a new object each render.

```tsx
// WRONG — new object every render, DataTable resets internal state
<DataTable
  columns={columns}
  data={rows}
  sorting={[{ id: 'visits', desc: true }]}
  rowSelection={selectedIds.reduce((m, id) => ({ ...m, [id]: true }), {})}
/>

// RIGHT — state lives in useState / zustand, updater passed back
const [sorting, setSorting] = useState<SortingState>([{ id: 'visits', desc: true }])
<DataTable
  columns={columns}
  data={rows}
  sorting={sorting}
  onSortingChange={setSorting}
  rowSelection={rowSelection}
  onRowSelectionChange={setRowSelection}
/>
```

If you only need the initial value once and don't care about later
control, use the uncontrolled form — omit the prop entirely and let
`DataTable` manage it internally.

## 4. Never put derived arrays or objects in `useEffect` dependencies

`.filter()`, `.map()`, `[...spread]`, and `{ ...spread }` create new
references every render. A `useEffect` depending on them fires every
render.

```tsx
// WRONG — toggleable is a new array every render, effect fires every render
const toggleable = columns.filter((c) => c.id !== 'select')
useEffect(() => {
  localStorage.setItem('cols', JSON.stringify(toggleable.map((c) => c.id)))
}, [toggleable])

// RIGHT — derive a stable key, or move the derivation inside the effect
const colIdsKey = useMemo(
  () => columns.map((c) => c.id).filter((id) => id !== 'select').join(','),
  [columns],
)
useEffect(() => {
  localStorage.setItem('cols', colIdsKey)
}, [colIdsKey])
```

## 5. Never call expensive APIs in effects without diffing

If a `useEffect` writes to localStorage, hits the network, or calls into
the TanStack `Table` instance (via `tableRef.current.*` or
`onTableInstance`), it MUST guard against no-op calls. Compare previous
vs current state with a ref and only act when the value actually changed.

Reading the TanStack `Table` instance itself is cheap; what's expensive
is the writes that effects cascade from there — `setPageIndex`,
`setColumnVisibility`, `resetRowSelection`, localStorage persistence.

## 6. Do not read `tableRef.current` during render

`DataTable` exposes the TanStack `Table` instance two ways:
`tableRef: React.MutableRefObject<Table<T> | null>` (set inside a
`useEffect`) and `onTableInstance(table)` (called when the instance is
created or cleaned up). Both are designed for **effects and event
handlers**, not render.

```tsx
// WRONG — render reads a ref that may not be set yet on the first pass,
// and never re-renders when the instance appears
function Toolbar({ tableRef }: { tableRef: MutableRefObject<Table<Row> | null> }) {
  return <span>{tableRef.current?.getState().rowSelection /* stale */}</span>
}

// RIGHT — lift the state you care about into React state / store and let
// DataTable push updates via onTableInstance + controlled callbacks
const [selection, setSelection] = useState<RowSelectionState>({})
<DataTable
  rowSelection={selection}
  onRowSelectionChange={setSelection}
  ...
/>
```

The DataTable implementation itself uses `useRef` for `onTableInstance`
and `tableRef` callbacks so that its own cleanup effect doesn't see a
stale closure. Follow the same pattern in consumers that need both a
parent-owned ref and a cleanup hook.

## 7. Let virtualization do its job

`DataTable` virtualizes row bodies automatically when row count exceeds
`virtualizeThreshold` (default `100`). This means:
- Do not mount expensive sibling components _inside_ each row cell — they
  remount as the virtualizer scrolls.
- `rowHeight` must match real cell height, otherwise scroll position drifts.
- Memoize any heavy per-row component with `React.memo` and a stable key.
- Never call `getComputedStyle`, measure DOM nodes, or write to the DOM
  from inside a cell renderer.

## 8. Verify the cascade

Before writing any `useEffect` or component that receives props from a
parent rendering `DataTable`, trace the full chain: what state change
triggers the parent re-render → does the prop reference change → does
the effect fire → does it call into the `Table` instance or write
localStorage? If the answer to all is "yes" and the data hasn't
semantically changed, you have a bug.
