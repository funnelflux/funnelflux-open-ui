import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Columns3 } from 'lucide-react'
import { Button, Checkbox, Popover } from 'antd'
import type { Table, ColumnDef } from '@tanstack/react-table'

interface ColumnChooserProps<TData = unknown> {
  columns: ColumnDef<TData, unknown>[]
  table: Table<TData>
  storageKey: string
}

const ALWAYS_VISIBLE = new Set(['name', 'select'])

export function ColumnChooser<TData>({ columns: columnDefs, table, storageKey }: ColumnChooserProps<TData>) {
  const lsKey = `ff_columns_${storageKey}`

  const columnsInfo = useMemo(() => {
    return columnDefs
      .filter((c) => c.id && !ALWAYS_VISIBLE.has(c.id))
      .map((c) => ({
        id: c.id!,
        headerName: typeof c.header === 'string' ? c.header : c.id!,
      }))
  }, [columnDefs])

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      if (stored) {
        return new Set(JSON.parse(stored) as string[])
      }
    } catch { /* ignore */ }
    return new Set()
  })

  const initialSyncDone = useRef(false)
  useEffect(() => {
    if (initialSyncDone.current) return
    initialSyncDone.current = true
    if (hiddenCols.size > 0) {
      const vis: Record<string, boolean> = {}
      for (const col of columnsInfo) {
        vis[col.id] = !hiddenCols.has(col.id)
      }
      table.setColumnVisibility(vis)
    }
  }, [hiddenCols, columnsInfo, table])

  const handleToggle = useCallback((colId: string, visible: boolean) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (visible) {
        next.delete(colId)
      } else {
        next.add(colId)
      }
      table.setColumnVisibility(
        Object.fromEntries(columnsInfo.map((c) => [c.id, !next.has(c.id)])),
      )
      localStorage.setItem(lsKey, JSON.stringify([...next]))
      return next
    })
  }, [table, columnsInfo, lsKey])

  const content = useMemo(() => (
    <div className="flex flex-col gap-1 min-w-[160px]">
      {columnsInfo.map((col) => (
        <Checkbox
          key={col.id}
          checked={!hiddenCols.has(col.id)}
          onChange={(e) => handleToggle(col.id, e.target.checked)}
        >
          <span className="text-sm">{col.headerName}</span>
        </Checkbox>
      ))}
    </div>
  ), [columnsInfo, hiddenCols, handleToggle])

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Button icon={<Columns3 className="h-4 w-4" />}>Columns</Button>
    </Popover>
  )
}
