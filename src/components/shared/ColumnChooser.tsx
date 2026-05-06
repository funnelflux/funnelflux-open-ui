import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Drawer } from '@/components/ui-kit'
import { Button, Input, Switch } from '@/components/ui-kit'
import type { Table, ColumnDef } from '@tanstack/react-table'
import {
  buildChooserGroupsForPage,
  getColumnMeta,
  type ColumnGroupDef,
  type MetricScope,
} from '@/components/ui-kit/data-table/columnRegistry'
import { listToggleableColumns } from '@/lib/entityGridColumnVisibility'

interface ColumnChooserProps<TData = unknown> {
  columns: ColumnDef<TData, unknown>[]
  table: Table<TData>
  storageKey: string
  groups?: ColumnGroupDef[]
  /** Hide lander or offer metric groups in the picker (matches table column filter) */
  hideScopes?: Set<MetricScope>
  /**
   * When set (first visit only, no saved `ff_columns_*` prefs), only these toggleable column ids stay visible.
   * When omitted, visibility falls back to `defaultVisible` in the column registry.
   */
  defaultVisibleColumnIds?: readonly string[]
  /**
   * Controlled: visible toggleable column ids (e.g. from `useEntityGridColumnVisibility.selectedCols`).
   * Parent must drive `DataTable` via the same hook’s `columnVisibility` / `onColumnVisibilityChange`.
   */
  selectedCols?: Set<string>
  /** Receives the next set of visible toggleable column ids. */
  onColumnsChange?: (next: Set<string>) => void
  /** Called after an explicit Apply commits staged column changes. */
  onApply?: (next: Set<string>) => void
}

