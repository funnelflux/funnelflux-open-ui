import { useMemo, useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui-kit'
import type { ColumnDef, Table } from '@tanstack/react-table'
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
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { useCategories, useSaveTrafficSource, useDeleteTrafficSource, useCloneTrafficSource, useTrafficSource } from '@/api/hooks'
import { buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { useEntityPage } from '@/hooks/useEntityPage'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import { api } from '@/api/client'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import { getErrorMessage } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'

type TrafficSourceGridRow = EntityGridRow & Record<string, unknown>

export function TrafficSourcesPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<TrafficSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<TrafficSourceGridRow> | null>(null)

  const {
    filtered, reportColumns, totalsCells, isLoading, refetch: reload,
    search, setSearch, archiveStatus, setArchiveStatus,
    selectedCategoryId, setSelectedCategoryId,
    rowSelection, setRowSelection, selectedIds,
    sheetOpen, setSheetOpen, editId, setEditId,
    deleteId, setDeleteId, dateRange, setDateRange,
    tz, setTz, handleCreate, handleEdit,
  } = useEntityPage({
    entityKey: 'traffic-sources',
    listEndpoint: '/data/trafficsource/list/',
    groupBy: 'Third Parties: Traffic Source',
  })

  const { data: categories } = useCategories('trafficsource')
  const { data: editSource } = useTrafficSource(editId ?? '')
  const saveMutation = useSaveTrafficSource()
  const deleteMutation = useDeleteTrafficSource()
  const cloneMutation = useCloneTrafficSource()

  const pinnedBottomRows = useMemo(
    () => {
      if (filtered.length === 0) return undefined
      const row = buildTotalsRow(totalsCells)
      return row ? [row as TrafficSourceGridRow] : undefined
    },
    [totalsCells, filtered.length],
  )

  const handleSubmit = (data: TrafficSourceFormData) => {
    saveMutation.mutate({
      trafficSource: data as unknown as Partial<TrafficSource>,
      isCreate: !editId,
    }, {
      onSuccess: () => {
        toast.success(editId ? 'Traffic source updated' : 'Traffic source created')
        setSheetOpen(false)
        setEditId(null)
        reload()
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
      onSuccess: () => { toast.success('Deleted'); setDeleteId(null); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const isDefaultSource = (row: TrafficSourceGridRow) => row.id === '1'
  const hideActions = (row: TrafficSourceGridRow) => isDefaultSource(row) || row.id === '__totals__'

  const statCols = useMemo(
    () => buildColumnsFromReport<TrafficSourceGridRow>(reportColumns),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const columnDefs = useMemo<ColumnDef<TrafficSourceGridRow, unknown>[]>(() => [
    selectionColumn<TrafficSourceGridRow>(),
    nameColumn<TrafficSourceGridRow>(),
    editBtnColumn<TrafficSourceGridRow>((row) => handleEdit(row.id), { hidden: hideActions }),
    cloneBtnColumn<TrafficSourceGridRow>((row) => handleClone(row.id), { hidden: hideActions }),
    deleteBtnColumn<TrafficSourceGridRow>((row) => handleRequestDelete(row.id), { hidden: hideActions }),
    idColumn<TrafficSourceGridRow>(),
    ...statCols,
  ], [statCols, handleEdit, handleClone, handleRequestDelete])

  const handleBulkDeselectAllTrafficSources = useCallback(() => setRowSelection({}), [])

  const handleBulkArchiveTrafficSources = useCallback(async () => {
    await api.put('/data/trafficsource/archive/', { ids: selectedIds, archive: true })
    toast.success('Selected traffic sources archived')
    setRowSelection({})
    reload()
  }, [selectedIds, toast, reload])

  const handleBulkDeleteTrafficSources = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync(id)
    }
    toast.success('Selected traffic sources deleted')
    setRowSelection({})
    reload()
  }, [selectedIds, deleteMutation, toast, reload])

  const handleBulkAssignTrafficSourceCategory = useCallback(async (idCategory: string) => {
    await api.put('/data/trafficsource/category/assign/', {
      trafficSourceIds: selectedIds,
      idCategory,
    })
    toast.success('Selected traffic sources moved')
    reload()
  }, [selectedIds, toast, reload])

  const trafficSourcesBulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignTrafficSourceCategory,
    }),
    [categories, handleBulkAssignTrafficSourceCategory],
  )

  const handleTrafficSourcesDateRangeChange = useCallback((v: DateRange & { preset: string | null }) => {
    if (v.from && v.to) setDateRange({ from: v.from, to: v.to })
  }, [])

  const handleTrafficSourceFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [])

  const handleDismissTrafficSourceDelete = useCallback(() => setDeleteId(null), [])

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
              onChange={handleTrafficSourcesDateRangeChange}
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
        tableConfigKey="traffic-sources"
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
        onDeselectAll={handleBulkDeselectAllTrafficSources}
        onArchive={handleBulkArchiveTrafficSources}
        onDelete={handleBulkDeleteTrafficSources}
        onMoveToCategory={trafficSourcesBulkMoveToCategory}
      />

      <TrafficSourceForm
        open={sheetOpen}
        onOpenChange={handleTrafficSourceFormOpenChange}
        initialData={editId ? editSource : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={handleDismissTrafficSourceDelete}
        title="Delete Traffic Source"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
