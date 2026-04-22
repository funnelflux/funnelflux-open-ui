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
  useOfferSource,
} from '@/api/hooks'
import { buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { useEntityPage } from '@/hooks/useEntityPage'
import { OfferSourceForm } from '@/components/forms/OfferSourceForm'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import { getErrorMessage } from '@/lib/utils'

type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

export function OfferSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)

  const {
    filtered, reportColumns, totalsCells, isLoading, refetch: reload,
    search, setSearch, archiveStatus, setArchiveStatus,
    rowSelection, setRowSelection, selectedIds,
    sheetOpen, setSheetOpen, editId, setEditId,
    deleteId, setDeleteId, dateRange, setDateRange,
    tz, setTz, handleCreate, handleEdit,
  } = useEntityPage({
    entityKey: 'offer-sources',
    listEndpoint: '/data/offersource/list/',
    groupBy: 'Third Parties: Offer Source',
  })

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()

  const pinnedBottomRows = useMemo(
    () => {
      const row = buildTotalsRow(totalsCells)
      return row ? [row as OfferSourceGridRow] : undefined
    },
    [totalsCells],
  )

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
    () => buildColumnsFromReport<OfferSourceGridRow>(reportColumns),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const columnDefs = useMemo<ColumnDef<OfferSourceGridRow, unknown>[]>(() => [
    selectionColumn<OfferSourceGridRow>(),
    nameColumn<OfferSourceGridRow>(),
    editBtnColumn<OfferSourceGridRow>((row) => handleEdit(row.id)),
    deleteBtnColumn<OfferSourceGridRow>((row) => handleRequestDelete(row.id)),
    idColumn<OfferSourceGridRow>(),
    ...statCols,
  ], [statCols, handleEdit, handleRequestDelete])

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
        filters={<ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />}
        trailing={
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableForChooser ? <ColumnChooser columns={columnDefs} table={tableForChooser} storageKey="offer-sources" /> : null}
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
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setRowSelection({})}
        onDelete={async () => {
          for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id)
          }
          toast.success('Selected offer sources deleted')
          setRowSelection({})
          reload()
        }}
      />

      <OfferSourceForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editSource ?? null : null}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Offer Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
