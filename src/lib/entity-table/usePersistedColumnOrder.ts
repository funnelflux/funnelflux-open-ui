import { useCallback } from 'react'
import { selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

/** Persisted column order for tables that use `tableConfigKey` (localStorage via tableConfig store). */
export function usePersistedColumnOrder(tableKey: string | undefined) {
  const columnOrder = useTableConfigStore((state) =>
    tableKey ? selectTableConfig(tableKey)(state).columnOrder : undefined,
  )
  const setColumnOrder = useTableConfigStore((state) => state.setColumnOrder)

  const onColumnOrderChange = useCallback(
    (order: string[]) => {
      if (tableKey) setColumnOrder(tableKey, order)
    },
    [tableKey, setColumnOrder],
  )

  return { columnOrder, onColumnOrderChange }
}
