import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import type { PaginationState, RowSelectionState, SortingState, Table, Updater } from '@tanstack/react-table'
import { useToastApi } from '@/components/ui-kit'
import {
  useCategories,
  useSaveTrafficSource,
  useDeleteTrafficSource,
  useCloneTrafficSource,
  useArchiveTrafficSource,
  useTrafficSource,
  useSaveCategory,
  useDeleteCategory,
  useBulkDeleteTrafficSources,
  useAssignTrafficSourcesToCategory,
} from '@/api/hooks'
import { buildTotalsRow } from '@/api/hooks/useEntityGrid'
import { queryKeys } from '@/api/queryKeys'
import { trafficSourceListToListEntities } from '@/lib/entityGridUtils'
import { useEntityPage } from '@/hooks/useEntityPage'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import { getErrorMessage } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import { paginateCategorySegments } from '@/lib/paginateCategorySegments'
import { buildCategorySegmentsFromRows, mapStatColsForCategoryStrip } from '@/lib/categoryStripTable'
import {
  syncCategoryStripRowSelection,
  entityRowIdsFromSelection,
  deletableCategoryStripRowIds,
  categoryKeyFromStripRowId,
} from '@/lib/categoryStripSelection'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'
import { sortEntityGridRows } from '@/lib/entityGridSorting'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
import type { TrafficSourceGridRow } from '@/pages/traffic-sources/types'

const TABLE_KEY = 'traffic-sources'

