import { useCallback, useMemo, useRef, useState } from 'react'
import type { RowSelectionState, Table, Updater } from '@tanstack/react-table'
import { useToastApi } from '@/components/ui-kit'
import {
  useArchivePage,
  useAssignPagesToCategory,
  useBulkDeletePages,
  useCategories,
  useClonePage,
  useDeleteCategory,
  useDeletePage,
  useImportPagesFromCsv,
  usePage,
  useSaveCategory,
  useSavePage,
} from '@/api/hooks'
import { buildTotalsRow, useEntityGrid } from '@/api/hooks/useEntityGrid'
import { queryKeys } from '@/api/queryKeys'
import { pagesToListEntities } from '@/lib/entityGridUtils'
import { mapStatColsForCategoryStrip } from '@/lib/categoryStripTable'
import {
  categoryKeyFromStripRowId,
  deletableCategoryStripRowIds,
  entityRowIdsFromSelection,
  syncCategoryStripRowSelection,
} from '@/lib/categoryStripSelection'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { visibleMetricColumnIdsFromHidden } from '@/lib/drilldownMetrics'
import { useCategoryStripTableFlow } from '@/hooks/useCategoryStripTableFlow'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'
import type { PageEntitiesPageProps, PageGridRow } from '@/pages/page-entities/types'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'

const PAGE_CATEGORY_ENTITY = 'page' as const

