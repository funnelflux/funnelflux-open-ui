import { useCallback, useMemo, useRef, useState } from 'react'
import type { ColumnDef, RowSelectionState, Table, Updater } from '@tanstack/react-table'
import { Button, ConfirmModal, DataTable, Input, Modal, PageShell, SearchToolbar, TimezoneSelect, useToastApi, type PageShellBodyState } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { CsvImportDialog } from '@/components/shared/CsvImportDialog'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle, type ArchiveStatus } from '@/components/shared/ArchiveToggle'
import {
  archiveBtnColumn,
  buildColumnsFromReport,
  cloneBtnColumn,
  deleteBtnColumn,
  editBtnColumn,
  entityRowId,
  idColumn,
  nameColumn,
  selectionColumn,
} from '@/components/ui-kit/data-table'
import { useArchivePage, useAssignPagesToCategory, useBulkDeletePages, useCategories, useClonePage, useDeleteCategory, useDeletePage, useImportPagesFromCsv, usePage, useSaveCategory, useSavePage } from '@/api/hooks'
import { useEntityGrid, buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { queryKeys } from '@/api/queryKeys'
import { pagesToListEntities } from '@/lib/entityGridUtils'
import { mapStatColsForCategoryStrip } from '@/lib/categoryStripTable'
import {
  categoryKeyFromStripRowId,
  deletableCategoryStripRowIds,
  entityRowIdsFromSelection,
  syncCategoryStripRowSelection,
} from '@/lib/categoryStripSelection'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { useEntityGridColumnVisibility } from '@/lib/entityGridColumnVisibility'
import { visibleMetricColumnIdsFromHidden } from '@/lib/drilldownMetrics'
import { useCategoryStripTableFlow } from '@/hooks/useCategoryStripTableFlow'
import { selectedRowIds, getErrorMessage } from '@/lib/utils'
import { PageForm } from '@/components/forms/PageForm'
import type { DateRange } from '@/lib/date-presets'
import type { Page } from '@/types/entities'
import type { PageFormData } from '@/schemas/page'

const PAGE_CATEGORY_ENTITY = 'page' as const

type PageGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  _categoryId?: string
} & Record<string, unknown>

const canSelectRow = (row: { original: PageGridRow }) => row.original.id !== '__totals__'
const categoryRowClassName = (row: PageGridRow) =>
  row._isCategoryHeader ? 'dt-row--category-strip' : undefined

interface CsvFieldOption {
  value: string
  label: string
}

interface PageEntitiesPageProps {
  pageType: 'offer' | 'lander'
  tableConfigKey: 'offers' | 'landers'
  title: string
  singularLabel: string
  groupBy: string
  hideScope: 'offer' | 'lander'
  csvFieldOptions: CsvFieldOption[]
  buildImportPayload: (row: Record<string, string>) => Record<string, unknown>
}

/**
 * Landers/offers lists with category strip, CSV import, and extended bulk actions.
 * Bespoke layout per the escape hatch in `src/lib/entity-page/config.ts` (not the simple `EntityPage` runner).
 */
