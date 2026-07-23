import { useCallback, useMemo } from 'react'
import { Button, TimezoneSelect } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { entityRowId } from '@/components/ui-kit/data-table'
import type { DataTableProps } from '@/components/ui-kit/data-table'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { useEntityTableColumns } from '@/lib/entity-table/engine/useEntityTableColumns'
import type { CategoryStripGridRow } from '@/lib/entity-table/data/mergedRows'
import { cn, getErrorMessage } from '@/lib/utils'
import { EntityPage } from '@/lib/entity-table/EntityPage'
import { TrafficSourcesDialogs } from '@/pages/traffic-sources/TrafficSourcesDialogs'
import { useTrafficSourcesController } from '@/pages/traffic-sources/useTrafficSourcesController'

const TABLE_KEY = 'traffic-sources'

const canSelectTrafficSourceRow = (row: { original: CategoryStripGridRow }) => {
  const r = row.original
  if (r.id === '__totals__') return false
  if (r.id === '1') return false
  return true
}

export function TrafficSourcesPage() {
  const controller = useTrafficSourcesController()

  const isDefaultTrafficSource = useCallback((row: CategoryStripGridRow) => row.id === '1', [])

  const trafficCategoryRowClassName = useCallback(
    (row: CategoryStripGridRow) =>
      cn(
        row._isCategoryHeader && 'dt-row--category-strip',
        row.id === controller.highlightRowId && 'dt-row--revealed',
      ),
    [controller.highlightRowId],
  )

  const { columnDefs, gridColumnVisibility } = useEntityTableColumns<CategoryStripGridRow>({
    tableConfigKey: TABLE_KEY,
    statCols: controller.statCols,
    onEditEntity: controller.handleEdit,
    onCloneEntity: controller.handleClone,
    onArchiveEntity: controller.handleArchiveConfirmedRow,
    onDeleteEntity: controller.handleRequestDelete,
    onOpenCategoryRename: controller.openCategoryRename,
    onRequestCategoryDelete: controller.setCategoryDeleteId,
    isProtectedEntityRow: isDefaultTrafficSource,
  })

  const pageBodyState = controller.gridError
    ? {
        status: 'error' as const,
        message: getErrorMessage(controller.gridError),
        onRetry: () => void controller.reload(),
      }
    : controller.isLoading && controller.pageRows.length === 0
      ? { status: 'loading' as const }
      : { status: 'ready' as const }

  const tableProps = useMemo<DataTableProps<CategoryStripGridRow>>(() => ({
    data: controller.pageRows,
    columns: columnDefs,
    loading: controller.isLoading,
    loadingMore: controller.isLoadingMore,
    getRowId: entityRowId,
    tableConfigKey: TABLE_KEY,
    pinnedBottomRows: controller.pinnedBottomRows,
    enableRowSelection: canSelectTrafficSourceRow,
    rowSelection: controller.rowSelection,
    onRowSelectionChange: controller.handleRowSelectionChange,
    rowClassName: trafficCategoryRowClassName,
    tableRef: controller.tableRef,
    onTableInstance: controller.setTableForChooser,
    emptyMessage:
      controller.search || controller.selectedCategoryId
        ? 'No traffic sources match your filters.'
        : 'No traffic sources found.',
    manualPagination: true,
    manualSorting: true,
    sorting: controller.effectiveSorting,
    onSortingChange: controller.handleSortingChange,
    pageCount: controller.pageCount,
    manualPaginationTotalRows: controller.totalDataCount,
    pagination: controller.pagination,
    onPaginationChange: controller.setPagination,
    columnVisibility: gridColumnVisibility.columnVisibility,
    onColumnVisibilityChange: gridColumnVisibility.onColumnVisibilityChange,
  }), [
    controller.pageRows,
    columnDefs,
    controller.isLoading,
    controller.isLoadingMore,
    controller.pinnedBottomRows,
    controller.rowSelection,
    controller.handleRowSelectionChange,
    trafficCategoryRowClassName,
    controller.tableRef,
    controller.setTableForChooser,
    controller.search,
    controller.selectedCategoryId,
    controller.effectiveSorting,
    controller.handleSortingChange,
    controller.pageCount,
    controller.totalDataCount,
    controller.pagination,
    controller.setPagination,
    gridColumnVisibility.columnVisibility,
    gridColumnVisibility.onColumnVisibilityChange,
  ])

  return (
    <EntityPage<CategoryStripGridRow>
      title="Traffic Sources"
      bodyState={pageBodyState}
      headerActions={(
        <Button type="primary" onClick={controller.handleCreate}>
          {`Add ${controller.singularLabel}`}
        </Button>
      )}
      searchToolbarProps={{
        value: controller.search,
        onChange: controller.setSearch,
        placeholder: `Search ${controller.pluralLower}...`,
        onRefresh: controller.reload,
        refreshLoading: controller.isFetching,
        filters: (
          <>
            <ArchiveToggle value={controller.archiveStatus} onChange={controller.setArchiveStatus} />
            <CategoryManager
              entityType="trafficsource"
              selectedCategoryId={controller.selectedCategoryId}
              onSelectCategory={controller.setSelectedCategoryId}
            />
          </>
        ),
        trailing: (
          <>
            <DateRangePicker
              value={{ from: controller.dateRange.from, to: controller.dateRange.to, preset: null }}
              timezone={controller.tz}
              onChange={controller.handleDateRangeChange}
              density="compact"
              className="[--ff-date-range-compact-max:236px]"
            />
            <TimezoneSelect value={controller.tz} onChange={controller.setTz} />
          </>
        ),
        actions: controller.tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={controller.tableForChooser}
            storageKey={TABLE_KEY}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null,
      }}
      tableProps={tableProps}
      bulkActions={(
        <BulkActionsBar
          count={controller.selectedIds.length}
          onDeselectAll={controller.handleBulkDeselectAll}
          onArchive={controller.handleBulkArchive}
          onDelete={controller.handleBulkDelete}
          onMoveToCategory={controller.bulkMoveToCategory}
          deleteConfirmTitle={controller.bulkDeleteConfirmCopy?.title}
          deleteConfirmDescription={controller.bulkDeleteConfirmCopy?.description}
        />
      )}
      overlays={(
        <TrafficSourcesDialogs
          singularLabel={controller.singularLabel}
          singularLower={controller.singularLower}
          sheetOpen={controller.sheetOpen}
          onFormOpenChange={controller.handleFormOpenChange}
          editId={controller.editId}
          editSource={controller.editSource}
          formMode={controller.formMode}
          cloneInitialValues={controller.cloneInitialValues}
          cloneLoading={controller.cloneLoading}
          onSubmit={controller.handleSubmit}
          savePending={controller.saveMutation.isPending}
          deleteId={controller.deleteId}
          onDeleteDismiss={controller.handleDismissDelete}
          onDeleteConfirm={controller.handleDelete}
          deletePending={controller.deleteMutation.isPending}
          archiveConfirm={controller.archiveConfirm}
          onArchiveConfirmDismiss={() => controller.setArchiveConfirm(null)}
          onArchiveConfirm={() => void controller.handleConfirmArchiveDialog()}
          archivePending={controller.archiveMutation.isPending}
          categoryRename={controller.categoryRename}
          categoryRenameDraft={controller.categoryRenameDraft}
          onCategoryRenameDraftChange={controller.setCategoryRenameDraft}
          onCategoryRenameDismiss={() => controller.setCategoryRename(null)}
          onCategoryRenameConfirm={() => void controller.handleConfirmCategoryRename()}
          categoryRenamePending={controller.saveCategoryMutation.isPending}
          categoryDeleteId={controller.categoryDeleteId}
          onCategoryDeleteDismiss={() => controller.setCategoryDeleteId(null)}
          onCategoryDeleteConfirm={() => void controller.handleConfirmCategoryDelete()}
          categoryDeletePending={controller.deleteCategoryMutation.isPending}
        />
      )}
    />
  )
}
