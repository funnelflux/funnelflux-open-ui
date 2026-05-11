import { Button, TimezoneSelect } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { getErrorMessage } from '@/lib/utils'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { entityRowId } from '@/components/ui-kit/data-table'
import type { TrafficSourceGridRow } from '@/pages/traffic-sources/types'
import { useTrafficSourcesController } from '@/pages/traffic-sources/useTrafficSourcesController'
import { useTrafficSourcesColumns } from '@/pages/traffic-sources/useTrafficSourcesColumns'
import { TrafficSourcesDialogs } from '@/pages/traffic-sources/TrafficSourcesDialogs'
import { EntityPage } from '@/lib/entity-page/EntityPage'

const canSelectTrafficSourceRow = (row: { original: TrafficSourceGridRow }) => {
  const r = row.original
  if (r.id === '__totals__') return false
  if (r.id === '1') return false
  return true
}
const trafficCategoryRowClassName = (row: TrafficSourceGridRow) =>
  row._isCategoryHeader ? 'dt-row--category-strip' : undefined

export function TrafficSourcesPage() {
  const controller = useTrafficSourcesController()
  const { columnDefs, gridColumnVisibility } = useTrafficSourcesColumns({
    statCols: controller.statCols,
    onEditEntity: controller.handleEdit,
    onCloneEntity: controller.handleClone,
    onArchiveEntity: controller.handleArchiveTrafficSource,
    onDeleteEntity: controller.handleRequestDelete,
    onOpenCategoryRename: controller.openCategoryRename,
    onRequestCategoryDelete: controller.setCategoryDeleteId,
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

  return (
    <EntityPage<TrafficSourceGridRow>
      title="Traffic Sources"
      bodyState={pageBodyState}
      headerActions={(
        <Button type="primary" onClick={controller.handleCreate}>
          Add Traffic Source
        </Button>
      )}
      searchToolbarProps={{
        value: controller.search,
        onChange: controller.setSearch,
        placeholder: 'Search traffic sources...',
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
            />
            <TimezoneSelect value={controller.tz} onChange={controller.setTz} />
          </>
        ),
        actions: controller.tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={controller.tableForChooser}
            storageKey="traffic-sources"
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null,
      }}
      tableProps={{
        data: controller.pageRows,
        columns: columnDefs,
        loading: controller.isLoading,
        getRowId: entityRowId,
        tableConfigKey: 'traffic-sources',
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
      }}
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
          sheetOpen={controller.sheetOpen}
          onFormOpenChange={controller.handleFormOpenChange}
          editId={controller.editId}
          editSource={controller.editSource}
          onSubmit={controller.handleSubmit}
          savePending={controller.saveMutation.isPending}
          deleteId={controller.deleteId}
          onDeleteDismiss={controller.handleDismissDelete}
          onDeleteConfirm={controller.handleDelete}
          deletePending={controller.deleteMutation.isPending}
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
