import { useState, useMemo, useCallback } from 'react'
import { selectedRowIds } from '@/lib/utils'
import { subDays } from 'date-fns'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import type { ListEntity, EntityGridRow } from '@/lib/entityGridUtils'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

interface UseEntityPageOptions {
  entityKey: string
  listEndpoint: string
  listParams?: Record<string, string>
  groupBy: string
  mapListToEntities?: (items: unknown[]) => ListEntity[]
}

export function useEntityPage(options: UseEntityPageOptions) {
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

  const grid = useEntityGrid({
    ...options,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
  })

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    return grid.mergedRows.filter((row: EntityGridRow) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })
  }, [archiveStatus, grid.mergedRows, search, selectedCategoryId])

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
