import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type ColumnDef, type Table, type PaginationState, type Updater, type RowSelectionState, type SortingState } from '@tanstack/react-table'
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
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import {
  useCategories,
  useSaveTrafficSource,
  useDeleteTrafficSource,
  useCloneTrafficSource,
  useArchiveTrafficSource,
  useTrafficSource,
  useSaveCategory,
  useDeleteCategory,
} from '@/api/hooks'
import { buildTotalsRow, type EntityGridRow } from '@/api/hooks/useEntityGrid'
import { applyTrafficSourceArchiveToEntityGridCaches, refreshTrafficSourcesListQueries } from '@/lib/entityGridQueryCache'
import { trafficSourceListToListEntities } from '@/lib/entityGridUtils'
import { useEntityPage } from '@/hooks/useEntityPage'
import { queryKeys } from '@/api/queryKeys'
import { TrafficSourceForm } from '@/components/forms/TrafficSourceForm'
import { api } from '@/api/client'
import type { TrafficSource } from '@/types/entities'
import type { TrafficSourceFormData } from '@/schemas/trafficSource'
import { getErrorMessage } from '@/lib/utils'
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
import { sortEntityGridRows } from '@/lib/entityGridSorting'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'

type TrafficSourceGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  /** Real category id for strip rows; '' for uncategorized. */
  _categoryId?: string
} & Record<string, unknown>

const canSelectTrafficSourceRow = (row: { original: TrafficSourceGridRow }) => {
  const r = row.original
  if (r.id === '__totals__') return false
  if (r.id === '1') return false
  return true
}
const trafficCategoryRowClassName = (row: TrafficSourceGridRow) =>
  row._isCategoryHeader ? 'dt-row--category-strip' : undefined

