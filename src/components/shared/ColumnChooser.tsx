import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Columns3, ChevronDown, ChevronRight, Search, Eye, EyeOff } from 'lucide-react'
import { Drawer } from '@/components/ui-kit'
import { Button, Input, Switch } from '@/components/ui-kit'
import type { Table, ColumnDef } from '@tanstack/react-table'
import { ALL_COLUMN_GROUPS, type ColumnGroupDef } from '@/components/ui-kit/data-table/columnDefs'

interface ColumnChooserProps<TData = unknown> {
  columns: ColumnDef<TData, unknown>[]
  table: Table<TData>
  storageKey: string
  groups?: ColumnGroupDef[]
}

const ALWAYS_VISIBLE = new Set(['name', 'select'])

function isActionBtnColumn(col: ColumnDef<unknown, unknown>): boolean {
  return !!col.id?.startsWith('btn_') || !!(col.meta as Record<string, unknown> | undefined)?.actionBtn
}

export function ColumnChooser<TData>({
  columns: columnDefs,
  table,
  storageKey,
  groups = ALL_COLUMN_GROUPS,
}: ColumnChooserProps<TData>) {
  const lsKey = `ff_columns_${storageKey}`
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const tableColumns = useMemo(() => {
    return columnDefs
      .filter((c) => c.id && !ALWAYS_VISIBLE.has(c.id) && !isActionBtnColumn(c as ColumnDef<unknown, unknown>))
      .map((c) => ({
        id: c.id!,
        headerName: typeof c.header === 'string' ? c.header : c.id!,
      }))
  }, [columnDefs])

  const tableColumnIds = useMemo(() => new Set(tableColumns.map((c) => c.id)), [tableColumns])

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      if (stored) return new Set(JSON.parse(stored) as string[])
    } catch { /* ignore */ }
    return new Set()
  })

  const initialSyncDone = useRef(false)
  useEffect(() => {
    if (initialSyncDone.current) return
    initialSyncDone.current = true
    if (hiddenCols.size > 0) {
      const vis: Record<string, boolean> = {}
      for (const col of tableColumns) {
        vis[col.id] = !hiddenCols.has(col.id)
      }
      table.setColumnVisibility(vis)
    }
  }, [hiddenCols, tableColumns, table])

  const handleToggle = useCallback((colId: string, visible: boolean) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (visible) next.delete(colId)
      else next.add(colId)
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, !next.has(c.id)])),
      )
      localStorage.setItem(lsKey, JSON.stringify([...next]))
      return next
    })
  }, [table, tableColumns, lsKey])

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const toggleAllInGroup = useCallback((groupId: string, visible: boolean) => {
    const group = groups.find((g) => g.groupId === groupId)
    if (!group) return
    setHiddenCols((prev) => {
      const next = new Set(prev)
      for (const col of group.columns) {
        if (!tableColumnIds.has(col.id)) continue
        if (visible) next.delete(col.id)
        else next.add(col.id)
      }
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, !next.has(c.id)])),
      )
      localStorage.setItem(lsKey, JSON.stringify([...next]))
      return next
    })
  }, [groups, table, tableColumns, tableColumnIds, lsKey])

  const searchLower = search.toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!searchLower) return groups
    return groups
      .map((g) => ({
        ...g,
        columns: g.columns.filter((c) =>
          c.label.toLowerCase().includes(searchLower) ||
          c.abbr.toLowerCase().includes(searchLower) ||
          c.id.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((g) => g.columns.length > 0)
  }, [groups, searchLower])

  const ungroupedColumns = useMemo(() => {
    const groupedIds = new Set(groups.flatMap((g) => g.columns.map((c) => c.id)))
    return tableColumns.filter((c) => !groupedIds.has(c.id))
  }, [groups, tableColumns])

  const filteredUngrouped = useMemo(() => {
    if (!searchLower) return ungroupedColumns
    return ungroupedColumns.filter((c) =>
      c.headerName.toLowerCase().includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower)
    )
  }, [ungroupedColumns, searchLower])

  const visibleCount = tableColumns.filter((c) => !hiddenCols.has(c.id)).length

  const showAll = useCallback(() => {
    setHiddenCols(() => {
      table.setColumnVisibility(
        Object.fromEntries(tableColumns.map((c) => [c.id, true])),
      )
      localStorage.setItem(lsKey, JSON.stringify([]))
      return new Set()
    })
  }, [table, tableColumns, lsKey])

  const hideAll = useCallback(() => {
    setHiddenCols(() => {
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
      <Button icon={<Columns3 className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Columns
      </Button>

      <Drawer
        title="Column Settings"
        open={open}
        onClose={() => setOpen(false)}
        size={360}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col h-full">
          {/* Search + bulk actions */}
          <div className="px-4 pt-3 pb-2 border-b border-[var(--border)] flex flex-col gap-2">
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
              <span>{visibleCount} of {tableColumns.length} visible</span>
              <div className="flex gap-2">
                <button
                  className="text-xs text-[var(--primary)] hover:underline cursor-pointer bg-transparent border-none p-0"
                  onClick={showAll}
                >
                  Show all
                </button>
                <button
                  className="text-xs text-[var(--primary)] hover:underline cursor-pointer bg-transparent border-none p-0"
                  onClick={hideAll}
                >
                  Hide all
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable groups */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.groupId) && !searchLower
              const groupColsInTable = group.columns.filter((c) => tableColumnIds.has(c.id))
              const visibleInGroup = groupColsInTable.filter((c) => !hiddenCols.has(c.id)).length
              const totalInGroup = groupColsInTable.length
              if (totalInGroup === 0 && !searchLower) return null

              return (
                <div key={group.groupId} className="border-b border-[var(--border)]">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-4 py-2 cursor-pointer select-none hover:bg-[var(--surface-hover)]"
                    onClick={() => toggleGroup(group.groupId)}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed
                        ? <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
                        : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
                      }
                      <span className="text-sm font-medium">{group.groupLabel}</span>
                      <span className="text-xs text-[var(--muted-fg)] ml-1">
                        {visibleInGroup}/{totalInGroup}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="p-0.5 rounded hover:bg-[var(--surface-hover)] text-[var(--muted-fg)] hover:text-[var(--fg)] bg-transparent border-none cursor-pointer"
                        title="Show all in group"
                        onClick={() => toggleAllInGroup(group.groupId, true)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-[var(--surface-hover)] text-[var(--muted-fg)] hover:text-[var(--fg)] bg-transparent border-none cursor-pointer"
                        title="Hide all in group"
                        onClick={() => toggleAllInGroup(group.groupId, false)}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Group columns */}
                  {!isCollapsed && (
                    <div className="pb-1">
                      {group.columns.map((col) => {
                        if (!tableColumnIds.has(col.id)) return null
                        const isVisible = !hiddenCols.has(col.id)
                        return (
                          <div
                            key={col.id}
                            className="flex items-center justify-between px-4 pl-9 py-1 hover:bg-[var(--surface-hover)]"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm truncate">{col.label}</span>
                              <span className="text-[11px] text-[var(--muted-fg)] truncate">{col.abbr}</span>
                            </div>
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

            {/* Ungrouped columns (columns present in table but not in any group) */}
            {filteredUngrouped.length > 0 && (
              <div className="border-b border-[var(--border)]">
                <div className="px-4 py-2">
                  <span className="text-sm font-medium">Other Columns</span>
                </div>
                <div className="pb-1">
                  {filteredUngrouped.map((col) => {
                    const isVisible = !hiddenCols.has(col.id)
                    return (
                      <div
                        key={col.id}
                        className="flex items-center justify-between px-4 pl-9 py-1 hover:bg-[var(--surface-hover)]"
                      >
                        <span className="text-sm truncate">{col.headerName}</span>
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
