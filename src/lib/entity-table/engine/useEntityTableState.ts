import { useCallback, useMemo, useState } from 'react'
import type { PaginationState, RowSelectionState } from '@tanstack/react-table'
import { subDays } from 'date-fns'
import { selectedRowIds } from '@/lib/utils'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

interface UseEntityTableStateOptions {
  rows: EntityGridRow[]
  archiveListFilter?: 'trafficsource' | 'status'
  staticListParams?: Record<string, string>
  defaultPageSize?: number
}

function listParamsFromArchiveTab(
  archiveStatus: ArchiveStatus,
  archiveListFilter?: 'trafficsource' | 'status',
  staticListParams?: Record<string, string>,
): Record<string, string> | undefined {
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
}

export function filterEntityTableRows(
  rows: EntityGridRow[],
  search: string,
  selectedCategoryId: string,
  archiveStatus: ArchiveStatus,
  skipArchiveFilter: boolean,
) {
  const searchText = search.toLowerCase()
  return rows.filter((row) => {
    const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
    const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
    const matchesArchive =
      skipArchiveFilter ||
      archiveStatus === 'all' ||
      (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
    return matchesSearch && matchesCategory && matchesArchive
  })
}

export function useEntityTableState({
  rows,
  archiveListFilter,
  staticListParams,
  defaultPageSize = 50,
}: UseEntityTableStateOptions) {
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize })
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const listParamsForQuery = useMemo(
    () => listParamsFromArchiveTab(archiveStatus, archiveListFilter, staticListParams),
    [archiveStatus, archiveListFilter, staticListParams],
  )
  const skipArchiveFilter = Boolean(archiveListFilter)

  const filtered = useMemo(
    () => filterEntityTableRows(rows, search, selectedCategoryId, archiveStatus, skipArchiveFilter),
    [rows, search, selectedCategoryId, archiveStatus, skipArchiveFilter],
  )

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const handleCreate = useCallback(() => {
    setEditId(null)
    setSheetOpen(true)
  }, [])

  const handleEdit = useCallback((id: string) => {
    setEditId(id)
    setSheetOpen(true)
  }, [])

  return {
    search,
    setSearch,
    archiveStatus,
    setArchiveStatus,
    selectedCategoryId,
    setSelectedCategoryId,
    rowSelection,
    setRowSelection,
    selectedIds,
    pagination,
    setPagination,
    listParamsForQuery,
    skipArchiveFilter,
    tz,
    setTz,
    dateRange,
    setDateRange,
    sheetOpen,
    setSheetOpen,
    editId,
    setEditId,
    deleteId,
    setDeleteId,
    handleCreate,
    handleEdit,
    filtered,
  }
}