export function usePageEntitiesController({
  pageType,
  tableConfigKey,
  singularLabel,
  groupBy,
  hideScope,
  buildImportPayload,
}: Omit<PageEntitiesPageProps, 'title' | 'csvFieldOptions'>) {
  const toast = useToastApi()
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = `${singularLower}s`

  const tableRef = useRef<Table<PageGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<PageGridRow> | null>(null)

  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; archive: boolean } | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }))

  const { data: categories } = useCategories(PAGE_CATEGORY_ENTITY)
  const { data: editPage } = usePage(editId ?? '')
  const saveMutation = useSavePage()
  const deleteMutation = useDeletePage()
  const cloneMutation = useClonePage()
  const archiveMutation = useArchivePage()
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const bulkDeletePagesMutation = useBulkDeletePages()
  const importPagesCsvMutation = useImportPagesFromCsv()
  const assignPagesCategoryMutation = useAssignPagesToCategory()

  const listParams = useMemo(
    () => ({ pageType, status: archiveStatus } as const),
    [pageType, archiveStatus],
  )
  const hideScopes = useMemo(() => new Set([hideScope]), [hideScope])
  const metricColumnIds = visibleMetricColumnIdsFromHidden(tableConfigKey, {
    defaultVisibleColumnIds: defaultColIds,
    hideScopes,
  })

  const {
    mergedRows,
    reportColumns,
    totalsCells,
    isLoading,
    isFetching,
    refetch: reload,
    error: gridError,
  } = useEntityGrid({
    queryKeyPrefix: queryKeys.pages.all,
    listEndpoint: '/data/page/find/byStatus/',
    listParams,
    groupBy,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    mapListToEntities: (items) => pagesToListEntities(items as Page[]),
    metricColumnIds,
  })

  const {
    listFiltered,
    hasMetricRows,
    pageRows,
    pageCount,
    totalDataCount,
    pagination,
    setPagination,
    effectiveSorting,
    handleSortingChange,
  } = useCategoryStripTableFlow<PageGridRow>({
    tableConfigKey,
    rows: mergedRows as PageGridRow[],
    reportColumns,
    categories,
    search,
    selectedCategoryId,
    resetDeps: [archiveStatus],
  })

  const pinnedBottomRows = useMemo(() => {
    if (!hasMetricRows) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as PageGridRow] : undefined
  }, [totalsCells, hasMetricRows])

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])
  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const catStrips = deletableCategoryStripRowIds(selectedIds)
    if (catStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: `Delete categories and ${pluralLower}?`,
      description: `This will delete ${entityIdsForBulk.length} ${singularLower}(s) and remove ${catStrips.length} categor${catStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk, pluralLower, singularLower])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFiltered as PageGridRow[])
      })
    },
    [listFiltered],
  )

  const handleCreate = useCallback(() => {
    setEditId(null)
    setSheetOpen(true)
  }, [])

  const handleEdit = useCallback((id: string) => {
    setEditId(id)
    setSheetOpen(true)
  }, [])

  const handleSubmit = useCallback((data: PageFormData) => {
    saveMutation.mutate(
      { page: data as Partial<Page>, isCreate: !editId },
      {
        onSuccess: () => {
          toast.success(editId ? `${singularLabel} updated` : `${singularLabel} created`)
          setSheetOpen(false)
          setEditId(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [saveMutation, editId, toast, singularLabel])

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback((idPage: string) => {
    const sourceRow = listFiltered.find(
      (row): row is PageGridRow => !row._isCategoryHeader && row.id === idPage,
    )
    const categoryIdFromSource =
      sourceRow?.categoryId != null && String(sourceRow.categoryId) !== ''
        ? String(sourceRow.categoryId)
        : undefined
    cloneMutate(
      { idPage, pageType, categoryId: categoryIdFromSource },
      {
        onSuccess: () => {
          toast.success(`${singularLabel} cloned`)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [cloneMutate, listFiltered, toast, singularLabel, pageType])

  const handleArchiveConfirmedRow = useCallback((row: PageGridRow, archive: boolean) => {
    if (row._isCategoryHeader || row.id === '__totals__') return
    setArchiveConfirm({ id: row.id, archive })
  }, [])

  const archiveMutate = archiveMutation.mutate
  const handleConfirmArchiveDialog = useCallback(() => {
    if (!archiveConfirm) return
    const { id, archive } = archiveConfirm
    archiveMutate(
      { ids: [id], archive },
      {
        onSuccess: () => {
          toast.success(archive ? 'Archived' : 'Restored')
          setArchiveConfirm(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [archiveConfirm, archiveMutate, toast])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Deleted')
        setDeleteId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [deleteId, deleteMutation, toast])

  const handleImport = useCallback(async (importRows: Record<string, string>[]) => {
    try {
      const result = await importPagesCsvMutation.mutateAsync({
        rows: importRows,
        buildImportPayload,
      })
      if (result.failed.length > 0) {
        toast.warning(
          `Imported ${result.succeeded.length} row(s); ${result.failed.length} failed`,
        )
      } else {
        toast.success('CSV import complete')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [buildImportPayload, importPagesCsvMutation, toast])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<PageGridRow>(reportColumns, { hideScopes })),
    [reportColumns, hideScopes],
  )

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [])

  const handleBulkArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync({ ids: entityIdsForBulk, archive: true })
      toast.success(`Selected ${pluralLower} archived`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [archiveMutation, entityIdsForBulk, pluralLower, toast])

  const handleBulkDelete = useCallback(async () => {
    const categoryKeys = [
      ...new Set(
        deletableCategoryStripRowIds(selectedIds)
          .map((id) => categoryKeyFromStripRowId(id))
          .filter((key): key is string => key != null && key !== ''),
      ),
    ]
    const pageResult = await bulkDeletePagesMutation.mutateAsync(entityIdsForBulk)
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({ entityType: PAGE_CATEGORY_ENTITY, idCategory })
    }
    if (pageResult.failed.length > 0) {
      toast.error(
        `${pageResult.failed.length} ${pluralLower} could not be deleted`,
      )
    } else {
      toast.success('Selected items deleted')
    }
    setRowSelection({})
  }, [
    selectedIds,
    entityIdsForBulk,
    bulkDeletePagesMutation,
    deleteCategoryMutation,
    toast,
    pluralLower,
  ])

  const handleBulkAssignCategory = useCallback(async (idCategory: string) => {
    try {
      await assignPagesCategoryMutation.mutateAsync({ pageIds: entityIdsForBulk, idCategory })
      toast.success(`Selected ${pluralLower} moved`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [assignPagesCategoryMutation, entityIdsForBulk, pluralLower, toast])

  const bulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignCategory,
    }),
    [categories, handleBulkAssignCategory],
  )

  const handleDateRangeChange = useCallback((value: DateRange & { preset: string | null }) => {
    if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
  }, [])

  const handleFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [])

  const handleDismissDelete = useCallback(() => setDeleteId(null), [])

  const openCategoryRename = useCallback((row: PageGridRow) => {
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
      { entityType: PAGE_CATEGORY_ENTITY, idCategory: categoryRename.idCategory, name },
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
      { entityType: PAGE_CATEGORY_ENTITY, idCategory: categoryDeleteId },
      {
        onSuccess: () => {
          toast.success('Category deleted')
          setCategoryDeleteId(null)
          if (selectedCategoryId === categoryDeleteId) setSelectedCategoryId('')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryDeleteId, deleteCategoryMutation, toast, selectedCategoryId])

  return {
    singularLower,
    pluralLower,
    tableRef,
    tableForChooser,
    setTableForChooser,
    search,
    setSearch,
    archiveStatus,
    setArchiveStatus,
    sheetOpen,
    importOpen,
    setImportOpen,
    editId,
    deleteId,
    setDeleteId,
    archiveConfirm,
    setArchiveConfirm,
    selectedCategoryId,
    setSelectedCategoryId,
    rowSelection,
    tz,
    setTz,
    dateRange,
    categories,
    editPage,
    saveMutation,
    deleteMutation,
    archiveMutation,
    saveCategoryMutation,
    deleteCategoryMutation,
    mergedRows,
    isLoading,
    isFetching,
    reload,
    gridError,
    listFiltered,
    pageRows,
    pageCount,
    totalDataCount,
    pagination,
    setPagination,
    effectiveSorting,
    handleSortingChange,
    pinnedBottomRows,
    selectedIds,
    entityIdsForBulk,
    bulkDeleteConfirmCopy,
    handleRowSelectionChange,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleClone,
    handleArchiveConfirmedRow,
    handleConfirmArchiveDialog,
    handleDelete,
    handleImport,
    statCols,
    hideScopes,
    handleBulkDeselectAll,
    handleBulkArchive,
    handleBulkDelete,
    bulkMoveToCategory,
    handleDateRangeChange,
    handleFormOpenChange,
    handleDismissDelete,
    categoryRename,
    setCategoryRename,
    categoryRenameDraft,
    setCategoryRenameDraft,
    categoryDeleteId,
    setCategoryDeleteId,
    openCategoryRename,
    handleConfirmCategoryRename,
    handleConfirmCategoryDelete,
  }
}
