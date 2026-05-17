import { useCallback } from 'react'
import { Button, TimezoneSelect } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { entityRowId } from '@/components/ui-kit/data-table'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { useEntityTableColumns } from '@/lib/entity-table/engine/useEntityTableColumns'
import { getErrorMessage } from '@/lib/utils'
import { EntityPage } from '@/lib/entity-table/EntityPage'
import {
  OFFER_SOURCES_METRIC_HIDE_SCOPES,
  type OfferSourceGridRow,
  useOfferSourcesController,
} from '@/pages/offer-sources/useOfferSourcesController'
import { OfferSourcesDialogs } from '@/pages/offer-sources/OfferSourcesDialogs'

const TABLE_KEY = 'offer-sources'

const canSelectOfferSourceRow = (row: { original: OfferSourceGridRow }) =>
  row.original.id !== '__totals__'

export function OfferSourcesPage() {
  const controller = useOfferSourcesController()

  const noopCategoryRename = useCallback((row: OfferSourceGridRow) => {
    void row
  }, [])
  const noopCategoryDelete = useCallback((id: string) => {
    void id
  }, [])

  const { columnDefs, gridColumnVisibility } = useEntityTableColumns<OfferSourceGridRow>({
    tableConfigKey: TABLE_KEY,
    statCols: controller.statCols,
    hideScopes: OFFER_SOURCES_METRIC_HIDE_SCOPES,
    onEditEntity: controller.handleEdit,
    onCloneEntity: controller.handleClone,
    onArchiveEntity: controller.handleArchiveConfirmedRow,
    onDeleteEntity: controller.handleRequestDelete,
    onOpenCategoryRename: noopCategoryRename,
    onRequestCategoryDelete: noopCategoryDelete,
  })

  const pageBodyState = controller.gridError
    ? {
        status: 'error' as const,
        message: getErrorMessage(controller.gridError),
        onRetry: () => void controller.reload(),
      }
    : controller.isLoading && controller.filtered.length === 0
      ? { status: 'loading' as const }
      : { status: 'ready' as const }

  return (
    <EntityPage<OfferSourceGridRow>
      title="Offer Sources"
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
        filters: <ArchiveToggle value={controller.archiveStatus} onChange={controller.setArchiveStatus} />,
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
            hideScopes={OFFER_SOURCES_METRIC_HIDE_SCOPES}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={gridColumnVisibility.selectedCols}
            onColumnsChange={gridColumnVisibility.onColumnsChange}
          />
        ) : null,
      }}
      tableProps={{
        data: controller.filtered,
        columns: columnDefs,
        loading: controller.isLoading,
        getRowId: entityRowId,
        tableConfigKey: TABLE_KEY,
        pinnedBottomRows: controller.pinnedBottomRows,
        enableRowSelection: canSelectOfferSourceRow,
        rowSelection: controller.rowSelection,
        onRowSelectionChange: controller.setRowSelection,
        tableRef: controller.tableRef,
        onTableInstance: controller.setTableForChooser,
        emptyMessage:
          controller.search ? `No ${controller.pluralLower} match your search.` : `No ${controller.pluralLower} found.`,
        columnVisibility: gridColumnVisibility.columnVisibility,
        onColumnVisibilityChange: gridColumnVisibility.onColumnVisibilityChange,
      }}
      bulkActions={(
        <BulkActionsBar
          count={controller.selectedIds.length}
          onDeselectAll={controller.handleBulkDeselectAll}
          onArchive={controller.handleBulkArchive}
          onDelete={controller.handleBulkDelete}
        />
      )}
      overlays={(
        <OfferSourcesDialogs
          singularLabel={controller.singularLabel}
          singularLower={controller.singularLower}
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
          archiveConfirm={controller.archiveConfirm}
          onArchiveConfirmDismiss={() => controller.setArchiveConfirm(null)}
          onArchiveConfirm={() => void controller.handleConfirmArchiveDialog()}
          archivePending={controller.archiveMutation.isPending}
        />
      )}
    />
  )
}
