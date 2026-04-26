import { useState, useMemo, useCallback } from 'react'
import { selectedRowIds } from '@/lib/utils'
import { subDays } from 'date-fns'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import type { ListEntity, EntityGridRow } from '@/lib/entityGridUtils'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

interface UseEntityPageOptions {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
  /** Base query params (always sent, e.g. pageType for pages). */
  listParams?: Record<string, string>
  /**
   * Server-side archive tab filtering (no longer filtered client-side).
   * - `trafficsource`: GET `archived=true|false`; omit param when tab is All.
   * - `status`: GET `status=active|archived|all` (page find/byStatus, offersource find/byStatus).
   */
  archiveListFilter?: 'trafficsource' | 'status'
  groupBy: string
  mapListToEntities?: (items: unknown[]) => ListEntity[]
}

export function useEntityPage(options: UseEntityPageOptions) {
  const {
    archiveListFilter,
    listParams: staticListParams,
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    mapListToEntities,
  } = options

  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const listParamsForQuery = useMemo((): Record<string, string> | undefined => {
    const base = staticListParams ? { ...staticListParams } : {}
    if (!archiveListFilter) {
      return Object.keys(base).length > 0 ? base : undefined
    }
    if (archiveListFilter === 'trafficsource') {
      if (archiveStatus === 'all') {
        return Object.keys(base).length > 0 ? base : undefined
      }
      return { ...base, archived: archiveStatus === 'archived' ? 'true' : 'false' }
    }
    return { ...base, status: archiveStatus }
  }, [staticListParams, archiveListFilter, archiveStatus])

  const grid = useEntityGrid({
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    mapListToEntities,
    listParams: listParamsForQuery,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
  })

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    const skipClientArchive = !!archiveListFilter
    return grid.mergedRows.filter((row: EntityGridRow) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      const matchesArchive =
        skipClientArchive ||
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })
  }, [archiveListFilter, archiveStatus, grid.mergedRows, search, selectedCategoryId])

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const handleCreate = useCallback(() => { setEditId(null); setSheetOpen(true) }, [])
  const handleEdit = useCallback((id: string) => { setEditId(id); setSheetOpen(true) }, [])

  return {
    ...grid,
    filtered,
    search, setSearch,
    archiveStatus, setArchiveStatus,
    selectedCategoryId, setSelectedCategoryId,
    rowSelection, setRowSelection,
    tz, setTz,
    dateRange, setDateRange,
    sheetOpen, setSheetOpen,
    editId, setEditId,
    deleteId, setDeleteId,
    selectedIds,
    handleCreate,
    handleEdit,
  }
}
