import { useState, useMemo, useRef, useCallback, type RefObject } from 'react'
import { Columns3 } from 'lucide-react'
import { Button, Checkbox, Popover } from 'antd'
import type { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'

interface ColumnChooserProps {
  columnDefs: ColDef[]
  gridRef: RefObject<AgGridReact | null>
  storageKey: string
}

const ALWAYS_VISIBLE = new Set(['name'])

export function ColumnChooser({ columnDefs, gridRef, storageKey }: ColumnChooserProps) {
  const lsKey = `ff_columns_${storageKey}`

  // Derive stable column metadata — only recompute when the set of colIds changes
  const columns = useMemo(() => {
    return columnDefs
      .filter((c) => c.colId && !ALWAYS_VISIBLE.has(c.colId))
      .map((c) => ({ colId: c.colId!, headerName: c.headerName ?? c.colId!, defaultHidden: !!c.hide }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnDefs.map((c) => c.colId).join(',')])

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(lsKey)
      if (stored) return new Set(JSON.parse(stored) as string[])
    } catch { /* ignore */ }
    return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.colId))
  })

  // Track previous hiddenCols to only apply diffs to the grid API
  const prevHiddenRef = useRef<Set<string>>(hiddenCols)
  const initialApplied = useRef(false)

  // Apply visibility changes — only runs when hiddenCols actually changes (Set identity)
  // Uses requestAnimationFrame to batch with the grid's render cycle
  const applyVisibility = useCallback((current: Set<string>) => {
    const api = gridRef.current?.api
    if (!api) return

    const prev = prevHiddenRef.current

    if (!initialApplied.current) {
      // First run: apply all
      for (const col of columns) {
        api.setColumnsVisible([col.colId], !current.has(col.colId))
      }
      initialApplied.current = true
    } else {
      // Subsequent: only apply diffs
      for (const col of columns) {
        const wasHidden = prev.has(col.colId)
        const isHidden = current.has(col.colId)
        if (wasHidden !== isHidden) {
          api.setColumnsVisible([col.colId], !isHidden)
        }
      }
    }

    prevHiddenRef.current = current
    localStorage.setItem(lsKey, JSON.stringify([...current]))
  }, [gridRef, columns, lsKey])

  const handleToggle = useCallback((colId: string, visible: boolean) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (visible) {
        next.delete(colId)
      } else {
        next.add(colId)
      }
      applyVisibility(next)
      return next
    })
  }, [applyVisibility])

  // Apply initial visibility once grid is ready
  const gridReadyApplied = useRef(false)
  if (gridRef.current?.api && !gridReadyApplied.current) {
    applyVisibility(hiddenCols)
    gridReadyApplied.current = true
  }

  const content = useMemo(() => (
    <div className="flex flex-col gap-1 min-w-[160px]">
      {columns.map((col) => (
        <Checkbox
          key={col.colId}
          checked={!hiddenCols.has(col.colId)}
          onChange={(e) => handleToggle(col.colId, e.target.checked)}
        >
          <span className="text-sm">{col.headerName}</span>
        </Checkbox>
      ))}
    </div>
  ), [columns, hiddenCols, handleToggle])

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Button icon={<Columns3 className="h-4 w-4" />}>Columns</Button>
    </Popover>
  )
}
