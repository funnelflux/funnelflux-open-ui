import { useState, useMemo, useEffect, useRef } from 'react'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, Table } from '@tanstack/react-table'
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
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import {
  useSaveOfferSource,
  useDeleteOfferSource,
  useOfferSource,
} from '@/api/hooks'
import { useOfferSourceGridStore, buildMergedRows, buildTotalsRow, type EntityGridRow } from '@/store/entityGrid'
import { OfferSourceForm } from '@/components/forms/OfferSourceForm'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import { getErrorMessage } from '@/lib/utils'

type OfferSourceGridRow = EntityGridRow & Record<string, unknown>

export function OfferSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<OfferSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<OfferSourceGridRow> | null>(null)
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const { data: editSource } = useOfferSource(editId ?? '')
  const saveMutation = useSaveOfferSource()
  const deleteMutation = useDeleteOfferSource()

  const {
    entities,
    statsById,
    reportColumns,
    totalsCells,
    isLoading,
    fetchAll,
    reload,
    upsertEntity,
    removeEntity,
  } = useOfferSourceGridStore()

  useEffect(() => {
    fetchAll({ dateFrom: dateRange.from, dateTo: dateRange.to, timezone: tz })
  }, [dateRange.from, dateRange.to, tz, fetchAll])

  const mergedRows = useMemo(
    () => buildMergedRows(entities, statsById, reportColumns),
    [entities, statsById, reportColumns],
  )

  const pinnedBottomRows = useMemo(
    () => {
      const row = buildTotalsRow(totalsCells)
      return row ? [row as OfferSourceGridRow] : undefined
    },
    [totalsCells],
  )

  const filtered = useMemo((): OfferSourceGridRow[] => {
    const searchText = search.toLowerCase()
    return mergedRows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
      return matchesSearch && matchesArchive
    }) as OfferSourceGridRow[]
  }, [archiveStatus, mergedRows, search])

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

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }

  const handleSubmit = (data: OfferSourceFormData) => {
    saveMutation.mutate(data, {
      onSuccess: () => {
        toast.success(editId ? 'Offer source updated' : 'Offer source created')
        setSheetOpen(false)
        if (editId) {
          upsertEntity({ id: editId, name: data.offerSourceName })
        } else {
          reload()
        }
        setEditId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success('Deleted'); setDeleteId(null); removeEntity(deleteId) },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const statCols = useMemo(
    () => buildColumnsFromReport<OfferSourceGridRow>(reportColumns),
    [reportColumns],
  )

  const columnDefs = useMemo<ColumnDef<OfferSourceGridRow, unknown>[]>(() => [
    selectionColumn<OfferSourceGridRow>(),
    nameColumn<OfferSourceGridRow>(),
    editBtnColumn<OfferSourceGridRow>((row) => { setEditId(row.id); setSheetOpen(true) }),
    deleteBtnColumn<OfferSourceGridRow>((row) => setDeleteId(row.id)),
    idColumn<OfferSourceGridRow>(),
    ...statCols,
  ], [statCols])

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
