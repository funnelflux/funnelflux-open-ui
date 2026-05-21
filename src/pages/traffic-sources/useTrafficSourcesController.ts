import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import type { RowSelectionState, Table, Updater } from '@tanstack/react-table'
import { useToastApi } from '@/components/ui-kit'
import {
  useArchiveTrafficSource,
  useAssignTrafficSourcesToCategory,
  useBulkDeleteTrafficSources,
  useCategories,
  useDeleteCategory,
  useDeleteTrafficSource,
  useSaveCategory,
  useSaveTrafficSource,
  useTrafficSource,
} from '@/api/hooks'
import { buildTotalsRow } from '@/api/hooks/useEntityGrid'
import { queryKeys } from '@/api/queryKeys'
import {
  trafficSourceListToListEntities,
  type CategoryStripGridRow,
} from '@/lib/entity-table/data/mergedRows'
import { mapStatColsForCategoryStrip } from '@/lib/entity-table/engine/categoryStripTable'
import {
  categoryKeyFromStripRowId,
  deletableCategoryStripRowIds,
  entityRowIdsFromSelection,
  syncCategoryStripRowSelection,
} from '@/lib/entity-table/engine/categoryStripSelection'
import { useEntityTable } from '@/lib/entity-table/useEntityTable'
import { useCategoryStripTableFlow } from '@/hooks/useCategoryStripTableFlow'
import { getErrorMessage } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import type { TrafficSource } from '@/types/entities'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'
import { buildTrafficSourceCloneDraft } from '@/lib/trafficSourceCloneDraft'
import type { TrafficSourceFormMode } from '@/components/forms/TrafficSourceForm'

const TABLE_CONFIG_KEY = 'traffic-sources'
const TRAFFICSOURCE_CATEGORY_ENTITY = 'trafficsource' as const

export function useTrafficSourcesController() {
  const queryClient = useQueryClient()
  const toast = useToastApi()
  const singularLabel = 'Traffic Source'
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = 'traffic sources'

  const tableRef = useRef<Table<CategoryStripGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<CategoryStripGridRow> | null>(null)

  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; archive: boolean } | null>(null)

  const { data: categories } = useCategories(TRAFFICSOURCE_CATEGORY_ENTITY)
  const saveMutation = useSaveTrafficSource()
  const deleteMutation = useDeleteTrafficSource()
  const archiveMutation = useArchiveTrafficSource()
  const [cloneInitialValues, setCloneInitialValues] = useState<TrafficSourceFormData | null>(null)
  const [cloneLoading, setCloneLoading] = useState(false)
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const bulkDeleteTrafficMutation = useBulkDeleteTrafficSources()
  const assignTrafficCategoryMutation = useAssignTrafficSourcesToCategory()

  const {
    filtered,
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
  } = useEntityTable({
    mode: 'flat-client-paged',
    queryKeyPrefix: queryKeys.trafficSources.all,
    listEndpoint: '/data/trafficsource/list/',
    groupBy: 'Third Parties: Traffic Source',
    archiveListFilter: 'trafficsource',
    mapListToEntities: trafficSourceListToListEntities,
    metricStorageKey: TABLE_CONFIG_KEY,
  })

  const { data: editSource } = useTrafficSource(editId ?? '')

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
  } = useCategoryStripTableFlow<CategoryStripGridRow>({
    tableConfigKey: TABLE_CONFIG_KEY,
    rows: filtered as CategoryStripGridRow[],
    reportColumns,
    categories,
    search: '',
    selectedCategoryId: '',
    resetDeps: [archiveStatus],
  })

  const listFilteredRef = useRef(listFiltered)
  useEffect(() => {
    listFilteredRef.current = listFiltered
  }, [listFiltered])

  const pinnedBottomRows = useMemo(() => {
    if (!hasMetricRows) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as CategoryStripGridRow] : undefined
  }, [totalsCells, hasMetricRows])

  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const categoryStrips = deletableCategoryStripRowIds(selectedIds)
    if (categoryStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: 'Delete categories and traffic sources?',
      description: `This will delete ${entityIdsForBulk.length} traffic source(s) and remove ${categoryStrips.length} categor${categoryStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFilteredRef.current as CategoryStripGridRow[])
      })
    },
    [setRowSelection],
  )

  const handleSubmit = useCallback((data: TrafficSourceFormData) => {
    saveMutation.mutate(
      { trafficSource: data as unknown as Partial<TrafficSource>, isCreate: !editId },
      {
        onSuccess: () => {
          toast.success(editId ? `${singularLabel} updated` : `${singularLabel} created`)
          setSheetOpen(false)
          setEditId(null)
          setCloneInitialValues(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [saveMutation, editId, toast, singularLabel, setEditId, setSheetOpen])

  const handleClone = useCallback(async (id: string) => {
    setCloneLoading(true)
    try {
      const source = await queryClient.fetchQuery({
        queryKey: queryKeys.trafficSources.detail(id),
        queryFn: () => api.get<TrafficSource>('/data/trafficsource/find/byId/', { idTrafficSource: id }),
      })
      const draft = buildTrafficSourceCloneDraft(source)
      const row = listFiltered.find(
        (item): item is CategoryStripGridRow => !item._isCategoryHeader && item.id === id,
      )
      if (row?.categoryId != null && String(row.categoryId) !== '') {
        draft.idCategory = String(row.categoryId)
      }
      setEditId(null)
      setCloneInitialValues(draft)
      setSheetOpen(true)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCloneLoading(false)
    }
  }, [queryClient, listFiltered, toast, setEditId, setSheetOpen])

  const formMode: TrafficSourceFormMode = editId
    ? 'edit'
    : cloneInitialValues
      ? 'clone'
      : 'create'

  const handleArchiveConfirmedRow = useCallback((row: CategoryStripGridRow, archive: boolean) => {
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

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<CategoryStripGridRow>(reportColumns)),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const openCategoryRename = useCallback((row: CategoryStripGridRow) => {
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
      { entityType: TRAFFICSOURCE_CATEGORY_ENTITY, idCategory: categoryRename.idCategory, name },
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
      { entityType: TRAFFICSOURCE_CATEGORY_ENTITY, idCategory: categoryDeleteId },
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
      toast.success(`Selected ${pluralLower} archived`)
      setRowSelection({})
    } catch (error) {
      toast.error(getErrorMessage(error))
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
    const pageResult = await bulkDeleteTrafficMutation.mutateAsync(entityIdsForBulk)
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({
        entityType: TRAFFICSOURCE_CATEGORY_ENTITY,
        idCategory,
      })
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
      toast.success(`Selected ${pluralLower} moved`)
      setRowSelection({})
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [assignTrafficCategoryMutation, entityIdsForBulk, pluralLower, toast, setRowSelection])

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

  return {
    singularLabel,
    singularLower,
    pluralLower,
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
    pageRows,
    pageCount,
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
    archiveConfirm,
    setArchiveConfirm,
    handleRowSelectionChange,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleClone,
    formMode,
    cloneInitialValues,
    cloneLoading,
    handleArchiveConfirmedRow,
    handleConfirmArchiveDialog,
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
