import { useState, useMemo, useRef } from 'react'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, Table } from '@tanstack/react-table'
import { Upload } from 'lucide-react'
import { Button } from 'antd'
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
  archiveBtnColumn,
  deleteBtnColumn,
  buildColumnsFromReport,
} from '@/components/ui-kit/data-table'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import { useCategories, useDeletePage, useClonePage, useArchivePage, useSavePage, usePage } from '@/api/hooks'
import { useEntityGridReport, type EntityGridRow } from '@/api/hooks/useEntityGridReport'
import { PageForm } from '@/components/forms/PageForm'
import { api } from '@/api/client'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'
import { getErrorMessage } from '@/lib/utils'

type OfferGridRow = EntityGridRow & { _isCategoryHeader?: boolean } & Record<string, unknown>

interface PageMeta {
  idPage: string
  categoryId?: string
  isArchived?: boolean
}

const META_PARAMS = { pageType: 'offer' }

export function OffersPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<OfferGridRow> | null>(null)
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
    isLoading,
    reload,
  } = useEntityGridReport<PageMeta>({
    groupBy: 'Element: Offer',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metaEndpoint: '/data/page/list/',
    metaParams: META_PARAMS,
    metaIdKey: 'idPage',
  })

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories ?? []) map.set(c.idCategory, c.name)
    return map
  }, [categories])

  const filtered = useMemo((): OfferGridRow[] => {
    const searchText = search.toLowerCase()
    const base = rows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || metaById[row.id]?.categoryId === selectedCategoryId
      const meta = metaById[row.id]
      const matchesArchive =
        archiveStatus === 'all' ||
        (archiveStatus === 'archived' ? meta?.isArchived === true : meta?.isArchived !== true)
      return matchesSearch && matchesCategory && matchesArchive
    })

    // Group by category
    const grouped = new Map<string, EntityGridRow[]>()
    for (const row of base) {
      const catId = metaById[row.id]?.categoryId ?? ''
      const catName = catId ? (categoryMap.get(catId) ?? 'Unknown') : 'Uncategorized'
      if (!grouped.has(catName)) grouped.set(catName, [])
      grouped.get(catName)!.push(row)
    }

    // If only one group or no categories, return flat
    if (grouped.size <= 1) return base as OfferGridRow[]

    // Insert header rows
    const result: OfferGridRow[] = []
    for (const [catName, catRows] of grouped) {
      result.push({ id: `cat-${catName}`, name: catName, cells: [], _isCategoryHeader: true })
      result.push(...(catRows as OfferGridRow[]))
    }
    return result
  }, [archiveStatus, metaById, rows, search, selectedCategoryId, categoryMap])

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: PageFormData) => {
    saveMutation.mutate(data as Partial<Page>, {
      onSuccess: () => {
        toast.success(data.idPage ? 'Offer updated' : 'Offer created')
        setSheetOpen(false)
        setEditId(null)
        reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleClone = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Offer cloned'); reload() },
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
        pageType: 'offer',
        pageName: row.pageName ?? row.name ?? '',
        url: row.url ?? '',
        redirectType: row.redirectType ?? '307',
        tags: row.tags ? row.tags.split('|').map((tag) => tag.trim()).filter(Boolean) : [],
        notes: row.notes ?? '',
        offerParams: {
          idOfferSource: row.idOfferSource ?? '',
          payout: Number(row.payout ?? 0),
        },
      })
    }
    toast.success('CSV import complete')
    reload()
  }

  const statCols = useMemo(
    () => buildColumnsFromReport<OfferGridRow>(columns),
    [columns],
  )

  const columnDefs = useMemo<ColumnDef<OfferGridRow, unknown>[]>(() => [
    selectionColumn<OfferGridRow>(),
    nameColumn<OfferGridRow>({
      cellContent: (row) => {
        if (row._isCategoryHeader) {
          return <span className="font-semibold text-muted-foreground uppercase text-xs">{row.name}</span>
        }
        return <span className="truncate">{row.name}</span>
      },
    }),
    editBtnColumn<OfferGridRow>((row) => handleEdit(row.id), { hidden: (row) => !!row._isCategoryHeader }),
    cloneBtnColumn<OfferGridRow>((row) => handleClone(row.id), { hidden: (row) => !!row._isCategoryHeader }),
    archiveBtnColumn<OfferGridRow>((row) => handleArchive(row.id, true), { hidden: (row) => !!row._isCategoryHeader }),
    deleteBtnColumn<OfferGridRow>((row) => setDeleteId(row.id), { hidden: (row) => !!row._isCategoryHeader }),
    idColumn<OfferGridRow>(),
    ...statCols,
  ], [statCols])

  return (
    <PageShell
      fillHeight
      title="Offers"
      actions={
        <>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button type="primary" onClick={handleCreate}>Add Offer</Button>
        </>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search offers..."
        filters={
          <>
            <ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />
            <CategoryManager
              entityType="page"
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
        actions={tableRef.current ? <ColumnChooser columns={columnDefs} table={tableRef.current} storageKey="offers" /> : null}
      />

      <DataTable
        data={filtered}
        columns={columnDefs}
        loading={isLoading}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => !row.original._isCategoryHeader}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        rowClassName={(row) => row._isCategoryHeader ? 'dt-row--depth-1' : undefined}
        tableRef={tableRef}
        emptyMessage={search || selectedCategoryId ? 'No offers match your filters.' : 'No offers found.'}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setRowSelection({})}
        onArchive={async () => {
          for (const id of selectedIds) {
            await archiveMutation.mutateAsync({ id, archive: true })
          }
          toast.success('Selected offers archived')
          setRowSelection({})
          reload()
        }}
        onDelete={async () => {
          for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id)
          }
          toast.success('Selected offers deleted')
          setRowSelection({})
          reload()
        }}
        onMoveToCategory={{
          categories: categories ?? [],
          onMove: async (idCategory) => {
            await api.post('/data/page/category/assign/', {
              pageIds: selectedIds,
              categoryId: idCategory,
            })
            toast.success('Selected offers moved')
            reload()
          },
        }}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Offers"
        description="Upload a CSV file, map the columns, then import the rows."
        fieldOptions={[
          { value: 'pageName', label: 'Name' },
          { value: 'url', label: 'URL' },
          { value: 'redirectType', label: 'Redirect Type' },
          { value: 'idOfferSource', label: 'Offer Source ID' },
          { value: 'payout', label: 'Payout' },
          { value: 'tags', label: 'Tags' },
          { value: 'notes', label: 'Notes' },
        ]}
        onImport={handleImport}
      />

      <PageForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        pageType="offer"
        initialData={editId ? editPage : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title="Delete Offer"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />
    </PageShell>
  )
}
