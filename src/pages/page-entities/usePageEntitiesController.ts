import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RowSelectionState, Table, Updater } from '@tanstack/react-table'
import { api } from '@/api/client'
import { useToastApi } from '@/components/ui-kit'
import type { PageFormMode } from '@/components/forms/PageForm'
import {
  useArchivePage,
  useAssignPagesToCategory,
  useBulkDeletePages,
  useCategories,
  useDeleteCategory,
  useDeletePage,
  useImportPagesFromCsv,
  usePage,
  useSaveCategory,
  useSavePage,
} from '@/api/hooks'
import { buildTotalsRow } from '@/api/hooks/useEntityGrid'
import { queryKeys } from '@/api/queryKeys'
import { pagesToListEntities } from '@/lib/entity-table/data/mergedRows'
import { mapStatColsForCategoryStrip } from '@/lib/entity-table/engine/categoryStripTable'
import {
  categoryKeyFromStripRowId,
  deletableCategoryStripRowIds,
  entityRowIdsFromSelection,
  syncCategoryStripRowSelection,
} from '@/lib/entity-table/engine/categoryStripSelection'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { useEntityTable } from '@/lib/entity-table/useEntityTable'
import { useCategoryStripTableFlow } from '@/hooks/useCategoryStripTableFlow'
import { useRevealEntityRow } from '@/hooks/useRevealEntityRow'
import { buildPageCloneDraft } from '@/lib/pageCloneDraft'
import { getErrorMessage } from '@/lib/utils'
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
}: Omit<PageEntitiesPageProps, 'title'>) {
  const queryClient = useQueryClient()
  const toast = useToastApi()
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = `${singularLower}s`

  const tableRef = useRef<Table<PageGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<PageGridRow> | null>(null)

  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; archive: boolean } | null>(null)

  const { data: categories } = useCategories(PAGE_CATEGORY_ENTITY)
  const saveMutation = useSavePage()
  const deleteMutation = useDeletePage()
  const [cloneInitialValues, setCloneInitialValues] = useState<PageFormData | null>(null)
  const [cloneLoading, setCloneLoading] = useState(false)
  const archiveMutation = useArchivePage()
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const bulkDeletePagesMutation = useBulkDeletePages()
  const importPagesCsvMutation = useImportPagesFromCsv()
  const assignPagesCategoryMutation = useAssignPagesToCategory()

  const hideScopes = useMemo(() => new Set([hideScope]), [hideScope])

  const {
    mergedRows,
    filtered,
    reportColumns,
    totalsCells,
    isLoading,
    isFetching,
    isLoadingMore,
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
  } = useEntityTable({
    mode: 'flat-client-paged',
    queryKeyPrefix: queryKeys.pages.all,
    listEndpoint: '/data/page/find/byStatus/',
    groupBy,
    groupings: ['Element: Lander-Offer Category', groupBy],
    listParams: {
      pageType,
      responseFormat: 'summary-v1',
      includeUrl: 'true',
      ...(pageType === 'offer' ? { includePayout: 'true' } : {}),
    },
    archiveListFilter: 'status',
    mapListToEntities: (items) => pagesToListEntities(items as Page[]),
    metricStorageKey: tableConfigKey,
    defaultVisibleColumnIds: defaultColIds,
    metricHideScopes: hideScopes,
  })
  const { data: editPage } = usePage(editId ?? '')

  const [revealRowId, setRevealRowId] = useState<string | null>(null)

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
    rows: filtered as PageGridRow[],
    reportColumns,
    categories,
    search: '',
    selectedCategoryId: '',
    resetDeps: [archiveStatus],
    revealEntityId: revealRowId,
  })

  const { requestReveal, highlightRowId } = useRevealEntityRow(pageRows, revealRowId, setRevealRowId)

  const formMode: PageFormMode = editId
    ? 'edit'
    : cloneInitialValues
      ? 'clone'
      : 'create'

  const listFilteredRef = useRef(listFiltered)
  useEffect(() => {
    listFilteredRef.current = listFiltered
  }, [listFiltered])

  const pinnedBottomRows = useMemo(() => {
    if (!hasMetricRows) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as PageGridRow] : undefined
  }, [totalsCells, hasMetricRows])

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
        return syncCategoryStripRowSelection(prev, next, listFilteredRef.current as PageGridRow[])
      })
    },
    [setRowSelection],
  )

  const handleSubmit = useCallback((data: PageFormData) => {
    saveMutation.mutate(
      { page: data as Partial<Page>, isCreate: !editId },
      {
        onSuccess: () => {
          toast.success(editId ? `${singularLabel} updated` : `${singularLabel} created`)
          setSheetOpen(false)
          setEditId(null)
          setCloneInitialValues(null)
          if (!editId && data.idPage) {
            requestReveal(data.idPage)
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [saveMutation, editId, toast, singularLabel, setEditId, setSheetOpen, requestReveal])

  const handleClone = useCallback(async (idPage: string) => {
    setCloneLoading(true)
    try {
      const source = await queryClient.fetchQuery({
        queryKey: queryKeys.pages.detail(idPage),
        queryFn: () => api.get<Page>('/data/page/find/byId/', { idPage }),
      })
      const draft = buildPageCloneDraft(source, pageType)
      const row = listFiltered.find(
        (item): item is PageGridRow => !item._isCategoryHeader && item.id === idPage,
      )
      if (row?.categoryId != null && String(row.categoryId) !== '') {
        draft.categoryId = String(row.categoryId)
      }
      setEditId(null)
      setCloneInitialValues(draft)
      setSheetOpen(true)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCloneLoading(false)
    }
  }, [queryClient, pageType, listFiltered, toast, setEditId, setSheetOpen])

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
  }, [deleteId, deleteMutation, toast, setDeleteId])

  const handleImport = useCallback(async (file: File) => {
    try {
      const result = await importPagesCsvMutation.mutateAsync({ file, pageType })
      if (result.skipped > 0) {
        toast.warning(
          `Imported ${result.imported} row(s); ${result.skipped} skipped (duplicate name, invalid URL, or empty name)`,
        )
      } else if (result.imported > 0) {
        toast.success(`Imported ${result.imported} row(s)`)
      } else {
        toast.warning('No rows were imported. Check the CSV matches the template and uses unique names.')
      }
      setImportOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [importPagesCsvMutation, pageType, toast, setImportOpen])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<PageGridRow>(reportColumns, { hideScopes })),
    [reportColumns, hideScopes],
  )

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [setRowSelection])

  const handleBulkArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync({ ids: entityIdsForBulk, archive: true })
      toast.success(`Selected ${pluralLower} archived`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [archiveMutation, entityIdsForBulk, pluralLower, toast, setRowSelection])

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
    setRowSelection,
  ])

  const handleBulkAssignCategory = useCallback(async (idCategory: string) => {
    try {
      await assignPagesCategoryMutation.mutateAsync({ pageIds: entityIdsForBulk, idCategory })
      toast.success(`Selected ${pluralLower} moved`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [assignPagesCategoryMutation, entityIdsForBulk, pluralLower, toast, setRowSelection])

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
    if (!open) {
      setEditId(null)
      setCloneInitialValues(null)
    }
  }, [setEditId, setSheetOpen])

  const handleDismissDelete = useCallback(() => setDeleteId(null), [setDeleteId])

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
  }, [categoryDeleteId, deleteCategoryMutation, toast, selectedCategoryId, setSelectedCategoryId])

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
    isLoadingMore,
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
    formMode,
    cloneInitialValues,
    cloneLoading,
    highlightRowId,
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
