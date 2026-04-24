import { useState, useMemo, useCallback, useEffect } from 'react'
import { Columns3, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Drawer } from '@/components/ui-kit'
import { Button, Input, Switch } from '@/components/ui-kit'
import type { Table, ColumnDef } from '@tanstack/react-table'
import {
  buildChooserGroupsForPage,
  getColumnMeta,
  type ColumnGroupDef,
  type MetricScope,
} from '@/components/ui-kit/data-table/columnRegistry'

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
}

const ALWAYS_VISIBLE = new Set(['name', 'select'])

function isActionBtnColumn(col: ColumnDef<unknown, unknown>): boolean {
  return !!col.id?.startsWith('btn_') || !!(col.meta as Record<string, unknown> | undefined)?.actionBtn
}

function readStoredHidden(lsKey: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(lsKey)
    if (raw === null) return null
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return null
  }
}

function computeDefaultHiddenForColumns(
  tableCols: { id: string }[],
  defaultVisibleSet: Set<string> | null,
): Set<string> {
  const hidden = new Set<string>()
  if (defaultVisibleSet) {
    for (const col of tableCols) {
      if (!defaultVisibleSet.has(col.id)) hidden.add(col.id)
    }
  } else {
    for (const col of tableCols) {
      const meta = getColumnMeta(col.id)
      const visibleDefault = meta?.defaultVisible ?? (col.id.startsWith('col-') ? false : true)
      if (!visibleDefault) hidden.add(col.id)
    }
  }
  return hidden
}

export function ColumnChooser<TData>({
  columns: columnDefs,
  table,
  storageKey,
  groups: groupsProp,
  hideScopes,
  defaultVisibleColumnIds,
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

  /** `null` = no `ff_columns_*` yet — visibility follows derived defaults for current column defs. */
  const [savedHidden, setSavedHidden] = useState<Set<string> | null>(() => readStoredHidden(lsKey))

  const tableColumns = useMemo(() => {
    return columnDefs
      .filter((c) => c.id && !ALWAYS_VISIBLE.has(c.id) && !isActionBtnColumn(c as ColumnDef<unknown, unknown>))
      .map((c) => ({
        id: c.id!,
        headerName: typeof c.header === 'string' ? c.header : c.id!,
      }))
  }, [columnDefs])

  const tableColumnIds = useMemo(() => new Set(tableColumns.map((c) => c.id)), [tableColumns])

  const derivedHidden = useMemo(
    () => computeDefaultHiddenForColumns(tableColumns, defaultVisibleSet),
    [tableColumns, defaultVisibleSet],
  )

  const effectiveHidden = savedHidden ?? derivedHidden

  useEffect(() => {
    if (tableColumns.length === 0) return
    table.setColumnVisibility(
      Object.fromEntries(tableColumns.map((c) => [c.id, !effectiveHidden.has(c.id)])),
    )
  }, [effectiveHidden, table, tableColumns])

  const handleToggle = useCallback((colId: string, visible: boolean) => {
    setSavedHidden((prev) => {
      const base = prev ?? derivedHidden
      const next = new Set(base)
      if (visible) next.delete(colId)
      else next.add(colId)
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, !next.has(c.id)])),
      )
      localStorage.setItem(lsKey, JSON.stringify([...next]))
      return next
    })
  }, [derivedHidden, table, tableColumns, lsKey])

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

  const visibleCount = tableColumns.filter((c) => !effectiveHidden.has(c.id)).length

  const showAll = useCallback(() => {
    setSavedHidden(() => {
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, true])),
      )
      localStorage.setItem(lsKey, JSON.stringify([]))
      return new Set()
    })
  }, [table, tableColumns, lsKey])

  const hideAll = useCallback(() => {
    setSavedHidden(() => {
      const allIds = tableColumns.map((c) => c.id)
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, false])),
      )
      localStorage.setItem(lsKey, JSON.stringify(allIds))
      return new Set(allIds)
    })
  }, [table, tableColumns, lsKey])

  return (
    <>
      <Button type="default" icon={<Columns3 className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Columns
      </Button>

      <Drawer
        title="Column settings"
        open={open}
        onClose={() => setOpen(false)}
        size={360}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col h-full bg-[var(--surface)]">
          <div className="px-3 pt-3 pb-2 border-b border-[var(--border)] flex flex-col gap-2">
            <Input
              prefix={<Search className="h-3.5 w-3.5 text-[var(--muted-fg)]" />}
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              onClear={() => setSearch('')}
              size="small"
            />
            <div className="flex items-center justify-between text-xs text-[var(--muted-fg)]">
              <span>{visibleCount} visible</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                  onClick={showAll}
                >
                  Show all
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--muted-fg)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0"
                  onClick={hideAll}
                >
                  Hide all
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 text-[var(--foreground)]">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.groupId) && !searchLower
              const groupColsInTable = group.columns.filter((c) => tableColumnIds.has(c.id))
              const visibleInGroup = groupColsInTable.filter((c) => !effectiveHidden.has(c.id)).length
              const totalInGroup = groupColsInTable.length
              if (totalInGroup === 0 && !searchLower) return null

              return (
                <div key={group.groupId} className="border-b border-[var(--border)] last:border-b-0">
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-[var(--surface-hover)]"
                    onClick={() => toggleGroup(group.groupId)}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-fg)] shrink-0" />
                      : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-fg)] shrink-0" />
                    }
                    <span className="text-sm font-medium">{group.groupLabel}</span>
                    <span className="text-xs text-[var(--muted-fg)]">
                      {visibleInGroup}/{totalInGroup}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="pb-2">
                      {group.columns.map((col) => {
                        if (!tableColumnIds.has(col.id)) return null
                        const isVisible = !effectiveHidden.has(col.id)
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
                <div className="px-3 py-2">
                  <span className="text-sm font-medium">Other</span>
                </div>
                <div className="pb-2">
                  {filteredUngrouped.map((col) => {
                    const isVisible = !effectiveHidden.has(col.id)
                    const meta = getColumnMeta(col.id)
                    return (
                      <div
                        key={col.id}
                        className="flex items-center gap-2 px-3 py-1.5 pl-9 hover:bg-[var(--surface-hover)]"
                      >
                        <span className="text-sm truncate flex-1 min-w-0">{col.headerName}</span>
                        {meta ? (
                          <span className="shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-fg)] bg-[var(--surface-secondary)] max-w-[4.5rem] truncate">
                            {meta.abbr}
                          </span>
                        ) : (
                          <span className="shrink-0 w-10" />
                        )}
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
        </div>
      </Drawer>
    </>
  )
}
