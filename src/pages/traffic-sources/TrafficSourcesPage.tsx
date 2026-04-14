import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { subDays } from 'date-fns'
import { Button } from '@/components/ui-kit'
import type { ColumnDef, RowSelectionState, Table } from '@tanstack/react-table'
import {
  ConfirmModal,
  TimezoneSelect,
  useToastApi,
  PageShell,
  SearchToolbar,
  DataTable,
} from '@/components/ui-kit'
import {
  nameColumn,
  idColumn,
  selectionColumn,
  editBtnColumn,
  cloneBtnColumn,
  deleteBtnColumn,
  buildColumnsFromReport,
  entityRowId,
} from '@/components/ui-kit/data-table'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import { useArchiveTrafficSource, useCategories, useSaveTrafficSource, useDeleteTrafficSource, useCloneTrafficSource, useTrafficSource } from '@/api/hooks'
import { useTrafficSourceGridStore, buildMergedRows, buildTotalsRow, type EntityGridRow } from '@/store/entityGrid'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import { api } from '@/api/client'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import { getErrorMessage } from '@/lib/utils'

type TrafficSourceGridRow = EntityGridRow & Record<string, unknown>

export function TrafficSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<TrafficSourceGridRow> | null>(null)
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [tableForChooser, setTableForChooser] = useState<Table<TrafficSourceGridRow> | null>(null)
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection])

  const { data: categories } = useCategories('trafficsource')
  const { data: editSource } = useTrafficSource(editId ?? '')
  const saveMutation = useSaveTrafficSource()
  const deleteMutation = useDeleteTrafficSource()
  const cloneMutation = useCloneTrafficSource()
  const archiveMutation = useArchiveTrafficSource()

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
  } = useTrafficSourceGridStore()

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
      return row ? [row as TrafficSourceGridRow] : undefined
    },
    [totalsCells],
  )

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    return mergedRows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? row.isArchived === true : row.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })
  }, [archiveStatus, mergedRows, search, selectedCategoryId])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }

  const handleEdit = useCallback((id: string) => { setEditId(id); setSheetOpen(true) }, [])

  const handleSubmit = (data: TrafficSourceFormData) => {
    saveMutation.mutate({
      trafficSource: data as unknown as Partial<TrafficSource>,
      isCreate: !editId,
    }, {
      onSuccess: () => {
        toast.success(editId ? 'Traffic source updated' : 'Traffic source created')
        setSheetOpen(false)
        if (editId) {
          upsertEntity({ id: editId, name: data.trafficSourceName })
        } else {
          reload()
        }
        setEditId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback((id: string) => {
    cloneMutate(id, {
      onSuccess: () => { toast.success('Traffic source cloned'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneMutate, toast, reload])

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success('Deleted'); setDeleteId(null); removeEntity(deleteId) },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const isDefaultSource = (row: TrafficSourceGridRow) => row.id === '1'

  const statCols = useMemo(
    () => buildColumnsFromReport<TrafficSourceGridRow>(reportColumns),
    [reportColumns],
  )

  const columnDefs = useMemo<ColumnDef<TrafficSourceGridRow, unknown>[]>(() => [
    selectionColumn<TrafficSourceGridRow>(),
    nameColumn<TrafficSourceGridRow>(),
    editBtnColumn<TrafficSourceGridRow>((row) => handleEdit(row.id), { hidden: isDefaultSource }),
    cloneBtnColumn<TrafficSourceGridRow>((row) => handleClone(row.id), { hidden: isDefaultSource }),
    deleteBtnColumn<TrafficSourceGridRow>((row) => setDeleteId(row.id), { hidden: isDefaultSource }),
    idColumn<TrafficSourceGridRow>(),
    ...statCols,
  ], [statCols, handleEdit, handleClone])

  return (
    <PageShell
      fillHeight
      title="Traffic Sources"
      actions={<Button type="primary" onClick={handleCreate}>Add Traffic Source</Button>}
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search traffic sources..."
        filters={
          <>
            <ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />
            <CategoryManager
              entityType="trafficsource"
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />
          </>
        }
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
        actions={tableForChooser ? <ColumnChooser columns={columnDefs} table={tableForChooser} storageKey="traffic-sources" /> : null}
      />

      <DataTable
        data={filtered as TrafficSourceGridRow[]}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        tableRef={tableRef}
        onTableInstance={setTableForChooser}
        emptyMessage={search || selectedCategoryId ? 'No traffic sources match your filters.' : 'No traffic sources found.'}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setRowSelection({})}
        onArchive={async () => {
          await archiveMutation.mutateAsync({ id: selectedIds.join(','), archive: true })
          toast.success('Selected traffic sources archived')
          setRowSelection({})
          reload()
        }}
        onDelete={async () => {
          for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id)
          }
          toast.success('Selected traffic sources deleted')
          setRowSelection({})
          reload()
        }}
        onMoveToCategory={{
          categories: categories ?? [],
          onMove: async (idCategory) => {
            await api.put('/data/trafficsource/category/assign/', {
              trafficSourceIds: selectedIds,
              idCategory,
            })
            toast.success('Selected traffic sources moved')
            reload()
          },
        }}
      />

      <TrafficSourceForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editSource : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Traffic Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
