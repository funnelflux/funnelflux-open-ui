import { Button, TimezoneSelect } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { CategoryManager } from '@/components/shared/CategoryManager'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { entityRowId } from '@/components/ui-kit/data-table'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { cn, getErrorMessage } from '@/lib/utils'
import { pageCsvTemplateUrl } from '@/lib/pageCsvImport'
import type { PageEntitiesPageProps, PageGridRow } from '@/pages/page-entities/types'
import { usePageEntitiesController } from '@/pages/page-entities/usePageEntitiesController'
import { usePageEntitiesColumns } from '@/pages/page-entities/usePageEntitiesColumns'
import { PageEntitiesDialogs } from '@/pages/page-entities/PageEntitiesDialogs'
import { EntityPage } from '@/lib/entity-table/EntityPage'

const canSelectRow = (row: { original: PageGridRow }) => row.original.id !== '__totals__'

/** Landers/offers lists with category strip, CSV import, and extended bulk actions. */
export function PageEntitiesPage({
  pageType,
  tableConfigKey,
  title,
  singularLabel,
  groupBy,
  hideScope,
}: PageEntitiesPageProps) {
  const controller = usePageEntitiesController({
    pageType,
    tableConfigKey,
    singularLabel,
    groupBy,
    hideScope,
  })

  const categoryRowClassName = (row: PageGridRow) =>
    cn(
      row._isCategoryHeader && 'dt-row--category-strip',
      row.id === controller.highlightRowId && 'dt-row--revealed',
    )

  const { columnDefs, gridColumnVisibility } = usePageEntitiesColumns({
    tableConfigKey,
    statCols: controller.statCols,
    hideScopes: controller.hideScopes,
    onEditEntity: controller.handleEdit,
    onCloneEntity: controller.handleClone,
    onArchiveEntity: controller.handleArchiveConfirmedRow,
    onDeleteEntity: controller.setDeleteId,
    onOpenCategoryRename: controller.openCategoryRename,
    onRequestCategoryDelete: controller.setCategoryDeleteId,
  })

  const pageBodyState = controller.gridError
    ? {
        status: 'error' as const,
        message: getErrorMessage(controller.gridError),
        onRetry: () => void controller.reload(),
      }
    : controller.isLoading && controller.mergedRows.length === 0
      ? { status: 'loading' as const }
      : { status: 'ready' as const }

  return (
    <EntityPage<PageGridRow>
      title={title}
      bodyState={pageBodyState}
      headerActions={(
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
          <Button iconName="upload" onClick={() => controller.setImportOpen(true)}>
            Import CSV
          </Button>
          <Button type="primary" onClick={controller.handleCreate}>
            {`Add ${singularLabel}`}
          </Button>
        </div>
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
              entityType="page"
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
            storageKey={tableConfigKey}
            hideScopes={controller.hideScopes}
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
        loadingMore: controller.isLoadingMore,
        getRowId: entityRowId,
        tableConfigKey,
        pinnedBottomRows: controller.pinnedBottomRows,
        enableRowSelection: canSelectRow,
        rowSelection: controller.rowSelection,
        onRowSelectionChange: controller.handleRowSelectionChange,
        rowClassName: categoryRowClassName,
        tableRef: controller.tableRef,
        onTableInstance: controller.setTableForChooser,
        emptyMessage:
          controller.search || controller.selectedCategoryId
            ? `No ${controller.pluralLower} match your filters.`
            : `No ${controller.pluralLower} found.`,
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
        <PageEntitiesDialogs
          title={title}
          singularLabel={singularLabel}
          pageType={pageType}
          templateUrl={pageCsvTemplateUrl(pageType)}
          importOpen={controller.importOpen}
          onImportOpenChange={controller.setImportOpen}
          onImport={controller.handleImport}
          sheetOpen={controller.sheetOpen}
          onFormOpenChange={controller.handleFormOpenChange}
          editId={controller.editId}
          editPage={controller.editPage}
          formMode={controller.formMode}
          cloneInitialValues={controller.cloneInitialValues}
          cloneLoading={controller.cloneLoading}
          onSubmit={controller.handleSubmit}
          isSubmitting={controller.saveMutation.isPending}
          deleteId={controller.deleteId}
          onDeleteDismiss={controller.handleDismissDelete}
          onDeleteConfirm={controller.handleDelete}
          deletePending={controller.deleteMutation.isPending}
          archiveConfirm={controller.archiveConfirm}
          onArchiveConfirmDismiss={() => controller.setArchiveConfirm(null)}
          onArchiveConfirm={() => void controller.handleConfirmArchiveDialog()}
          archivePending={controller.archiveMutation.isPending}
          singularLower={controller.singularLower}
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
