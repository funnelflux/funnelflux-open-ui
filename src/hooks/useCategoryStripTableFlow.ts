import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import type { ReportColumn } from '@/types/stats'
import type { EntityGridRow } from '@/api/hooks/useEntityGrid'
import { buildCategorySegmentsFromRows } from '@/lib/entity-table/engine/categoryStripTable'
import { paginateCategorySegments } from '@/lib/entity-table/engine/paginateCategorySegments'
import { sortAssetTableRows } from '@/lib/entity-table/data/sorting'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

interface UseCategoryStripTableFlowArgs<T extends EntityGridRow> {
  tableConfigKey: string
  rows: T[]
  reportColumns: ReportColumn[]
  categories: Array<{ idCategory: string; name: string }> | undefined
  search: string
  selectedCategoryId: string
  resetDeps?: readonly unknown[]
}

export function useCategoryStripTableFlow<T extends EntityGridRow>({
  tableConfigKey,
  rows,
  reportColumns,
  categories,
  search,
  selectedCategoryId,
  resetDeps = [],
}: UseCategoryStripTableFlowArgs<T>) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const tableConfig = useTableConfigStore(selectTableConfig(tableConfigKey))
  const setSorting = useTableConfigStore((state) => state.setSorting)

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories ?? []) map.set(category.idCategory, category.name)
    return map
  }, [categories])

  const listFiltered = useMemo(() => {
    const searchText = search.toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      return matchesSearch && matchesCategory
    })
  }, [rows, search, selectedCategoryId])

  const effectiveSorting = tableConfig.sorting.length > 0 ? tableConfig.sorting : DEFAULT_TABLE_SORTING
  const sortedListFiltered = useMemo(
    () => sortAssetTableRows(listFiltered, reportColumns, effectiveSorting),
    [effectiveSorting, listFiltered, reportColumns],
  )

  const segments = useMemo(
    () => buildCategorySegmentsFromRows(sortedListFiltered, categoryMap),
    [sortedListFiltered, categoryMap],
  )

  const totalDataCount = useMemo(
    () => segments.reduce((count, segment) => count + segment.items.length, 0),
    [segments],
  )

  const pageSlice = useMemo(
    () => paginateCategorySegments(segments, pagination.pageIndex, pagination.pageSize),
    [segments, pagination.pageIndex, pagination.pageSize],
  )

  const resetDepsKey = useMemo(() => JSON.stringify(resetDeps), [resetDeps])

  useEffect(() => {
    queueMicrotask(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    })
  }, [search, selectedCategoryId, resetDepsKey])

  useEffect(() => {
    if (pagination.pageIndex > pageSlice.pageCount - 1 && pageSlice.pageCount > 0) {
      queueMicrotask(() => {
        setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, pageSlice.pageCount - 1) }))
      })
    }
  }, [pagination.pageIndex, pageSlice.pageCount])

  const handleSortingChange = useCallback((sorting: SortingState) => {
    setSorting(tableConfigKey, sorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setSorting, tableConfigKey])

  return {
    listFiltered,
    hasMetricRows: listFiltered.length > 0,
    pageRows: pageSlice.pageRows,
    pageCount: pageSlice.pageCount,
    totalDataCount,
    pagination,
    setPagination,
    effectiveSorting,
    handleSortingChange,
  }
}
