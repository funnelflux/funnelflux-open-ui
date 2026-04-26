import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, Table, PaginationState, Updater } from '@tanstack/react-table'
import { Upload } from 'lucide-react'
import { Button, Modal, Input } from '@/components/ui-kit'
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
  entityRowId,
} from '@/components/ui-kit/data-table'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import {
  useCategories,
  useDeletePage,
  useClonePage,
  useArchivePage,
  useSavePage,
  usePage,
  useSaveCategory,
  useDeleteCategory,
} from '@/api/hooks'
import { useEntityGrid, buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { pagesToListEntities } from '@/lib/entityGridUtils'
import { PageForm } from '@/components/forms/PageForm'
import { api } from '@/api/client'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import { paginateCategorySegments } from '@/lib/paginateCategorySegments'
import { buildCategorySegmentsFromRows, mapStatColsForCategoryStrip } from '@/lib/categoryStripTable'
import {
  syncCategoryStripRowSelection,
  entityRowIdsFromSelection,
  deletableCategoryStripRowIds,
  categoryKeyFromStripRowId,
} from '@/lib/categoryStripSelection'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { useEntityGridColumnVisibility } from '@/lib/entityGridColumnVisibility'
import { queryKeys } from '@/api/queryKeys'

const PAGE_CATEGORY_ENTITY = 'page' as const

type LanderGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  _categoryId?: string
} & Record<string, unknown>

const canSelectRow = (row: { original: LanderGridRow }) => row.original.id !== '__totals__'
const categoryRowClassName = (row: LanderGridRow) =>
  row._isCategoryHeader ? 'dt-row--category-strip' : undefined