export function TrafficSourcesPage() {
  const queryClient = useQueryClient()
  const toast = useToastApi()
  const tableRef = useRef<Table<TrafficSourceGridRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<TrafficSourceGridRow> | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const tableConfig = useTableConfigStore(selectTableConfig('traffic-sources'))
  const setSorting = useTableConfigStore((s) => s.setSorting)
  const [categoryRename, setCategoryRename] = useState<{ idCategory: string; name: string } | null>(null)
  const [categoryRenameDraft, setCategoryRenameDraft] = useState('')
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null)

  const {
    filtered: listFiltered,
    reportColumns, totalsCells, isLoading, isFetching, refetch: reload,
    search, setSearch, archiveStatus, setArchiveStatus,
    selectedCategoryId, setSelectedCategoryId,
    rowSelection, setRowSelection, selectedIds,
    sheetOpen, setSheetOpen, editId, setEditId,
    deleteId, setDeleteId, dateRange, setDateRange,
    tz, setTz, handleCreate, handleEdit,
  } = useEntityPage({
    queryKeyPrefix: queryKeys.trafficSources.all,
    listEndpoint: '/data/trafficsource/list/',
    groupBy: 'Third Parties: Traffic Source',
    archiveListFilter: 'trafficsource',
    mapListToEntities: trafficSourceListToListEntities,
  })

  const { data: categories } = useCategories('trafficsource')

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories ?? []) map.set(c.idCategory, c.name)
    return map
  }, [categories])

  const effectiveSorting = tableConfig.sorting.length > 0 ? tableConfig.sorting : DEFAULT_TABLE_SORTING
  const sortedListFiltered = useMemo(
    () => sortEntityGridRows(listFiltered as TrafficSourceGridRow[], reportColumns, effectiveSorting),
    [listFiltered, reportColumns, effectiveSorting],
  )

  const segments = useMemo(
    () => buildCategorySegmentsFromRows(sortedListFiltered, categoryMap),
    [sortedListFiltered, categoryMap],
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
    queueMicrotask(() => {
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    })
  }, [filterResetKey])

  useEffect(() => {
    if (pagination.pageIndex > pageSlice.pageCount - 1 && pageSlice.pageCount > 0) {
      queueMicrotask(() => {
        setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageSlice.pageCount - 1) }))
      })
    }
  }, [pagination.pageIndex, pageSlice.pageCount])

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, listFiltered as TrafficSourceGridRow[])
      })
    },
    [listFiltered, setRowSelection],
  )

  const handleSortingChange = useCallback((sorting: SortingState) => {
    setSorting('traffic-sources', sorting)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [setSorting])

  const entityIdsForBulk = useMemo(() => entityRowIdsFromSelection(selectedIds), [selectedIds])

  const bulkDeleteConfirmCopy = useMemo(() => {
    const catStrips = deletableCategoryStripRowIds(selectedIds)
    if (catStrips.length === 0 || entityIdsForBulk.length === 0) return null
    return {
      title: 'Delete categories and traffic sources?',
      description: `This will delete ${entityIdsForBulk.length} traffic source(s) and remove ${catStrips.length} categor${catStrips.length === 1 ? 'y' : 'ies'}. This cannot be undone.`,
    }
  }, [selectedIds, entityIdsForBulk])

  const { data: editSource } = useTrafficSource(editId ?? '')
  const saveMutation = useSaveTrafficSource()
  const deleteMutation = useDeleteTrafficSource()
  const cloneMutation = useCloneTrafficSource()
  const archiveMutation = useArchiveTrafficSource()
  const saveCategoryMutation = useSaveCategory()
  const deleteCategoryMutation = useDeleteCategory()

  const hasMetricRows = listFiltered.length > 0

  const pinnedBottomRows = useMemo(
    () => {
      if (!hasMetricRows) return undefined
      const row = buildTotalsRow(totalsCells)
      return row ? [row as TrafficSourceGridRow] : undefined
    },
    [totalsCells, hasMetricRows],
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
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const cloneMutate = cloneMutation.mutate
  const handleClone = useCallback((id: string) => {
    const row = listFiltered.find((r): r is TrafficSourceGridRow => !r._isCategoryHeader && r.id === id)
    cloneMutate(
      {
        idTrafficSource: id,
        categoryId: row?.categoryId != null ? String(row.categoryId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Traffic source cloned')
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }, [cloneMutate, listFiltered, toast])

  const archiveMutate = archiveMutation.mutate
  const handleArchiveTrafficSource = useCallback((id: string, archive: boolean) => {
    archiveMutate({ id, archive }, {
      onSuccess: () => {
        toast.success(archive ? 'Archived' : 'Restored')
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [archiveMutate, toast])

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Deleted')
        setDeleteId(null)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const isDefaultSource = useCallback((row: TrafficSourceGridRow) => row.id === '1', [])
  const hideCategoryStripEditDelete = useCallback((row: TrafficSourceGridRow) => {
    if (!row._isCategoryHeader) return false
    const cid = row._categoryId ?? ''
    return cid === ''
  }, [])

  const hideEditButton = useCallback((row: TrafficSourceGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isDefaultSource(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isDefaultSource])

  const hideCloneArchive = useCallback((row: TrafficSourceGridRow) =>
    !!row._isCategoryHeader || isDefaultSource(row) || row.id === '__totals__'
  , [isDefaultSource])

  const hideDeleteButton = useCallback((row: TrafficSourceGridRow) => {
    if (row._isCategoryHeader) return hideCategoryStripEditDelete(row)
    return isDefaultSource(row) || row.id === '__totals__'
  }, [hideCategoryStripEditDelete, isDefaultSource])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<TrafficSourceGridRow>(reportColumns)),
    [reportColumns],
  )

  const handleRequestDelete = useCallback((id: string) => setDeleteId(id), [setDeleteId])

  const openCategoryRename = useCallback((row: TrafficSourceGridRow) => {
    const idCategory = row._categoryId ?? ''
    if (!idCategory) return
    setCategoryRename({ idCategory, name: row.name })
    setCategoryRenameDraft(row.name)
  }, [])

  const handleEditOrCategory = useCallback(
    (row: TrafficSourceGridRow) => {
      if (row._isCategoryHeader) openCategoryRename(row)
      else handleEdit(row.id)
    },
    [handleEdit, openCategoryRename],
  )

  const handleDeleteOrCategory = useCallback(
    (row: TrafficSourceGridRow) => {
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
      { entityType: 'trafficsource', idCategory: categoryRename.idCategory, name },
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
      { entityType: 'trafficsource', idCategory: categoryDeleteId },
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
    setSelectedCategoryId,
    reload,
  ])

  const columnDefs = useMemo<ColumnDef<TrafficSourceGridRow, unknown>[]>(() => [
    selectionColumn<TrafficSourceGridRow>(),
    nameColumn<TrafficSourceGridRow>({
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
    editBtnColumn<TrafficSourceGridRow>((row) => handleEditOrCategory(row), { hidden: hideEditButton }),
    cloneBtnColumn<TrafficSourceGridRow>((row) => handleClone(row.id), { hidden: hideCloneArchive }),
    archiveBtnColumn<TrafficSourceGridRow>(
      (row, archive) => handleArchiveTrafficSource(row.id, archive),
      {
        hidden: hideCloneArchive,
        isArchived: (row) => row.isArchived === true,
      },
    ),
    deleteBtnColumn<TrafficSourceGridRow>((row) => handleDeleteOrCategory(row), { hidden: hideDeleteButton }),
    idColumn<TrafficSourceGridRow>({ hideIdForRow: (row) => !!row._isCategoryHeader }),
    ...statCols,
  ], [
    statCols,
    handleEditOrCategory,
    handleClone,
    handleArchiveTrafficSource,
    handleDeleteOrCategory,
    hideEditButton,
    hideCloneArchive,
    hideDeleteButton,
  ])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    'traffic-sources',
    { defaultVisibleColumnIds: defaultColIds },
  )

  const handleBulkDeselectAllTrafficSources = useCallback(() => setRowSelection({}), [setRowSelection])

  const handleBulkArchiveTrafficSources = useCallback(async () => {
    await api.put('/data/trafficsource/archive/', { ids: entityIdsForBulk, archive: true })
    for (const id of entityIdsForBulk) {
      applyTrafficSourceArchiveToEntityGridCaches(queryClient, id, true)
    }
    refreshTrafficSourcesListQueries(queryClient)
    toast.success('Selected traffic sources archived')
    setRowSelection({})
  }, [entityIdsForBulk, queryClient, toast, setRowSelection])

  const handleBulkDeleteTrafficSources = useCallback(async () => {
    const categoryKeys = [
      ...new Set(
        deletableCategoryStripRowIds(selectedIds)
          .map((id) => categoryKeyFromStripRowId(id))
          .filter((k): k is string => k != null && k !== ''),
      ),
    ]
    for (const id of entityIdsForBulk) {
      if (id === '1') continue
      await deleteMutation.mutateAsync(id)
    }
    for (const idCategory of categoryKeys) {
      await deleteCategoryMutation.mutateAsync({ entityType: 'trafficsource', idCategory })
    }
    toast.success('Selected items deleted')
    setRowSelection({})
  }, [selectedIds, entityIdsForBulk, deleteMutation, deleteCategoryMutation, toast, setRowSelection])

  const handleBulkAssignTrafficSourceCategory = useCallback(async (idCategory: string) => {
    await api.put('/data/trafficsource/category/assign/', {
      trafficSourceIds: entityIdsForBulk,
      idCategory,
    })
    toast.success('Selected traffic sources moved')
    reload()
  }, [entityIdsForBulk, toast, reload])

  const trafficSourcesBulkMoveToCategory = useMemo(
    () => ({
      categories: categories ?? [],
      onMove: handleBulkAssignTrafficSourceCategory,
    }),
    [categories, handleBulkAssignTrafficSourceCategory],
  )

  const handleTrafficSourcesDateRangeChange = useCallback((v: DateRange & { preset: string | null }) => {
    if (v.from && v.to) setDateRange({ from: v.from, to: v.to })
  }, [setDateRange])

  const handleTrafficSourceFormOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [setEditId, setSheetOpen])

  const handleDismissTrafficSourceDelete = useCallback(() => setDeleteId(null), [setDeleteId])

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
        onRefresh={reload}
        refreshLoading={isFetching}
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
        actions={tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={tableForChooser}
            storageKey="traffic-sources"
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null}
      />

      <DataTable<TrafficSourceGridRow>
        data={pageSlice.pageRows}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        tableConfigKey="traffic-sources"
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection={canSelectTrafficSourceRow}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        rowClassName={trafficCategoryRowClassName}
        tableRef={tableRef}
        onTableInstance={setTableForChooser}
        emptyMessage={search || selectedCategoryId ? 'No traffic sources match your filters.' : 'No traffic sources found.'}
        manualPagination
        manualSorting
        sorting={effectiveSorting}
        onSortingChange={handleSortingChange}
        pageCount={pageSlice.pageCount}
        manualPaginationTotalRows={totalDataCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnVisibility={gridColumnVisibility.columnVisibility}
        onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={handleBulkDeselectAllTrafficSources}
        onArchive={handleBulkArchiveTrafficSources}
        onDelete={handleBulkDeleteTrafficSources}
        onMoveToCategory={trafficSourcesBulkMoveToCategory}
        deleteConfirmTitle={bulkDeleteConfirmCopy?.title}
        deleteConfirmDescription={bulkDeleteConfirmCopy?.description}
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
        description="Delete this category? Traffic sources in it will become uncategorized."
        onConfirm={() => void handleConfirmCategoryDelete()}
        loading={deleteCategoryMutation.isPending}
        danger
      />
    </PageShell>
  )
}
