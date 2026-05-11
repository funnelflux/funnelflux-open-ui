import { Alert, Button, TimezoneSelect } from '@/components/ui-kit'
import { entityRowId } from '@/components/ui-kit/data-table'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import type { CampaignTreeRow } from '@/pages/campaigns/campaignTreeUtils'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { useCampaignsController } from '@/pages/campaigns/useCampaignsController'
import { useCampaignsColumns } from '@/pages/campaigns/useCampaignsColumns'
import { CampaignsDialogs } from '@/pages/campaigns/CampaignsDialogs'
import { EntityPage } from '@/lib/entity-page/EntityPage'

export function CampaignsPage() {
  const controller = useCampaignsController()
  const { columnDefs } = useCampaignsColumns({
    statCols: controller.statCols,
    onEditCampaign: controller.handleEdit,
    onOpenFunnelEditor: controller.handleOpenFunnelEditor,
    onCloneCampaign: controller.handleCloneCampaign,
    onCloneFunnel: controller.handleCloneFunnel,
    onOpenAddCampaignOrFunnel: controller.openAddCampaignOrFunnel,
    onOpenMoveFunnel: controller.openMoveFunnelModal,
    onRequestDelete: controller.setDeleteTarget,
  })

  return (
    <EntityPage<CampaignTreeRow>
      title="Campaigns"
      headerActions={(
        <Button type="primary" uiVariant="default" onClick={controller.handleCreate}>
          Add funnel or campaign
        </Button>
      )}
      topContent={controller.campaignLoadError ? (
        <Alert
          type="error"
          showIcon
          message="Campaign data failed to load"
          description={controller.campaignLoadError}
          className="mb-3"
        />
      ) : null}
      searchToolbarProps={{
        value: controller.search,
        onChange: controller.setSearch,
        placeholder: 'Search campaigns...',
        onRefresh: () => void controller.reload(),
        refreshLoading: controller.isFetching,
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
            storageKey="campaigns"
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={controller.selectedColumnIds}
            onColumnsChange={controller.handleChooserColumnsChange}
          />
        ) : null,
      }}
      tableProps={{
        data: controller.filtered,
        columns: columnDefs,
        loading: controller.isLoading,
        getRowId: entityRowId,
        tableConfigKey: 'campaigns',
        pinnedBottomRows: controller.pinnedBottomRows,
        enableRowSelection: true,
        rowSelection: controller.rowSelection,
        onRowSelectionChange: controller.setRowSelection,
        treeMode: true,
        getSubRows: controller.getSubRows,
        expanded: controller.expanded,
        onExpandedChange: controller.setExpanded,
        tableRef: controller.tableRef,
        onTableInstance: controller.setTableForChooser,
        columnSizing: controller.tableConfig.columnSizing,
        onColumnSizingChange: controller.handleTableColumnSizingChange,
        columnVisibility: controller.tableConfig.columnVisibility,
        onColumnVisibilityChange: controller.handleTableColumnVisibilityChange,
        emptyMessage: controller.search ? 'No campaigns match your search.' : 'No campaigns found.',
      }}
      bulkActions={(
        <BulkActionsBar
          count={controller.selectedIds.length}
          onDeselectAll={controller.handleBulkDeselectAll}
          onMove={controller.handleBulkMoveFunnels}
          onArchive={controller.handleBulkArchiveFunnels}
          onDelete={controller.handleBulkDeleteSelection}
          moveLabel="Move funnels"
          archiveLabel="Archive funnels"
        />
      )}
      overlays={(
        <CampaignsDialogs
          addModalKey={controller.addModalKey}
          addCombinedOpen={controller.addCombinedOpen}
          onCloseAddCombined={controller.handleCloseAddCombinedModal}
          initialCampaignId={controller.funnelPrefillCampaignId}
          onOpenCampaignForm={controller.handleOpenCampaignFormFromCombined}
          onCreateFunnel={controller.handleCreateFunnelFromModal}
          onQuickCreateCampaign={controller.handleQuickCreateCampaign}
          funnelCreatePending={controller.saveFunnel.isPending}
          campaignQuickCreatePending={controller.saveMutation.isPending}
          moveFunnelTarget={controller.moveFunnelTarget}
          onCloseMoveFunnel={controller.handleCloseMoveFunnelModal}
          onMoved={() => void controller.reload()}
          sheetOpen={controller.sheetOpen}
          onCampaignEditOpenChange={controller.handleCampaignEditOpenChange}
          editCampaign={controller.editId ? controller.editCampaign : undefined}
          onSubmit={controller.handleSubmit}
          savePending={controller.saveMutation.isPending}
          deleteTarget={controller.deleteTarget}
          onDeleteDismiss={controller.handleDismissDeleteCampaignOrFunnel}
          onDeleteConfirm={controller.handleDelete}
          deleteCampaignPending={controller.deleteMutation.isPending}
          deleteFunnelPending={controller.deleteFunnel.isPending}
        />
      )}
    />
  )
}
