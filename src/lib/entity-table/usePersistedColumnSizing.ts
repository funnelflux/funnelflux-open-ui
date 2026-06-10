import { useCallback } from 'react'
import { selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

/** Persisted column widths for tables that use `tableConfigKey` (localStorage via tableConfig store). */
export function usePersistedColumnSizing(tableKey: string | undefined) {
  const columnSizing = useTableConfigStore((state) =>
    tableKey ? selectTableConfig(tableKey)(state).columnSizing : undefined,
  )
  const setColumnSizing = useTableConfigStore((state) => state.setColumnSizing)

  const onColumnSizingChange = useCallback(
    (sizing: Record<string, number>) => {
      if (tableKey) setColumnSizing(tableKey, sizing)
    },
    [tableKey, setColumnSizing],
  )

  return { columnSizing, onColumnSizingChange }
}