export function useTrafficSourcesController() {
  const toast = useToastApi()
  const tableRef = useRef<Table<TrafficSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<TrafficSourceGridRow> | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const tableConfig = useTableConfigStore(selectTableConfig(TABLE_KEY))
  const setSorting = useTableConfigStore((state) => state.setSorting)
  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)

  const {
    filtered: listFiltered,
    reportColumns,
    totalsCells,
    isLoading,
    isFetching,
    refetch: reload,
    error: gridError,
    search,
    setSearch,
    archiveStatus,
    setArchiveStatus,
    selectedCategoryId,
    setSelectedCategoryId,
    rowSelection,
    setRowSelection,
    selectedIds,
    sheetOpen,
    setSheetOpen,
    editId,
    setEditId,
    deleteId,
    setDeleteId,
    dateRange,
    setDateRange,
    tz,
    setTz,
    handleCreate,
    handleEdit,
  } = useEntityPage({
    queryKeyPrefix: queryKeys.trafficSources.all,
    listEndpoint: '/data/trafficsource/list/',
    groupBy: 'Third Parties: Traffic Source',
    archiveListFilter: 'trafficsource',
    mapListToEntities: trafficSourceListToListEntities,
    metricStorageKey: TABLE_KEY,
  })

  const { data: categories } = useCategories('trafficsource')

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories ?? []) map.set(category.idCategory, category.name)
    return map
  }, [categories])

  const effectiveSorting = tableConfig.sorting.length > 0 ? tableConfig.sorting : DEFAULT_TABLE_SORTING
  const sortedListFiltered = useMemo(
    () => sortEntityGridRows(listFiltered as TrafficSourceGridRow[], reportColumns, effectiveSorting),
    [listFiltered, reportColumns, effectiveSorting],
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

  const filterResetKey = useMemo(
    () => [search, selectedCategoryId, archiveStatus].join('\0'),
    [search, selectedCategoryId, archiveStatus],
  )

  useEffect(() => {
    queueMicrotask(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    })
  }, [filterResetKey])

  useEffect(() => {
    if (pagination.pageIndex > pageSlice.pageCount - 1 && pageSlice.pageCount > 0) {
      queueMicrotask(() => {
        setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, pageSlice.pageCount - 1) }))
      })
    }
  }, [pagination.pageIndex, pageSlice.pageCount])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFiltered as TrafficSourceGridRow[])
      })
    },
    [listFiltered, setRowSelection],
  )

  const handleSortingChange = useCallback((sorting: SortingState) => {
    setSorting(TABLE_KEY, sorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setSorting])

  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const categoryStrips = deletableCategoryStripRowIds(selectedIds)
    if (categoryStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: 'Delete categories and traffic sources?',
      description: `This will delete ${entityIdsForBulk.length} traffic source(s) and remove ${categoryStrips.length} categor${categoryStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk])

  const { data: editSource } = useTrafficSource(editId ?? '')
  const saveMutation = useSaveTrafficSource()
  const deleteMutation = useDeleteTrafficSource()
  const cloneMutation = useCloneTrafficSource()
  const archiveMutation = useArchiveTrafficSource()
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const bulkDeleteTrafficMutation = useBulkDeleteTrafficSources()
  const assignTrafficCategoryMutation = useAssignTrafficSourcesToCategory()

  const hasMetricRows = listFiltered.length > 0
  const pinnedBottomRows = useMemo(() => {
    if (!hasMetricRows) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as TrafficSourceGridRow] : undefined
  }, [totalsCells, hasMetricRows])

  const handleSubmit = (data: TrafficSourceFormData) => {
    saveMutation.mutate(
      { trafficSource: data as unknown as Partial<TrafficSource>, isCreate: !editId },
      {
        onSuccess: () => {
          toast.success(editId ? 'Traffic source updated' : 'Traffic source created')
          setSheetOpen(false)
          setEditId(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback((id: string) => {
    const row = listFiltered.find((item): item is TrafficSourceGridRow => !item._isCategoryHeader && item.id === id)
    cloneMutate(
      {
        idTrafficSource: id,
        categoryId: row?.categoryId != null ? String(row.categoryId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Traffic source cloned')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [cloneMutate, listFiltered, toast])

  const archiveMutate = archiveMutation.mutate
  const handleArchiveTrafficSource = useCallback((id: string, archive: boolean) => {
    archiveMutate(
      { ids: [id], archive },
      {
        onSuccess: () => {
          toast.success(archive ? 'Archived' : 'Restored')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [archiveMutate, toast])

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Deleted')
        setDeleteId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<TrafficSourceGridRow>(reportColumns)),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const openCategoryRename = useCallback((row: TrafficSourceGridRow) => {
    const idCategory = row._categoryId ?? ''
    if (!idCategory) return
    setCategoryRename({ idCategory, name: row.name })
    setCategoryRenameDraft(row.name)
  }, [])

  const handleConfirmCategoryRename = useCallback(() => {
    if (!categoryRename) return
    const name = categoryRenameDraft.trim()
    if (!name) return
    saveCategoryMutation.mutate(
      { entityType: 'trafficsource', idCategory: categoryRename.idCategory, name },
      {
        onSuccess: () => {
          toast.success('Category renamed')
          setCategoryRename(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryRename, categoryRenameDraft, saveCategoryMutation, toast])

  const handleConfirmCategoryDelete = useCallback(() => {
    if (!categoryDeleteId) return
    deleteCategoryMutation.mutate(
      { entityType: 'trafficsource', idCategory: categoryDeleteId },
      {
        onSuccess: () => {
          toast.success('Category deleted')
          setCategoryDeleteId(null)
          if (selectedCategoryId === categoryDeleteId) setSelectedCategoryId('')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryDeleteId, deleteCategoryMutation, toast, selectedCategoryId, setSelectedCategoryId])

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [setRowSelection])

  const handleBulkArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync({ ids: entityIdsForBulk, archive: true })
      toast.success('Selected traffic sources archived')
      setRowSelection({})
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [archiveMutation, entityIdsForBulk, toast, setRowSelection])

  const handleBulkDelete = useCallback(async () => {
    const categoryKeys = [
      ...new Set(
        deletableCategoryStripRowIds(selectedIds)
          .map((id) => categoryKeyFromStripRowId(id))
          .filter((key): key is string => key != null && key !== ''),
      ),
    ]
    const pageResult = await bulkDeleteTrafficMutation.mutateAsync(entityIdsForBulk)
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({ entityType: 'trafficsource', idCategory })
    }
    if (pageResult.failed.length > 0) {
      toast.error(`${pageResult.failed.length} traffic sources could not be deleted`)
    } else {
      toast.success('Selected items deleted')
    }
    setRowSelection({})
  }, [
    selectedIds,
    entityIdsForBulk,
    bulkDeleteTrafficMutation,
    deleteCategoryMutation,
    toast,
    setRowSelection,
  ])

  const handleBulkAssignCategory = useCallback(async (idCategory: string) => {
    try {
      await assignTrafficCategoryMutation.mutateAsync({
        trafficSourceIds: entityIdsForBulk,
        idCategory,
      })
      toast.success('Selected traffic sources moved')
      setRowSelection({})
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [assignTrafficCategoryMutation, entityIdsForBulk, toast, setRowSelection])

  const bulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignCategory,
    }),
    [categories, handleBulkAssignCategory],
  )

  const handleDateRangeChange = useCallback((value: DateRange & { preset: string | null }) => {
    if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
  }, [setDateRange])

  const handleFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [setEditId, setSheetOpen])

  const handleDismissDelete = useCallback(() => setDeleteId(null), [setDeleteId])

  return {
    tableRef,
    tableForChooser,
    setTableForChooser,
    pagination,
    setPagination,
    search,
    setSearch,
    archiveStatus,
    setArchiveStatus,
    selectedCategoryId,
    setSelectedCategoryId,
    rowSelection,
    tz,
    setTz,
    dateRange,
    isLoading,
    isFetching,
    reload,
    gridError,
    pageRows: pageSlice.pageRows,
    pageCount: pageSlice.pageCount,
    totalDataCount,
    effectiveSorting,
    handleSortingChange,
    pinnedBottomRows,
    selectedIds,
    sheetOpen,
    editId,
    deleteId,
    editSource,
    saveMutation,
    deleteMutation,
    archiveMutation,
    saveCategoryMutation,
    deleteCategoryMutation,
    categoryRename,
    setCategoryRename,
    categoryRenameDraft,
    setCategoryRenameDraft,
    categoryDeleteId,
    setCategoryDeleteId,
    handleRowSelectionChange,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleClone,
    handleArchiveTrafficSource,
    handleDelete,
    statCols,
    handleRequestDelete,
    openCategoryRename,
    handleConfirmCategoryRename,
    handleConfirmCategoryDelete,
    handleBulkDeselectAll,
    handleBulkArchive,
    handleBulkDelete,
    bulkMoveToCategory,
    bulkDeleteConfirmCopy,
    handleDateRangeChange,
    handleFormOpenChange,
    handleDismissDelete,
  }
}
