import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import { type ColumnDef, type RowSelectionState } from '@tanstack/react-table'
import { Archive, Copy, Pencil, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { SearchInput } from '@/components/shared/SearchInput'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import { useToast } from '@/components/shared/Toaster'
import { useCategories, useDeletePage, useClonePage, useArchivePage } from '@/api/hooks'
import { useEntityPaginatedReport, type EntityRow } from '@/api/hooks/useEntityPaginatedReport'
import { PageForm } from '@/components/forms/PageForm'
import { api } from '@/api/client'
import type { ReportCell } from '@/types/stats'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'
import { useSavePage, usePage } from '@/api/hooks'
import { getErrorMessage } from '@/lib/utils'

function cellFmt(cell?: ReportCell): string {
  return cell?.formatted ?? ''
}
function cellRaw(cell?: ReportCell): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
}

interface PageMeta {
  idPage: string
  categoryId?: string
  isArchived?: boolean
}

const META_PARAMS = { pageType: 'lander' }

export function LandersPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const { data: categories } = useCategories('page')
  const { data: editPage } = usePage(editId ?? '')
  const saveMutation = useSavePage()
  const deleteMutation = useDeletePage()
  const cloneMutation = useClonePage()
  const archiveMutation = useArchivePage()

  const {
    rows,
    columns,
    metaById,
    totalRows,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    isLoading,
    reload,
  } = useEntityPaginatedReport<PageMeta>({
    groupBy: 'Element: Lander',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metaEndpoint: '/data/page/list/',
    metaParams: META_PARAMS,
    metaIdKey: 'idPage',
  })

  const colMap = useMemo(() => {
    const m = new Map<string, number>()
    columns.forEach((c, i) => m.set(c.name, i))
    return m
  }, [columns])

  // Client-side filtering on the current page of results
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

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  )

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: PageFormData) => {
    saveMutation.mutate(data as Partial<Page>, {
      onSuccess: () => {
        toast.success(data.idPage ? 'Lander updated' : 'Lander created')
        setSheetOpen(false)
        setEditId(null)
        reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleClone = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Lander cloned'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleArchive = (id: string, archive: boolean) => {
    archiveMutation.mutate({ id, archive }, {
      onSuccess: () => { toast.success(archive ? 'Archived' : 'Restored'); reload() },
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

  const handleImport = async (importRows: Record<string, string>[]) => {
    for (const row of importRows) {
      await api.post('/data/page/save/', {
        pageType: 'lander',
        pageName: row.pageName ?? row.name ?? '',
        url: row.url ?? '',
        redirectType: row.redirectType ?? '307',
        tags: row.tags ? row.tags.split('|').map((tag) => tag.trim()).filter(Boolean) : [],
        notes: row.notes ?? '',
      })
    }
    toast.success('CSV import complete')
    reload()
  }

  const iVisits = colMap.get('Entrances') ?? 1
  const iClicks = colMap.get('Lander Clicks') ?? 6
  const iCTR = colMap.get('Lander CTR') ?? 7
  const iConv = colMap.get('Conv.') ?? 17
  const iRevenue = colMap.get('Revenue') ?? 28
  const iCost = colMap.get('Cost') ?? 31
  const iPL = colMap.get('P/L') ?? 32
  const iROI = colMap.get('ROI') ?? 33

  const tableCols: ColumnDef<EntityRow>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (r) => r.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'visits',
      header: 'Visits',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iVisits]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iVisits])}</span>,
    },
    {
      id: 'clicks',
      header: 'Clicks',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iClicks]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iClicks])}</span>,
    },
    {
      id: 'ctr',
      header: 'CTR',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iCTR]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCTR])}</span>,
    },
    {
      id: 'conv',
      header: 'Conv',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iConv]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iConv])}</span>,
    },
    {
      id: 'revenue',
      header: 'Revenue',
      size: 90,
      accessorFn: (r) => cellRaw(r.cells[iRevenue]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iRevenue])}</span>,
    },
    {
      id: 'cost',
      header: 'Cost',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iCost]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCost])}</span>,
    },
    {
      id: 'pl',
      header: 'P/L',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iPL]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iPL])
        return (
          <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>
            {cellFmt(row.original.cells[iPL])}
          </span>
        )
      },
    },
    {
      id: 'roi',
      header: 'ROI',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iROI]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iROI])
        return (
          <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>
            {cellFmt(row.original.cells[iROI])}
          </span>
        )
      },
    },
    {
      id: 'id',
      header: 'ID',
      size: 160,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      id: 'actions',
      size: 50,
      cell: ({ row }) => (
        <RowActionsMenu
          actions={[
            { label: 'Edit', icon: Pencil, onClick: () => handleEdit(row.original.id) },
            { label: 'Clone', icon: Copy, onClick: () => handleClone(row.original.id) },
            { label: 'Archive', icon: Archive, onClick: () => handleArchive(row.original.id, true) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeleteId(row.original.id), destructive: true },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Landers">
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportOpen(true)} size="sm" variant="outline">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button onClick={handleCreate} size="sm">Add Lander</Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search landers..." className="w-64" />
        <ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />
        <CategoryManager
          entityType="page"
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to, preset: null }}
          timezone={tz}
          onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
        />
        <TimezoneSelector value={tz} onChange={setTz} />
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState message={search || selectedCategoryId ? 'No landers match your filters.' : 'No landers found.'} />
      ) : (
        <DataTable
          columns={tableCols}
          data={filtered}
          isLoading={isLoading}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          sorting={sorting}
          onSortingChange={onSortingChange}
          manualPagination
          manualSorting
          getRowId={(r) => r.id}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      )}

      <BulkActionsBar
        count={selectedIds.length}
        categories={categories}
        onSelectAll={() => setRowSelection(Object.fromEntries(filtered.map((row) => [row.id, true])))}
        onDeselectAll={() => setRowSelection({})}
        onArchive={async () => {
          for (const id of selectedIds) {
            await archiveMutation.mutateAsync({ id, archive: true })
          }
          toast.success('Selected landers archived')
          setRowSelection({})
          reload()
        }}
        onDelete={async () => {
          for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id)
          }
          toast.success('Selected landers deleted')
          setRowSelection({})
          reload()
        }}
        onMoveToCategory={async (idCategory) => {
          await api.post('/data/page/category/assign/', {
            pageIds: selectedIds,
            categoryId: idCategory,
          })
          toast.success('Selected landers moved')
          reload()
        }}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Landers"
        description="Upload a CSV file, map the columns, then import the rows."
        fieldOptions={[
          { value: 'pageName', label: 'Name' },
          { value: 'url', label: 'URL' },
          { value: 'redirectType', label: 'Redirect Type' },
          { value: 'tags', label: 'Tags' },
          { value: 'notes', label: 'Notes' },
        ]}
        onImport={handleImport}
      />

      <PageForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        pageType="lander"
        initialData={editId ? editPage : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Lander"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
