import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PaginationState, SortingState, Table } from '@tanstack/react-table'
import { api } from '@/api/client'
import { useToastApi } from '@/components/ui-kit'
import type { OfferSourceFormMode } from '@/components/forms/OfferSourceForm'
import type { MetricScope } from '@/components/ui-kit/data-table/columnRegistry'
import {
  useArchiveOfferSource,
  useBulkDeleteOfferSources,
  useDeleteOfferSource,
  useOfferSource,
  useSaveOfferSource,
} from '@/api/hooks'
import { buildTotalsRow } from '@/api/hooks/useEntityGrid'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { offerSourcesToListEntities } from '@/lib/entity-table/data/mergedRows'
import { sortAssetTableRows } from '@/lib/entity-table/data/sorting'
import { pageIndexForRowInFlatList } from '@/lib/entity-table/engine/flatListPagination'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'
import { useEntityTable } from '@/lib/entity-table/useEntityTable'
import { queryKeys } from '@/api/queryKeys'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import type { DateRange } from '@/lib/date-presets'
import { getErrorMessage } from '@/lib/utils'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { useRevealEntityRow } from '@/hooks/useRevealEntityRow'
import { buildOfferSourceCloneDraft } from '@/lib/offerSourceCloneDraft'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

export type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

const TABLE_CONFIG_KEY = 'offer-sources'
export const OFFER_SOURCES_METRIC_HIDE_SCOPES = new Set<MetricScope>(['lander'])

