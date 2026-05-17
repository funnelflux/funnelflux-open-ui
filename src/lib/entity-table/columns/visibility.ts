import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { buildChooserGroupsForPage, getColumnMeta, type MetricScope } from '@/components/ui-kit/data-table/columnRegistry'
import { readHiddenColumnIds, writeHiddenColumnIds } from '@/lib/entity-table/columns/storage'

const ALWAYS_VISIBLE = new Set(['name', 'select'])

function isPinnedVisibleColumnId(id: string | undefined): boolean {
  if (!id) return false
  if (ALWAYS_VISIBLE.has(id)) return true
  return id.startsWith('grouping-')
}

function isActionBtnColumn(col: ColumnDef<unknown, unknown>): boolean {
  return !!col.id?.startsWith('btn_') || !!(col.meta as Record<string, unknown> | undefined)?.actionBtn
}

export interface ToggleableColumn {
  id: string
  headerName: string
}

export function listToggleableColumns(columnDefs: ColumnDef<unknown, unknown>[]): ToggleableColumn[] {
  return columnDefs
    .filter((c) => c.id && !isPinnedVisibleColumnId(c.id) && !isActionBtnColumn(c))
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

export interface UseEntityGridColumnVisibilityOptions {
  defaultVisibleColumnIds?: readonly string[]
  hideScopes?: Set<MetricScope>
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
  const [bump, setBump] = useState(0)
  const defaultVisibleColumnIds = options?.defaultVisibleColumnIds

  const tableColumns = useMemo(() => listToggleableColumns(columnDefs), [columnDefs])
  const controlledColumnIds = useMemo(() => {
    const ids = new Set(buildChooserGroupsForPage(options?.hideScopes).flatMap((g) => g.columns.map((c) => c.id)))
    for (const c of tableColumns) ids.add(c.id)
    return [...ids]
  }, [options?.hideScopes, tableColumns])

  const hiddenCols = useMemo(() => {
    // Touch `bump` so this memo intentionally re-runs after localStorage writes.
    void bump
    const fromLs = readHiddenColumnIds(storageKey)
    if (fromLs) return fromLs
    return computeFirstVisitHidden(
      controlledColumnIds,
      defaultVisibleColumnIds,
    )
  }, [storageKey, controlledColumnIds, defaultVisibleColumnIds, bump])

  const columnVisibility = useMemo(
    () => Object.fromEntries(controlledColumnIds.map((id) => [id, !hiddenCols.has(id)])),
    [controlledColumnIds, hiddenCols],
  )

  /** Toggleable column ids that are visible (shown in the table / “on” in the picker). */
  const selectedCols = useMemo(() => {
    return new Set(controlledColumnIds.filter((id) => !hiddenCols.has(id)))
  }, [controlledColumnIds, hiddenCols])

  const persistHidden = useCallback(
    (hidden: Set<string>) => {
      writeHiddenColumnIds(storageKey, hidden)
      setBump((b) => b + 1)
    },
    [storageKey],
  )

  const onColumnsChange = useCallback(
    (nextSelected: Set<string>) => {
      const hidden = new Set<string>()
      for (const id of controlledColumnIds) {
        if (!nextSelected.has(id)) hidden.add(id)
      }
      persistHidden(hidden)
    },
    [controlledColumnIds, persistHidden],
  )

  const onColumnVisibilityChange = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      const prev = columnVisibility
      const patch = typeof updater === 'function' ? updater(prev) : updater
      const hidden = new Set<string>()
      for (const id of controlledColumnIds) {
        const v = patch[id]
        const effective = v === undefined ? (prev[id] ?? true) : v
        if (effective === false) hidden.add(id)
      }
      persistHidden(hidden)
    },
    [columnVisibility, controlledColumnIds, persistHidden],
  )

  return {
    tableColumns,
    selectedCols,
    columnVisibility,
    onColumnsChange,
    onColumnVisibilityChange,
  }
}
