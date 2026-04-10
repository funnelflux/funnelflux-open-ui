import { useState, useMemo, useRef } from 'react'
import { subDays } from 'date-fns'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from 'antd'
import type { ColumnDef, RowSelectionState, Table } from '@tanstack/react-table'
import {
  ConfirmModal,
  EmptyState,
  TimezoneSelect,
  useToastApi,
  PageShell,
  SearchToolbar,
  DataTable,
} from '@/components/ui-kit'
import {
  nameColumn,
  visitsColumn,
  clicksColumn,
  ctrColumn,
  convColumn,
  revenueColumn,
  costColumn,
  plColumn,
  roiColumn,
  idColumn,
  selectionColumn,
} from '@/components/ui-kit/data-table'
import { InlineActions } from '@/components/shared/InlineActions'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import { useArchiveTrafficSource, useCategories, useSaveTrafficSource, useDeleteTrafficSource, useCloneTrafficSource, useTrafficSource } from '@/api/hooks'
import { useEntityGridReport, type EntityGridRow } from '@/api/hooks/useEntityGridReport'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import { api } from '@/api/client'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import { getErrorMessage } from '@/lib/utils'

interface TrafficSourceMeta {
  idTrafficSource: string
  categoryId?: string
  isArchived?: boolean
}

/** Satisfies data-table column helpers (`HasName` / `HasCells` index signatures). */
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
    rows,
    columns,
    metaById,
    isLoading,
    reload,
  } = useEntityGridReport<TrafficSourceMeta>({
    groupBy: 'Third Parties: Traffic Source',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metaEndpoint: '/data/trafficsource/list/',
    metaIdKey: 'idTrafficSource',
  })

  const colMap = useMemo(() => {
    const m = new Map<string, number>()
    columns.forEach((c, i) => m.set(c.name, i))
    return m
  }, [columns])

  const filtered = useMemo(() => {
    const searchText = search.toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || metaById[row.id]?.categoryId === selectedCategoryId
      const meta = metaById[row.id]
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? meta?.isArchived === true : meta?.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })
  }, [archiveStatus, metaById, rows, search, selectedCategoryId])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: TrafficSourceFormData) => {
    saveMutation.mutate(data as unknown as Partial<TrafficSource>, {
      onSuccess: () => {
        toast.success(editId ? 'Traffic source updated' : 'Traffic source created')
        setSheetOpen(false)
        setEditId(null)
        reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleClone = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Traffic source cloned'); reload() },
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

  const iVisits = colMap.get('Entrances') ?? 1
  const iClicks = colMap.get('Lander Clicks') ?? 6
  const iCTR = colMap.get('Lander CTR') ?? 7
  const iConv = colMap.get('Conv.') ?? 17
  const iRevenue = colMap.get('Revenue') ?? 28
  const iCost = colMap.get('Cost') ?? 31
  const iPL = colMap.get('P/L') ?? 32
  const iROI = colMap.get('ROI') ?? 33

  const columnDefs = useMemo<ColumnDef<TrafficSourceGridRow, unknown>[]>(() => [
    selectionColumn<TrafficSourceGridRow>(),
    nameColumn<TrafficSourceGridRow>({
      actions: (row) => {
        if (row.id === '1') return null
        return (
          <InlineActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => handleEdit(row.id) },
              { label: 'Clone', icon: Copy, onClick: () => handleClone(row.id) },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteId(row.id), destructive: true },
            ]}
          />
        )
      },
    }),
    idColumn<TrafficSourceGridRow>(),
    visitsColumn<TrafficSourceGridRow>(iVisits),
    clicksColumn<TrafficSourceGridRow>(iClicks),
    ctrColumn<TrafficSourceGridRow>(iCTR),
    convColumn<TrafficSourceGridRow>(iConv),
    revenueColumn<TrafficSourceGridRow>(iRevenue),
    costColumn<TrafficSourceGridRow>(iCost),
    plColumn<TrafficSourceGridRow>(iPL),
    roiColumn<TrafficSourceGridRow>(iROI),
  // Handlers omitted from deps for stable column memo; action callbacks use latest closures on click.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [iVisits, iClicks, iCTR, iConv, iRevenue, iCost, iPL, iROI])

  return (
    <PageShell
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

      {!isLoading && filtered.length === 0 ? (
        <EmptyState message={search || selectedCategoryId ? 'No traffic sources match your filters.' : 'No traffic sources found.'} />
      ) : (
        <DataTable
          data={filtered as TrafficSourceGridRow[]}
          columns={columnDefs}
          loading={isLoading}
          getRowId={(row) => row.id}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          tableRef={tableRef}
          onTableInstance={setTableForChooser}
        />
      )}

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
            await api.post('/data/trafficsource/category/assign/', {
              tsIds: selectedIds,
              categoryId: idCategory,
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