export function LandersPage() {
  const toast = useToastApi()
  const tableRef = useRef<Table<LanderGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<LanderGridRow> | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)
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

  const { data: categories } = useCategories(PAGE_CATEGORY_ENTITY)
  const { data: editPage } = usePage(editId ?? '')
  const saveMutation = useSavePage()
  const deleteMutation = useDeletePage()
  const cloneMutation = useClonePage()
  const archiveMutation = useArchivePage()
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()

  const landerListParams = useMemo(
    () => ({ pageType: 'lander', status: archiveStatus } as const),
    [archiveStatus],
  )

  const {
    mergedRows,
    reportColumns,
    totalsCells,
    isLoading,
    isFetching,
    refetch: reload,
  } = useEntityGrid({
    queryKeyPrefix: queryKeys.pages.all,
    listEndpoint: '/data/page/find/byStatus/',
    listParams: landerListParams,
    groupBy: 'Element: Lander',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    mapListToEntities: (items) => pagesToListEntities(items as Page[]),
  })

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories ?? []) map.set(c.idCategory, c.name)
    return map
  }, [categories])

  const listFiltered = useMemo(() => {
    const searchText = search.toLowerCase()
    return mergedRows.filter((row) => {
      const matchesSearch = !searchText || row.name.toLowerCase().includes(searchText)
      const matchesCategory = !selectedCategoryId || row.categoryId === selectedCategoryId
      return matchesSearch && matchesCategory
    })
  }, [mergedRows, search, selectedCategoryId])

  const segments = useMemo(
    () => buildCategorySegmentsFromRows(listFiltered as LanderGridRow[], categoryMap),
    [listFiltered, categoryMap],
  )

  const totalDataCount = useMemo(
    () => segments.reduce((n, s) => n + s.items.length, 0),
    [segments],
  )

  const pageSlice = useMemo(
    () => paginateCategorySegments(segments, pagination.pageIndex, pagination.pageSize),
    [segments, pagination.pageIndex, pagination.pageSize],
  )

  const filterResetKey = useMemo(
    () => [search, selectedCategoryId, archiveStatus].join('\0'),
    [search, selectedCategoryId, archiveStatus],
  )

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [filterResetKey])

  useEffect(() => {
    if (pagination.pageIndex > pageSlice.pageCount - 1 && pageSlice.pageCount > 0) {
      setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageSlice.pageCount - 1) }))
    }
  }, [pagination.pageIndex, pageSlice.pageCount])

  const hasMetricRows = listFiltered.length > 0

  const pinnedBottomRows = useMemo(
    () => {
      if (!hasMetricRows) return undefined
      const row = buildTotalsRow(totalsCells)
      return row ? [row as LanderGridRow] : undefined
    },
    [totalsCells, hasMetricRows],
  )

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFiltered as LanderGridRow[])
      })
    },
    [listFiltered],
  )

  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const catStrips = deletableCategoryStripRowIds(selectedIds)
    if (catStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: 'Delete categories and landers?',
      description: `This will delete ${entityIdsForBulk.length} lander(s) and remove ${catStrips.length} categor${catStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }

  const handleEdit = useCallback((id: string) => { setEditId(id); setSheetOpen(true) }, [])

  const handleSubmit = (data: PageFormData) => {
    saveMutation.mutate({ page: data as Partial<Page>, isCreate: !editId }, {
      onSuccess: () => {
        toast.success(editId ? 'Lander updated' : 'Lander created')
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
      onSuccess: () => { toast.success('Lander cloned'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneMutate, toast, reload])

  const archiveMutate = archiveMutation.mutate
  const handleArchive = useCallback((id: string, archive: boolean) => {
    archiveMutate({ id, archive }, {
      onSuccess: () => { toast.success(archive ? 'Archived' : 'Restored'); reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [archiveMutate, toast, reload])

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

  const hideCategoryStripEditDelete = (row: LanderGridRow) => {
    if (!row._isCategoryHeader) return false
    const cid = row._categoryId ?? ''
    return cid === ''
  }

  const hideEditButton = (row: LanderGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }

  const hideCloneArchive = (row: LanderGridRow) =>
    !!row._isCategoryHeader || row.id === '__totals__'

  const hideDeleteButton = (row: LanderGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }

  const statCols = useMemo(
    () =>
      mapStatColsForCategoryStrip(
        buildColumnsFromReport<LanderGridRow>(reportColumns, { hideScopes: new Set(['offer']) }),
      ),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [])

  const openCategoryRename = useCallback((row: LanderGridRow) => {
    const idCategory = row._categoryId ?? ''
    if (!idCategory) return
    setCategoryRename({ idCategory, name: row.name })
    setCategoryRenameDraft(row.name)
  }, [])

  const handleEditOrCategory = useCallback(
    (row: LanderGridRow) => {
      if (row._isCategoryHeader) openCategoryRename(row)
      else handleEdit(row.id)
    },
    [handleEdit, openCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: LanderGridRow) => {
      const cid = row._categoryId ?? ''
      if (row._isCategoryHeader) {
        if (!cid) return
        setCategoryDeleteId(cid)
        return
      }
      handleRequestDelete(row.id)
    },
    [handleRequestDelete],
  )

  const handleConfirmCategoryRename = useCallback(() => {
    if (!categoryRename) return
    const name = categoryRenameDraft.trim()
    if (!name) return
    saveCategoryMutation.mutate(
      { entityType: PAGE_CATEGORY_ENTITY, idCategory: categoryRename.idCategory, name },
      {
        onSuccess: () => {
          toast.success('Category renamed')
          setCategoryRename(null)
          reload()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryRename, categoryRenameDraft, saveCategoryMutation, toast, reload])

  const handleConfirmCategoryDelete = useCallback(() => {
    if (!categoryDeleteId) return
    deleteCategoryMutation.mutate(
      { entityType: PAGE_CATEGORY_ENTITY, idCategory: categoryDeleteId },
      {
        onSuccess: () => {
          toast.success('Category deleted')
          setCategoryDeleteId(null)
          if (selectedCategoryId === categoryDeleteId) setSelectedCategoryId('')
          reload()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [
    categoryDeleteId,
    deleteCategoryMutation,
    toast,
    selectedCategoryId,
    reload,
  ])

  const columnDefs = useMemo<ColumnDef<LanderGridRow, unknown>[]>(() => [
    selectionColumn<LanderGridRow>(),
    nameColumn<LanderGridRow>({
      cellContent: (row) => {
        if (row._isCategoryHeader) {
          return (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {row.name}
            </span>
          )
        }
        return <span className="truncate">{row.name}</span>
      },
    }),
    editBtnColumn<LanderGridRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<LanderGridRow>((row) => handleClone(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<LanderGridRow>(
      (row, archive) => handleArchive(row.id, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<LanderGridRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<LanderGridRow>({ hideIdForRow: (row) => !!row._isCategoryHeader }),
    ...statCols,
  ], [statCols, handleEditOrCategory, handleClone, handleArchive, handleDeleteOrCategory])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    'landers',
    { defaultVisibleColumnIds: defaultColIds },
  )

  const handleBulkDeselectAllLanders = useCallback(() => setRowSelection({}), [])

  const handleBulkArchiveLanders = useCallback(async () => {
    await api.put('/data/page/archive/', { ids: entityIdsForBulk, archive: true })
    toast.success('Selected landers archived')
    setRowSelection({})
    reload()
  }, [entityIdsForBulk, toast, reload])

  const handleBulkDeleteLanders = useCallback(async () => {
    const categoryKeys = [
      ...new Set(
        deletableCategoryStripRowIds(selectedIds)
          .map((id) => categoryKeyFromStripRowId(id))
          .filter((k): k is string => k != null && k !== ''),
      ),
    ]
    for (const id of entityIdsForBulk) {
      await deleteMutation.mutateAsync(id)
    }
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({ entityType: PAGE_CATEGORY_ENTITY, idCategory })
    }
    toast.success('Selected items deleted')
    setRowSelection({})
    reload()
  }, [selectedIds, entityIdsForBulk, deleteMutation, deleteCategoryMutation, toast, reload])

  const handleBulkAssignLanderCategory = useCallback(async (idCategory: string) => {
    await api.put('/data/page/category/assign/', {
      pageIds: entityIdsForBulk,
      idCategory,
    })
    toast.success('Selected landers moved')
    reload()
  }, [entityIdsForBulk, toast, reload])

  const landersBulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignLanderCategory,
    }),
    [categories, handleBulkAssignLanderCategory],
  )

  const handleLandersDateRangeChange = useCallback((v: DateRange & { preset: string | null }) => {
    if (v.from && v.to) setDateRange({ from: v.from, to: v.to })
  }, [])

  const handleOpenImportLanders = useCallback(() => setImportOpen(true), [])

  const handleLanderFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [])

  const handleDismissLanderDelete = useCallback(() => setDeleteId(null), [])

  return (
    <PageShell
      fillHeight
      title="Landers"
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenImportLanders}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button type="primary" onClick={handleCreate}>Add Lander</Button>
        </div>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search landers..."
        onRefresh={reload}
        refreshLoading={isFetching}
        filters={
          <>
            <ArchiveToggle value={archiveStatus} onChange={setArchiveStatus} />
            <CategoryManager
              entityType={PAGE_CATEGORY_ENTITY}
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
              onChange={handleLandersDateRangeChange}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={tableForChooser}
            storageKey="landers"
            hideScopes={new Set(['offer'])}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null}
      />

      <DataTable<LanderGridRow>
        data={pageSlice.pageRows}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        tableConfigKey="landers"
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection={canSelectRow}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        rowClassName={categoryRowClassName}
        tableRef={tableRef}
        onTableInstance={setTableForChooser}
        emptyMessage={search || selectedCategoryId ? 'No landers match your filters.' : 'No landers found.'}
        manualPagination
        pageCount={pageSlice.pageCount}
        manualPaginationTotalRows={totalDataCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnVisibility={gridColumnVisibility.columnVisibility}
        onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={handleBulkDeselectAllLanders}
        onArchive={handleBulkArchiveLanders}
        onDelete={handleBulkDeleteLanders}
        onMoveToCategory={landersBulkMoveToCategory}
        deleteConfirmTitle={bulkDeleteConfirmCopy?.title}
        deleteConfirmDescription={bulkDeleteConfirmCopy?.description}
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
        onOpenChange={handleLanderFormOpenChange}
        pageType="lander"
        initialData={editId ? editPage : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={handleDismissLanderDelete}
        title="Delete Lander"
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        danger
      />

      <Modal
        open={!!categoryRename}
        title="Rename category"
        onCancel={() => setCategoryRename(null)}
        onOk={() => void handleConfirmCategoryRename()}
        okText="Save"
        confirmLoading={saveCategoryMutation.isPending}
        okButtonProps={{ disabled: !categoryRenameDraft.trim() }}
        destroyOnHidden
      >
        <div className="py-4">
          <Input
            value={categoryRenameDraft}
            onChange={(e) => setCategoryRenameDraft(e.target.value)}
            placeholder="Category name"
            onPressEnter={() => void handleConfirmCategoryRename()}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!categoryDeleteId}
        onCancel={() => setCategoryDeleteId(null)}
        title="Delete category"
        description="Delete this category? Landers in it will become uncategorized."
        onConfirm={() => void handleConfirmCategoryDelete()}
        loading={deleteCategoryMutation.isPending}
        danger
      />
    </PageShell>
  )
}
