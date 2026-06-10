import {
  Alert,
  Button,
  ConfirmModal,
  TimezoneSelect,
} from '@/components/ui-kit'
import { entityRowId } from '@/components/ui-kit/data-table'
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import { EntityPage } from '@/lib/entity-table/EntityPage'
import { getErrorMessage } from '@/lib/utils'
import type { CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import { AddFunnelModal } from '@/pages/campaigns/AddFunnelModal'
import { CloneFunnelModal } from '@/pages/campaigns/CloneFunnelModal'
import { CampaignEditorModal } from '@/pages/campaigns/CampaignEditorModal'
import { useCampaignsController } from '@/pages/campaigns/useCampaignsController'

const TABLE_KEY = 'campaigns'

const canSelectCampaignRow = (row: { original: CampaignRow }) => row.original.id !== '__totals__'
const campaignRowClassName = (row: CampaignRow) => row._isCategoryHeader ? 'dt-row--category-strip' : undefined

export function CampaignsPage() {
  const controller = useCampaignsController()

  return (
    <EntityPage<CampaignRow>
      title="Campaigns"
      bodyState={controller.pageBodyState}
      headerActions={(
        <>
          <Button
            type="primary"
            disabled={!controller.canEditCampaigns}
            onClick={controller.handleOpenAddFunnel}
          >
            Add Funnel
          </Button>
          <Button type="primary" onClick={controller.handleOpenCreateCampaign}>
            Add Campaign
          </Button>
        </>
      )}
      topContent={controller.grid.error ? (
        <Alert
          type="error"
          showIcon
          message="Campaign data failed to load"
          description={getErrorMessage(controller.grid.error)}
          className="mb-3"
        />
      ) : null}
      searchToolbarProps={{
        value: controller.search,
        onChange: controller.handleSearchChange,
        placeholder: 'Search campaigns...',
        onRefresh: controller.handleRefresh,
        refreshLoading: controller.grid.isFetching,
        filters: (
          <ArchiveToggle
            value={controller.archiveStatus}
            onChange={controller.handleArchiveStatusChange}
          />
        ),
        trailing: (
          <>
            <DateRangePicker
              value={{
                from: controller.dateRange.from,
                to: controller.dateRange.to,
                preset: null,
              }}
              timezone={controller.tz}
              onChange={controller.handleDateRangeChange}
              density="compact"
            />
            <TimezoneSelect value={controller.tz} onChange={controller.setTz} />
          </>
        ),
        actions: controller.tableForChooser ? (
          <ColumnChooser
            columns={controller.columnDefs}
            table={controller.tableForChooser}
            storageKey={TABLE_KEY}
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={controller.selectedColumnIds}
            onColumnsChange={controller.handleChooserColumnsChange}
          />
        ) : null,
      }}
      tableProps={{
        data: controller.grid.rows,
        columns: controller.columnDefs,
        loading: controller.grid.isLoading,
        loadingMore: controller.grid.isLoadingMore,
        getRowId: entityRowId,
        tableConfigKey: TABLE_KEY,
        sorting: controller.grid.sorting,
        onSortingChange: controller.grid.handleSortingChange,
        manualSorting: true,
        pagination: controller.pagination,
        onPaginationChange: controller.handlePaginationChange,
        manualPagination: true,
        pageCount: controller.grid.pageCount,
        manualPaginationTotalRows: controller.grid.totalRows,
        pageSizeOptions: [25, 50, 100, 200],
        pinnedBottomRows: controller.pinnedBottomRows,
        enableRowSelection: canSelectCampaignRow,
        rowSelection: controller.rowSelection,
        onRowSelectionChange: controller.handleRowSelectionChange,
        rowClassName: campaignRowClassName,
        tableRef: controller.tableRef,
        onTableInstance: controller.setTableForChooser,
        columnSizing: controller.tableConfig.columnSizing,
        onColumnSizingChange: controller.handleTableColumnSizingChange,
        columnVisibility: controller.tableConfig.columnVisibility,
        onColumnVisibilityChange: controller.handleTableColumnVisibilityChange,
        emptyMessage: controller.search
          ? 'No campaigns or funnels match your search.'
          : 'No campaigns found.',
      }}
      bulkActions={(
        <BulkActionsBar
          count={controller.bulkTargetRows.length}
          onDeselectAll={controller.handleBulkDeselectAll}
          onArchive={controller.handleBulkArchive}
          onDelete={controller.handleBulkDelete}
          archiveLabel="Archive"
        />
      )}
      overlays={(
        <>
          <AddFunnelModal
            key={controller.addFunnelModalKey}
            open={controller.addFunnelModalOpen}
            onClose={controller.handleCloseAddFunnel}
            onFunnelCreated={controller.handleFunnelCreated}
          />
          <CloneFunnelModal
            key={controller.cloneFunnelModalKey}
            open={controller.cloneFunnelSource !== null}
            source={controller.cloneFunnelSource}
            onClose={controller.handleCloseCloneFunnel}
            onFunnelCloned={controller.handleFunnelCreated}
          />
          <CampaignEditorModal
            open={controller.campaignModal !== null}
            mode={controller.campaignModal?.mode === 'edit' ? 'edit' : 'create'}
            campaignId={controller.campaignModal?.mode === 'edit' ? controller.campaignModal.campaignId : null}
            onClose={controller.handleCloseCampaignModal}
            onSaved={controller.handleCampaignPersisted}
          />
          <ConfirmModal
            open={Boolean(controller.pendingAction)}
            onCancel={controller.handleCancelConfirm}
            title={controller.confirmTitle}
            description={controller.confirmDescription}
            onConfirm={() => void controller.handleConfirmAction()}
            loading={controller.confirmLoading}
            danger={Boolean(controller.confirmDanger)}
          />
        </>
      )}
    />
  )
}
