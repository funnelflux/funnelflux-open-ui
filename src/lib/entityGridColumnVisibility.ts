import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { getColumnMeta } from '@/components/ui-kit/data-table/columnRegistry'

const ALWAYS_VISIBLE = new Set(['name', 'select'])

function isActionBtnColumn(col: ColumnDef<unknown, unknown>): boolean {
  return !!col.id?.startsWith('btn_') || !!(col.meta as Record<string, unknown> | undefined)?.actionBtn
}

export interface ToggleableColumn {
  id: string
  headerName: string
}

export function listToggleableColumns(columnDefs: ColumnDef<unknown, unknown>[]): ToggleableColumn[] {
  return columnDefs
    .filter((c) => c.id && !ALWAYS_VISIBLE.has(c.id) && !isActionBtnColumn(c))
    .map((c) => ({
      id: c.id!,
      headerName: typeof c.header === 'string' ? c.header : c.id!,
    }))
}

function computeFirstVisitHidden(
  ids: string[],
  defaultVisibleColumnIds: readonly string[] | undefined,
): Set<string> {
  const hidden = new Set<string>()
  if (defaultVisibleColumnIds?.length) {
    const allow = new Set(defaultVisibleColumnIds)
    for (const id of ids) {
      if (!allow.has(id)) hidden.add(id)
    }
    return hidden
  }
  for (const id of ids) {
    const meta = getColumnMeta(id)
    const visibleDefault = meta?.defaultVisible ?? (id.startsWith('col-') ? false : true)
    if (!visibleDefault) hidden.add(id)
  }
  return hidden
}

function readHiddenFromLs(lsKey: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(lsKey)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return new Set(parsed as string[])
  } catch {
    return null
  }
}

export interface UseEntityGridColumnVisibilityOptions {
  defaultVisibleColumnIds?: readonly string[]
}

/**
 * Derives TanStack `columnVisibility` from `ff_columns_*` localStorage or first-visit defaults,
 * in the same render as `columnDefs` — avoids an all-columns-visible flash before effects run.
 */
export function useEntityGridColumnVisibility(
  columnDefs: ColumnDef<unknown, unknown>[],
  storageKey: string,
  options?: UseEntityGridColumnVisibilityOptions,
) {
  const lsKey = `ff_columns_${storageKey}`
  const [bump, setBump] = useState(0)
  const defaultVisibleColumnIds = options?.defaultVisibleColumnIds

  const tableColumns = useMemo(() => listToggleableColumns(columnDefs), [columnDefs])
  const toggleableKey = useMemo(() => tableColumns.map((c) => c.id).join('\0'), [tableColumns])

  const hiddenCols = useMemo(() => {
    const fromLs = readHiddenFromLs(lsKey)
    if (fromLs) return fromLs
    return computeFirstVisitHidden(
      tableColumns.map((c) => c.id),
      defaultVisibleColumnIds,
    )
  }, [lsKey, toggleableKey, defaultVisibleColumnIds, bump])

  const columnVisibility = useMemo(
    () => Object.fromEntries(tableColumns.map((c) => [c.id, !hiddenCols.has(c.id)])),
    [tableColumns, hiddenCols],
  )

  /** Toggleable column ids that are visible (shown in the table / “on” in the picker). */
  const selectedCols = useMemo(() => {
    return new Set(tableColumns.map((c) => c.id).filter((id) => !hiddenCols.has(id)))
  }, [tableColumns, hiddenCols])

  const persistHidden = useCallback(
    (hidden: Set<string>) => {
      try {
        localStorage.setItem(lsKey, JSON.stringify([...hidden]))
      } catch {
        /* ignore */
      }
      setBump((b) => b + 1)
    },
    [lsKey],
  )

  const onColumnsChange = useCallback(
    (nextSelected: Set<string>) => {
      const hidden = new Set<string>()
      for (const c of tableColumns) {
        if (!nextSelected.has(c.id)) hidden.add(c.id)
      }
      persistHidden(hidden)
    },
    [tableColumns, persistHidden],
  )

  const onColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      const prev = columnVisibility
      const patch = typeof updater === 'function' ? updater(prev) : updater
      const hidden = new Set<string>()
      for (const c of tableColumns) {
        const v = patch[c.id]
        const effective = v === undefined ? (prev[c.id] ?? true) : v
        if (effective === false) hidden.add(c.id)
      }
      persistHidden(hidden)
    },
    [columnVisibility, tableColumns, persistHidden],
  )

  return {
    tableColumns,
    selectedCols,
    columnVisibility,
    onColumnsChange,
    onColumnVisibilityChange,
  }
}