export function ColumnChooser<TData>({
  columns: columnDefs,
  table,
  storageKey,
  groups: groupsProp,
  hideScopes,
  defaultVisibleColumnIds,
  selectedCols: selectedColsProp,
  onColumnsChange: onColumnsChangeProp,
  onApply,
}: ColumnChooserProps<TData>) {
  const groups = useMemo(
    () => groupsProp ?? buildChooserGroupsForPage(hideScopes),
    [groupsProp, hideScopes],
  )

  const defaultVisibleSet = useMemo(
    () => (defaultVisibleColumnIds ? new Set(defaultVisibleColumnIds) : null),
    [defaultVisibleColumnIds],
  )

  const lsKey = `ff_columns_${storageKey}`
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [draftSelected, setDraftSelected] = useState<Set<string> | null>(null)

  const tableColumns = useMemo(
    () => listToggleableColumns(columnDefs as ColumnDef<unknown, unknown>[]),
    [columnDefs],
  )

  const tableColumnIds = useMemo(() => new Set(tableColumns.map((c) => c.id)), [tableColumns])

  const isControlled = selectedColsProp != null && onColumnsChangeProp != null

  const [internalHiddenCols, setInternalHiddenCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      if (stored) return new Set(JSON.parse(stored) as string[])
    } catch { /* ignore */ }
    return new Set()
  })

  const appliedSelected = useMemo(() => {
    if (isControlled) return selectedColsProp!
    return new Set(tableColumns.map((c) => c.id).filter((id) => !internalHiddenCols.has(id)))
  }, [isControlled, selectedColsProp, tableColumns, internalHiddenCols])

  const effectiveSelected = draftSelected ?? appliedSelected

  const defaultsAppliedRef = useRef(false)

  const initialSyncDone = useRef(false)
  useEffect(() => {
    if (isControlled) return
    if (initialSyncDone.current) return
    initialSyncDone.current = true
    if (internalHiddenCols.size > 0) {
      const vis: Record<string, boolean> = {}
      for (const col of tableColumns) {
        vis[col.id] = !internalHiddenCols.has(col.id)
      }
      table.setColumnVisibility(vis)
    }
  }, [isControlled, internalHiddenCols, tableColumns, table])

  /** First visit (uncontrolled only): apply default hidden columns (no setState inside effect body). */
  useEffect(() => {
    if (isControlled) return
    if (defaultsAppliedRef.current) return
    if (tableColumns.length === 0) return

    try {
      if (localStorage.getItem(lsKey)) {
        defaultsAppliedRef.current = true
        return
      }
    } catch {
      defaultsAppliedRef.current = true
      return
    }

    const hidden = new Set<string>()
    if (defaultVisibleSet) {
      for (const col of tableColumns) {
        if (!defaultVisibleSet.has(col.id)) hidden.add(col.id)
      }
    } else {
      for (const col of tableColumns) {
        const meta = getColumnMeta(col.id)
        const visibleDefault =
          meta?.defaultVisible ?? (col.id.startsWith('col-') ? false : true)
        if (!visibleDefault) hidden.add(col.id)
      }
    }

    defaultsAppliedRef.current = true
    if (hidden.size === 0) return

    // Defer the React state update; apply external table visibility immediately.
    // This avoids synchronous setState in the effect body (React Compiler/ESLint warning).
    table.setColumnVisibility(
      Object.fromEntries(tableColumns.map((c) => [c.id, !hidden.has(c.id)])),
    )
    queueMicrotask(() => setInternalHiddenCols(hidden))

    try {
      localStorage.setItem(lsKey, JSON.stringify([...hidden]))
    } catch {
      /* ignore */
    }
  }, [isControlled, defaultVisibleSet, lsKey, table, tableColumns])

  const applyVisibilityToTable = useCallback(
    (hidden: Set<string>) => {
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, !hidden.has(c.id)])),
      )
    },
    [table, tableColumns],
  )

  const handleToggle = useCallback((colId: string, visible: boolean) => {
    setDraftSelected((prev) => {
      const next = new Set(prev ?? appliedSelected)
      if (visible) next.add(colId)
      else next.delete(colId)
      return next
    })
  }, [appliedSelected])

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const searchLower = search.toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!searchLower) return groups
    return groups
      .map((g) => ({
        ...g,
        columns: g.columns.filter((c) =>
          c.label.toLowerCase().includes(searchLower) ||
          c.abbr.toLowerCase().includes(searchLower) ||
          c.id.toLowerCase().includes(searchLower),
        ),
      }))
      .filter((g) => g.columns.length > 0)
  }, [groups, searchLower])

  const groupedIds = useMemo(() => new Set(groups.flatMap((g) => g.columns.map((c) => c.id))), [groups])
  const chooserColumnIds = useMemo(
    () => isControlled
      ? groups.flatMap((g) => g.columns.map((c) => c.id))
      : tableColumns.map((c) => c.id),
    [isControlled, groups, tableColumns],
  )
  const chooserColumnIdSet = useMemo(() => new Set(chooserColumnIds), [chooserColumnIds])

  const ungroupedColumns = useMemo(() => {
    return tableColumns.filter((c) => !groupedIds.has(c.id))
  }, [groupedIds, tableColumns])

  const filteredUngrouped = useMemo(() => {
    if (!searchLower) return ungroupedColumns
    return ungroupedColumns.filter((c) =>
      c.headerName.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower),
    )
  }, [ungroupedColumns, searchLower])

  const visibleCount = effectiveSelected.size
  const hasDraftChanges = useMemo(() => {
    if (!draftSelected) return false
    if (draftSelected.size !== appliedSelected.size) return true
    for (const id of draftSelected) {
      if (!appliedSelected.has(id)) return true
    }
    return false
  }, [draftSelected, appliedSelected])

  const setColumnsVisible = useCallback((columnIds: string[], visible: boolean) => {
    setDraftSelected((prev) => {
      const next = new Set(prev ?? appliedSelected)
      for (const id of columnIds) {
        if (!chooserColumnIdSet.has(id)) continue
        if (visible) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [appliedSelected, chooserColumnIdSet])

  const handleCancel = useCallback(() => {
    setDraftSelected(null)
    setOpen(false)
  }, [])

  const handleApply = useCallback(() => {
    const nextSelected = draftSelected ?? appliedSelected
    if (isControlled) {
      onColumnsChangeProp!(nextSelected)
    } else {
      const hidden = new Set<string>()
      for (const c of tableColumns) {
        if (!nextSelected.has(c.id)) hidden.add(c.id)
      }
      setInternalHiddenCols(hidden)
      applyVisibilityToTable(hidden)
      localStorage.setItem(lsKey, JSON.stringify([...hidden]))
    }
    setDraftSelected(null)
    onApply?.(nextSelected)
    setOpen(false)
  }, [
    draftSelected,
    appliedSelected,
    isControlled,
    onColumnsChangeProp,
    tableColumns,
    applyVisibilityToTable,
    lsKey,
    onApply,
  ])

  const handleOpen = useCallback(() => {
    setDraftSelected(new Set(appliedSelected))
    setOpen(true)
  }, [appliedSelected])

  return (
    <>
      <Button type="default" iconName="columns-3" iconSize="md" onClick={handleOpen}>
        Columns
      </Button>

      <Drawer
        title={
          <div className="flex items-center justify-between gap-3 pr-6">
            <span>Column settings</span>
            <span className="text-xs font-normal text-[var(--muted-fg)]">
              {visibleCount} visible{hasDraftChanges ? ' pending' : ''}
            </span>
          </div>
        }
        open={open}
        onClose={handleCancel}
        size={360}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col h-full bg-[var(--surface)]">
          <div className="px-3 pt-3 pb-2 border-b border-[var(--border)]">
            <Input
              prefix={<span className="text-[var(--muted-fg)]"><Icon name="search" size="sm" aria-hidden /></span>}
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              onClear={() => setSearch('')}
              size="small"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 text-[var(--foreground)]">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.groupId) && !searchLower
              const groupColsInTable = isControlled ? group.columns : group.columns.filter((c) => tableColumnIds.has(c.id))
              const groupColumnIds = groupColsInTable.map((c) => c.id)
              const visibleInGroup = groupColsInTable.filter((c) => effectiveSelected.has(c.id)).length
              const totalInGroup = groupColsInTable.length
              if (totalInGroup === 0 && !searchLower) return null

              return (
                <div key={group.groupId} className="border-b border-[var(--border)] last:border-b-0">
                  <div className="flex w-full items-center gap-2 px-3 py-2 select-none hover:bg-[var(--surface-hover)]">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer bg-transparent border-none p-0 text-left text-[var(--foreground)]"
                      onClick={() => toggleGroup(group.groupId)}
                    >
                      {isCollapsed
                        ? <span className="text-[var(--muted-fg)] shrink-0"><Icon name="chevron-right" size="sm" aria-hidden /></span>
                        : <span className="text-[var(--muted-fg)] shrink-0"><Icon name="chevron-down" size="sm" aria-hidden /></span>
                      }
                      <span className="text-sm font-medium truncate">{group.groupLabel}</span>
                      <span className="text-xs text-[var(--muted-fg)] shrink-0">
                        {visibleInGroup}/{totalInGroup}
                      </span>
                    </button>
                    <div className="ml-auto flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                        onClick={() => setColumnsVisible(groupColumnIds, true)}
                      >
                        Show all
                      </button>
                      <button
                        type="button"
                        className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                        onClick={() => setColumnsVisible(groupColumnIds, false)}
                      >
                        Hide all
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="pb-2">
                      {group.columns.map((col) => {
                        if (!isControlled && !tableColumnIds.has(col.id)) return null
                        const isVisible = effectiveSelected.has(col.id)
                        return (
                          <div
                            key={col.id}
                            className="flex items-center gap-2 px-3 py-1.5 pl-9 hover:bg-[var(--surface-hover)]"
                          >
                            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                              <span className="text-sm leading-tight truncate">{col.label}</span>
                            </div>
                            <span
                              className="shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-fg)] bg-[var(--surface-secondary)] max-w-[4.5rem] truncate"
                              title={col.abbr}
                            >
                              {col.abbr}
                            </span>
                            <Switch
                              size="small"
                              checked={isVisible}
                              onChange={(checked) => handleToggle(col.id, checked)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredUngrouped.length > 0 && (
              <div className="border-b border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-sm font-medium">Other</span>
                  <span className="text-xs text-[var(--muted-fg)]">
                    {filteredUngrouped.filter((c) => effectiveSelected.has(c.id)).length}/{filteredUngrouped.length}
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                      onClick={() => setColumnsVisible(filteredUngrouped.map((c) => c.id), true)}
                    >
                      Show all
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                      onClick={() => setColumnsVisible(filteredUngrouped.map((c) => c.id), false)}
                    >
                      Hide all
                    </button>
                  </div>
                </div>
                <div className="pb-2">
                  {filteredUngrouped.map((col) => {
                    const isVisible = effectiveSelected.has(col.id)
                    const meta = getColumnMeta(col.id)
                    const rowLabel = meta?.label ?? col.headerName
                    const rowAbbr = meta?.abbr ?? col.headerName
                    return (
                      <div
                        key={col.id}
                        className="flex items-center gap-2 px-3 py-1.5 pl-9 hover:bg-[var(--surface-hover)]"
                      >
                        <span className="text-sm truncate flex-1 min-w-0">{rowLabel}</span>
                        <span
                          className="shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-fg)] bg-[var(--surface-secondary)] max-w-[4.5rem] truncate"
                          title={rowAbbr}
                        >
                          {rowAbbr}
                        </span>
                        <Switch
                          size="small"
                          checked={isVisible}
                          onChange={(checked) => handleToggle(col.id, checked)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-3 py-3">
            <Button type="default" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleApply} disabled={!hasDraftChanges}>
              Apply
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
