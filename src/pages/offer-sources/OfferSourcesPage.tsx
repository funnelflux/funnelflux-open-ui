import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { ColumnDef, Table } from '@tanstack/react-table'
import { Button } from '@/components/ui-kit'
import {
  PageShell,
  SearchToolbar,
  DataTable,
  ConfirmModal,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import {
  nameColumn,
  idColumn,
  selectionColumn,
  editBtnColumn,
  cloneBtnColumn,
  archiveBtnColumn,
  deleteBtnColumn,
  buildColumnsFromReport,
  entityRowId,
} from '@/components/ui-kit/data-table'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import {
  useSaveOfferSource,
  useDeleteOfferSource,
  useArchiveOfferSource,
  useCloneOfferSource,
  useOfferSource,
} from '@/api/hooks'
import { buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { offerSourcesToListEntities } from '@/lib/entityGridUtils'
import { useEntityPage } from '@/hooks/useEntityPage'
import { queryKeys } from '@/api/queryKeys'
import { OfferSourceForm } from '@/components/forms/OfferSourceForm'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { useEntityGridColumnVisibility } from '@/lib/entityGridColumnVisibility'

type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

export function OfferSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)

  const {
    filtered, reportColumns, totalsCells, isLoading, isFetching, refetch: reload,
    search, setSearch, archiveStatus, setArchiveStatus,
    rowSelection, setRowSelection, selectedIds,
    sheetOpen, setSheetOpen, editId, setEditId,
    deleteId, setDeleteId, dateRange, setDateRange,
    tz, setTz, handleCreate, handleEdit,
  } = useEntityPage({
    queryKeyPrefix: queryKeys.offerSources.all,
    listEndpoint: '/data/offersource/find/byStatus/',
    groupBy: 'Third Parties: Offer Source',
    archiveListFilter: 'status',
    mapListToEntities: (items) => offerSourcesToListEntities(items as OfferSource[]),
  })

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()
  const archiveMutation = useArchiveOfferSource()
  const cloneMutation = useCloneOfferSource()

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!isLoading && filtered.length === 0) {
        setTableForChooser(null)
      } else {
        setTableForChooser(tableRef.current)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [isLoading, filtered.length])

  const pinnedBottomRows = useMemo(
    () => {
      if (filtered.length === 0) return undefined
      const row = buildTotalsRow(totalsCells)
      return row ? [row as OfferSourceGridRow] : undefined
    },
    [totalsCells, filtered.length],
  )

  const handleSubmit = (data: OfferSourceFormData) => {
    saveMutation.mutate({ offerSource: data, isCreate: !editId }, {
      onSuccess: () => {
        toast.success(editId ? 'Offer source updated' : 'Offer source created')
        setSheetOpen(false)
        setEditId(null)
        reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success('Deleted'); setDeleteId(null); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const statCols = useMemo(
    () => buildColumnsFromReport<OfferSourceGridRow>(reportColumns, { hideScopes: new Set(['lander']) }),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const hideRowActions = useCallback((row: OfferSourceGridRow) => row.id === '__totals__', [])

  const cloneMutate = cloneMutation.mutate
  const handleCloneOfferSource = useCallback((id: string) => {
    cloneMutate(id, {
      onSuccess: () => { toast.success('Offer source cloned'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneMutate, toast, reload])

  const archiveMutate = archiveMutation.mutate
  const handleArchiveOfferSource = useCallback((id: string, archive: boolean) => {
    archiveMutate({ ids: [id], archive }, {
      onSuccess: () => { toast.success(archive ? 'Archived' : 'Restored'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [archiveMutate, toast, reload])

  const columnDefs = useMemo<ColumnDef<OfferSourceGridRow, unknown>[]>(() => [
    selectionColumn<OfferSourceGridRow>(),
    nameColumn<OfferSourceGridRow>(),
    editBtnColumn<OfferSourceGridRow>((row) => handleEdit(row.id), { hidden: hideRowActions }),
    cloneBtnColumn<OfferSourceGridRow>((row) => handleCloneOfferSource(row.id), { hidden: hideRowActions }),
    archiveBtnColumn<OfferSourceGridRow>(
      (row, archive) => handleArchiveOfferSource(row.id, archive),
      {
        hidden: hideRowActions,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<OfferSourceGridRow>((row) => handleRequestDelete(row.id), { hidden: hideRowActions }),
    idColumn<OfferSourceGridRow>(),
    ...statCols,
  ], [
    statCols,
    handleEdit,
    hideRowActions,
    handleCloneOfferSource,
    handleArchiveOfferSource,
    handleRequestDelete,
  ])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    'offer-sources',
    { defaultVisibleColumnIds: defaultColIds },
  )

  const handleBulkDeselectAllOfferSources = useCallback(() => setRowSelection({}), [setRowSelection])

  const handleBulkArchiveOfferSources = useCallback(async () => {
    await api.put('/data/offersource/archive/', { ids: selectedIds, archive: true })
    toast.success('Selected offer sources archived')
    setRowSelection({})
    reload()
  }, [selectedIds, toast, reload, setRowSelection])

  const handleBulkDeleteOfferSources = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync(id)
    }
    toast.success('Selected offer sources deleted')
    setRowSelection({})
    reload()
  }, [selectedIds, deleteMutation, toast, reload, setRowSelection])

  const handleOfferSourcesDateRangeChange = useCallback((v: DateRange & { preset: string | null }) => {
    if (v.from && v.to) setDateRange({ from: v.from, to: v.to })
  }, [setDateRange])

  const handleOfferSourceFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [setSheetOpen, setEditId])

  const handleDismissOfferSourceDelete = useCallback(() => setDeleteId(null), [setDeleteId])

  return (
    <PageShell
      fillHeight
      title="Offer Sources"
      actions={<Button type="primary" onClick={handleCreate}>Add Offer Source</Button>}
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search offer sources..."
        onRefresh={reload}
        refreshLoading={isFetching}
        filters={<ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />}
        trailing={
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={handleOfferSourcesDateRangeChange}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={tableForChooser}
            storageKey="offer-sources"
            hideScopes={new Set(['lander'])}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null}
      />

      <DataTable
        data={filtered}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        tableConfigKey="offer-sources"
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        tableRef={tableRef}
        emptyMessage={search ? 'No offer sources match your search.' : 'No offer sources found.'}
        columnVisibility={gridColumnVisibility.columnVisibility}
        onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={handleBulkDeselectAllOfferSources}
        onArchive={handleBulkArchiveOfferSources}
        onDelete={handleBulkDeleteOfferSources}
      />

      <OfferSourceForm
        open={sheetOpen}
        onOpenChange={handleOfferSourceFormOpenChange}
        initialData={editId ? editSource ?? null : null}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={handleDismissOfferSourceDelete}
        title="Delete Offer Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
