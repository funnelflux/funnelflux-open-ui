import { useCallback, useMemo, useRef, useState } from 'react'
import type { Table } from '@tanstack/react-table'
import { useToastApi } from '@/components/ui-kit'
import type { MetricScope } from '@/components/ui-kit/data-table/columnRegistry'
import {
  useArchiveOfferSource,
  useCloneOfferSource,
  useDeleteOfferSource,
  useOfferSource,
  useSaveOfferSource,
} from '@/api/hooks'
import { buildTotalsRow } from '@/api/hooks/useEntityGrid'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { offerSourcesToListEntities } from '@/lib/entity-table/data/mergedRows'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'
import { useEntityTable } from '@/lib/entity-table/useEntityTable'
import { queryKeys } from '@/api/queryKeys'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import type { DateRange } from '@/lib/date-presets'
import { getErrorMessage } from '@/lib/utils'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'

export type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

const TABLE_CONFIG_KEY = 'offer-sources'
export const OFFER_SOURCES_METRIC_HIDE_SCOPES = new Set<MetricScope>(['lander'])

export function useOfferSourcesController() {
  const toast = useToastApi()
  const singularLabel = 'Offer Source'
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = 'offer sources'

  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; archive: boolean } | null>(null)

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
  })

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()
  const archiveMutation = useArchiveOfferSource()
  const cloneMutation = useCloneOfferSource()

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
          setSheetOpen(true)
          return
        }

        setSheetOpen(false)
        setEditId(null)
      } catch (err) {
        toast.error(getErrorMessage(err))
        throw err
      }
    },
    [editId, saveMutation, toast, singularLabel, setEditId, setSheetOpen],
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

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback(
    (id: string) => {
      cloneMutate(id, {
        onSuccess: () => {
          toast.success(`${singularLabel} cloned`)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
    },
    [cloneMutate, toast, singularLabel],
  )

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
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync(id)
      }
      toast.success(`Selected ${pluralLower} deleted`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [selectedIds, deleteMutation, pluralLower, toast, setRowSelection])

  const handleDateRangeChange = useCallback(
    (value: DateRange & { preset: string | null }) => {
      if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
    },
    [setDateRange],
  )

  const handleFormOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open)
      if (!open) setEditId(null)
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
    reload,
    gridError,
    filtered,
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