export function useOfferSourcesController() {
  const queryClient = useQueryClient()
  const toast = useToastApi()
  const singularLabel = 'Offer Source'
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = 'offer sources'

  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; archive: boolean } | null>(null)
  const [cloneInitialValues, setCloneInitialValues] = useState<OfferSourceFormData | null>(null)
  const [cloneLoading, setCloneLoading] = useState(false)
  const [revealRowId, setRevealRowId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })

  const tableConfig = useTableConfigStore(selectTableConfig(TABLE_CONFIG_KEY))
  const setSorting = useTableConfigStore((state) => state.setSorting)
  const effectiveSorting = tableConfig.sorting.length > 0 ? tableConfig.sorting : DEFAULT_TABLE_SORTING

  const {
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
    queryKeyPrefix: queryKeys.offerSources.all,
    listEndpoint: '/data/offersource/find/byStatus/',
    groupBy: 'Third Parties: Offer Source',
    archiveListFilter: 'status',
    mapListToEntities: (items) => offerSourcesToListEntities(items as OfferSource[]),
    metricStorageKey: TABLE_CONFIG_KEY,
    defaultVisibleColumnIds: defaultColIds,
    metricHideScopes: OFFER_SOURCES_METRIC_HIDE_SCOPES,
    restrictToScope: 'offerSources',
  })

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()
  const bulkDeleteMutation = useBulkDeleteOfferSources()
  const archiveMutation = useArchiveOfferSource()

  const sortedRows = useMemo(
    () => sortAssetTableRows(filtered as OfferSourceGridRow[], reportColumns, effectiveSorting),
    [effectiveSorting, filtered, reportColumns],
  )

  const totalDataCount = sortedRows.length
  const pageCount = Math.max(1, Math.ceil(totalDataCount / pagination.pageSize))

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return sortedRows.slice(start, start + pagination.pageSize)
  }, [sortedRows, pagination.pageIndex, pagination.pageSize])

  const { requestReveal, highlightRowId } = useRevealEntityRow(pageRows, revealRowId, setRevealRowId)

  const formMode: OfferSourceFormMode = editId
    ? 'edit'
    : cloneInitialValues
      ? 'clone'
      : 'create'

  useEffect(() => {
    queueMicrotask(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    })
  }, [search, archiveStatus])

  useEffect(() => {
    if (pagination.pageIndex > pageCount - 1 && pageCount > 0) {
      queueMicrotask(() => {
        setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, pageCount - 1) }))
      })
    }
  }, [pagination.pageIndex, pageCount])

  useEffect(() => {
    if (!revealRowId) return
    const pageIndex = pageIndexForRowInFlatList(sortedRows, revealRowId, pagination.pageSize)
    if (pageIndex == null) return
    queueMicrotask(() => {
      setPagination((prev) => (prev.pageIndex === pageIndex ? prev : { ...prev, pageIndex }))
    })
  }, [revealRowId, sortedRows, pagination.pageSize])

  const handleSortingChange = useCallback((sorting: SortingState) => {
    setSorting(TABLE_CONFIG_KEY, sorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setSorting])

  const pinnedBottomRows = useMemo(() => {
    if (filtered.length === 0) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as OfferSourceGridRow] : undefined
  }, [totalsCells, filtered.length])

  const handleSubmit = useCallback(
    async (data: OfferSourceFormData, options?: { createAnother?: boolean }) => {
      const isCreate = !editId
      try {
        await saveMutation.mutateAsync({ offerSource: data, isCreate })
        toast.success(editId ? `${singularLabel} updated` : `${singularLabel} created`)

        if (options?.createAnother && isCreate) {
          setEditId(null)
          setCloneInitialValues(null)
          setSheetOpen(true)
          return
        }

        setSheetOpen(false)
        setEditId(null)
        setCloneInitialValues(null)
        if (isCreate && data.idOfferSource) {
          requestReveal(data.idOfferSource)
        }
      } catch (err) {
        toast.error(getErrorMessage(err))
        throw err
      }
    },
    [editId, saveMutation, toast, singularLabel, setEditId, setSheetOpen, requestReveal],
  )

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
    () =>
      buildColumnsFromReport<OfferSourceGridRow>(reportColumns, {
        hideScopes: OFFER_SOURCES_METRIC_HIDE_SCOPES,
      }),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const handleClone = useCallback(async (id: string) => {
    setCloneLoading(true)
    try {
      const source = await queryClient.fetchQuery({
        queryKey: queryKeys.offerSources.detail(id),
        queryFn: () => api.get<OfferSource>('/data/offersource/find/byId/', { idOfferSource: id }),
      })
      setEditId(null)
      setCloneInitialValues(buildOfferSourceCloneDraft(source))
      setSheetOpen(true)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCloneLoading(false)
    }
  }, [queryClient, toast, setEditId, setSheetOpen])

  const handleArchiveConfirmedRow = useCallback((row: OfferSourceGridRow, archive: boolean) => {
    if (row.id === '__totals__') return
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

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [setRowSelection])

  const handleBulkArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync({ ids: selectedIds, archive: true })
      toast.success(`Selected ${pluralLower} archived`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [archiveMutation, selectedIds, pluralLower, toast, setRowSelection])

  const handleBulkDelete = useCallback(async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync(selectedIds)
      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} ${pluralLower} could not be deleted`,
        )
      } else {
        toast.success(`Selected ${pluralLower} deleted`)
      }
      setRowSelection({})
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }, [selectedIds, bulkDeleteMutation, pluralLower, toast, setRowSelection])

  const handleDateRangeChange = useCallback(
    (value: DateRange & { preset: string | null }) => {
      if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
    },
    [setDateRange],
  )

  const handleFormOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open)
      if (!open) {
        setEditId(null)
        setCloneInitialValues(null)
      }
    },
    [setSheetOpen, setEditId],
  )

  const handleDismissDelete = useCallback(() => setDeleteId(null), [setDeleteId])

  return {
    singularLabel,
    singularLower,
    pluralLower,
    tableRef,
    tableForChooser,
    setTableForChooser,
    search,
    setSearch,
    archiveStatus,
    setArchiveStatus,
    rowSelection,
    setRowSelection,
    selectedIds,
    sheetOpen,
    editId,
    deleteId,
    editSource,
    dateRange,
    tz,
    setTz,
    isLoading,
    isFetching,
    isLoadingMore,
    reload,
    gridError,
    pageRows,
    pageCount,
    totalDataCount,
    pagination,
    setPagination,
    effectiveSorting,
    handleSortingChange,
    pinnedBottomRows,
    saveMutation,
    deleteMutation,
    archiveMutation,
    statCols,
    archiveConfirm,
    setArchiveConfirm,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleRequestDelete,
    handleClone,
    formMode,
    cloneInitialValues,
    cloneLoading,
    highlightRowId,
    handleArchiveConfirmedRow,
    handleConfirmArchiveDialog,
    handleBulkDeselectAll,
    handleBulkArchive,
    handleBulkDelete,
    handleDateRangeChange,
    handleFormOpenChange,
    handleDismissDelete,
  }
}