export function PageEntitiesPage({
  pageType,
  tableConfigKey,
  title,
  singularLabel,
  groupBy,
  hideScope,
  csvFieldOptions,
  buildImportPayload,
}: PageEntitiesPageProps) {
  const toast = useToastApi()
  const singularLower = singularLabel.toLowerCase()
  const pluralLower = `${singularLower}s`
  const tableRef = useRef<Table<PageGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<PageGridRow> | null>(null)
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
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
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
  const bulkDeletePagesMutation = useBulkDeletePages()
  const importPagesCsvMutation = useImportPagesFromCsv()
  const assignPagesCategoryMutation = useAssignPagesToCategory()

  const listParams = useMemo(
    () => ({ pageType, status: archiveStatus } as const),
    [pageType, archiveStatus],
  )
  const hideScopes = useMemo(() => new Set([hideScope]), [hideScope])
  const metricColumnIds = visibleMetricColumnIdsFromHidden(tableConfigKey, {
    defaultVisibleColumnIds: defaultColIds,
    hideScopes,
  })

  const {
    mergedRows,
    reportColumns,
    totalsCells,
    isLoading,
    isFetching,
    refetch: reload,
    error: gridError,
  } = useEntityGrid({
    queryKeyPrefix: queryKeys.pages.all,
    listEndpoint: '/data/page/find/byStatus/',
    listParams,
    groupBy,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    mapListToEntities: (items) => pagesToListEntities(items as Page[]),
    metricColumnIds,
  })

  const {
    listFiltered,
    hasMetricRows,
    pageRows,
    pageCount,
    totalDataCount,
    pagination,
    setPagination,
    effectiveSorting,
    handleSortingChange,
  } = useCategoryStripTableFlow<PageGridRow>({
    tableConfigKey,
    rows: mergedRows as PageGridRow[],
    reportColumns,
    categories,
    search,
    selectedCategoryId,
    resetDeps: [archiveStatus],
  })

  const pinnedBottomRows = useMemo(() => {
    if (!hasMetricRows) return undefined
    const row = buildTotalsRow(totalsCells)
    return row ? [row as PageGridRow] : undefined
  }, [totalsCells, hasMetricRows])

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFiltered as PageGridRow[])
      })
    },
    [listFiltered],
  )

  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const catStrips = deletableCategoryStripRowIds(selectedIds)
    if (catStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: `Delete categories and ${pluralLower}?`,
      description: `This will delete ${entityIdsForBulk.length} ${singularLower}(s) and remove ${catStrips.length} categor${catStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk, pluralLower, singularLower])

  const handleCreate = useCallback(() => {
    setEditId(null)
    setSheetOpen(true)
  }, [])

  const handleEdit = useCallback((id: string) => {
    setEditId(id)
    setSheetOpen(true)
  }, [])

  const handleSubmit = useCallback((data: PageFormData) => {
    saveMutation.mutate(
      { page: data as Partial<Page>, isCreate: !editId },
      {
        onSuccess: () => {
          toast.success(editId ? `${singularLabel} updated` : `${singularLabel} created`)
          setSheetOpen(false)
          setEditId(null)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [saveMutation, editId, toast, singularLabel])

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback((idPage: string) => {
    const sourceRow = listFiltered.find(
      (row): row is PageGridRow => !row._isCategoryHeader && row.id === idPage,
    )
    const categoryIdFromSource =
      sourceRow?.categoryId != null && String(sourceRow.categoryId) !== ''
        ? String(sourceRow.categoryId)
        : undefined
    cloneMutate(
      { idPage, pageType, categoryId: categoryIdFromSource },
      {
        onSuccess: () => {
          toast.success(`${singularLabel} cloned`)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [cloneMutate, listFiltered, toast, singularLabel, pageType])

  const archiveMutate = archiveMutation.mutate
  const handleArchive = useCallback((id: string, archive: boolean) => {
    archiveMutate(
      { ids: [id], archive },
      {
        onSuccess: () => {
          toast.success(archive ? 'Archived' : 'Restored')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [archiveMutate, toast])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Deleted')
        setDeleteId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [deleteId, deleteMutation, toast])

  const handleImport = useCallback(async (importRows: Record<string, string>[]) => {
    try {
      const result = await importPagesCsvMutation.mutateAsync({
        rows: importRows,
        buildImportPayload,
      })
      if (result.failed.length > 0) {
        toast.warning(
          `Imported ${result.succeeded.length} row(s); ${result.failed.length} failed`,
        )
      } else {
        toast.success('CSV import complete')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [buildImportPayload, importPagesCsvMutation, toast])

  const hideCategoryStripEditDelete = useCallback((row: PageGridRow) => {
    if (!row._isCategoryHeader) return false
    return (row._categoryId ?? '') === ''
  }, [])

  const hideEditButton = useCallback((row: PageGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }, [hideCategoryStripEditDelete])

  const hideCloneArchive = useCallback((row: PageGridRow) =>
    !!row._isCategoryHeader || row.id === '__totals__'
  , [])

  const hideDeleteButton = useCallback((row: PageGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return row.id === '__totals__'
  }, [hideCategoryStripEditDelete])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<PageGridRow>(reportColumns, { hideScopes })),
    [reportColumns, hideScopes],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [])

  const openCategoryRename = useCallback((row: PageGridRow) => {
    const idCategory = row._categoryId ?? ''
    if (!idCategory) return
    setCategoryRename({ idCategory, name: row.name })
    setCategoryRenameDraft(row.name)
  }, [])

  const handleEditOrCategory = useCallback(
    (row: PageGridRow) => {
      if (row._isCategoryHeader) openCategoryRename(row)
      else handleEdit(row.id)
    },
    [handleEdit, openCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: PageGridRow) => {
      const categoryId = row._categoryId ?? ''
      if (row._isCategoryHeader) {
        if (!categoryId) return
        setCategoryDeleteId(categoryId)
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
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryRename, categoryRenameDraft, saveCategoryMutation, toast])

  const handleConfirmCategoryDelete = useCallback(() => {
    if (!categoryDeleteId) return
    deleteCategoryMutation.mutate(
      { entityType: PAGE_CATEGORY_ENTITY, idCategory: categoryDeleteId },
      {
        onSuccess: () => {
          toast.success('Category deleted')
          setCategoryDeleteId(null)
          if (selectedCategoryId === categoryDeleteId) setSelectedCategoryId('')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [categoryDeleteId, deleteCategoryMutation, toast, selectedCategoryId])

  const columnDefs = useMemo<ColumnDef<PageGridRow, unknown>[]>(() => [
    selectionColumn<PageGridRow>(),
    nameColumn<PageGridRow>({
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
    editBtnColumn<PageGridRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<PageGridRow>((row) => handleClone(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<PageGridRow>(
      (row, archive) => handleArchive(row.id, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<PageGridRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<PageGridRow>({ hideIdForRow: (row) => !!row._isCategoryHeader }),
    ...statCols,
  ], [statCols, handleEditOrCategory, handleClone, handleArchive, handleDeleteOrCategory, hideEditButton, hideCloneArchive, hideDeleteButton])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    tableConfigKey,
    { defaultVisibleColumnIds: defaultColIds, hideScopes },
  )

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [])

  const handleBulkArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync({ ids: entityIdsForBulk, archive: true })
      toast.success(`Selected ${pluralLower} archived`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [archiveMutation, entityIdsForBulk, pluralLower, toast])

  const handleBulkDelete = useCallback(async () => {
    const categoryKeys = [
      ...new Set(
        deletableCategoryStripRowIds(selectedIds)
          .map((id) => categoryKeyFromStripRowId(id))
          .filter((key): key is string => key != null && key !== ''),
      ),
    ]
    const pageResult = await bulkDeletePagesMutation.mutateAsync(entityIdsForBulk)
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({ entityType: PAGE_CATEGORY_ENTITY, idCategory })
    }
    if (pageResult.failed.length > 0) {
      toast.error(
        `${pageResult.failed.length} ${pluralLower} could not be deleted`,
      )
    } else {
      toast.success('Selected items deleted')
    }
    setRowSelection({})
  }, [
    selectedIds,
    entityIdsForBulk,
    bulkDeletePagesMutation,
    deleteCategoryMutation,
    toast,
    pluralLower,
  ])

  const handleBulkAssignCategory = useCallback(async (idCategory: string) => {
    try {
      await assignPagesCategoryMutation.mutateAsync({ pageIds: entityIdsForBulk, idCategory })
      toast.success(`Selected ${pluralLower} moved`)
      setRowSelection({})
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [assignPagesCategoryMutation, entityIdsForBulk, pluralLower, toast, setRowSelection])

  const bulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignCategory,
    }),
    [categories, handleBulkAssignCategory],
  )

  const handleDateRangeChange = useCallback((value: DateRange & { preset: string | null }) => {
    if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
  }, [])

  const handleFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [])

  const handleDismissDelete = useCallback(() => setDeleteId(null), [])

  const pageBodyState: PageShellBodyState = gridError
    ? {
        status: 'error',
        message: getErrorMessage(gridError),
        onRetry: () => void reload(),
      }
    : isLoading && mergedRows.length === 0
      ? { status: 'loading' }
      : { status: 'ready' }

  return (
    <PageShell
      fillHeight
      title={title}
      bodyState={pageBodyState}
      actions={
        <div className="flex items-center gap-2">
          <Button iconName="upload" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button type="primary" onClick={handleCreate}>{`Add ${singularLabel}`}</Button>
        </div>
      }
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={`Search ${pluralLower}...`}
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
              onChange={handleDateRangeChange}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={tableForChooser}
            storageKey={tableConfigKey}
            hideScopes={hideScopes}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null}
      />

      <DataTable<PageGridRow>
        data={pageRows}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        tableConfigKey={tableConfigKey}
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection={canSelectRow}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        rowClassName={categoryRowClassName}
        tableRef={tableRef}
        onTableInstance={setTableForChooser}
        emptyMessage={search || selectedCategoryId ? `No ${pluralLower} match your filters.` : `No ${pluralLower} found.`}
        manualPagination
        manualSorting
        sorting={effectiveSorting}
        onSortingChange={handleSortingChange}
        pageCount={pageCount}
        manualPaginationTotalRows={totalDataCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnVisibility={gridColumnVisibility.columnVisibility}
        onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={handleBulkDeselectAll}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onMoveToCategory={bulkMoveToCategory}
        deleteConfirmTitle={bulkDeleteConfirmCopy?.title}
        deleteConfirmDescription={bulkDeleteConfirmCopy?.description}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title={`Import ${title}`}
        description="Upload a CSV file, map the columns, then import the rows."
        fieldOptions={csvFieldOptions}
        onImport={handleImport}
      />

      <PageForm
        open={sheetOpen}
        onOpenChange={handleFormOpenChange}
        pageType={pageType}
        initialData={editId ? editPage : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onCancel={handleDismissDelete}
        title={`Delete ${singularLabel}`}
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
            onChange={(event) => setCategoryRenameDraft(event.target.value)}
            placeholder="Category name"
            onPressEnter={() => void handleConfirmCategoryRename()}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={!!categoryDeleteId}
        onCancel={() => setCategoryDeleteId(null)}
        title="Delete category"
        description={`Delete this category? ${title} in it will become uncategorized.`}
        onConfirm={() => void handleConfirmCategoryDelete()}
        loading={deleteCategoryMutation.isPending}
        danger
      />
    </PageShell>
  )
}
