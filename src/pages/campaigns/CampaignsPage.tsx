import { useCallback, useMemo, useRef, useState } from 'react'
import type { PaginationState, RowSelectionState, Table, Updater, VisibilityState } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  ConfirmModal,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
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
import { ArchiveToggle } from '@/components/shared/ArchiveToggle'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  useCloneCampaign,
  useCloneFunnel,
  useDeleteCampaign,
  useDeleteFunnel,
} from '@/api/hooks'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { ASSET_CAMPAIGNS_HIERARCHY_REPORT } from '@/lib/entity-table/data/cacheKeys'
import { useEntityTable } from '@/lib/entity-table/useEntityTable'
import type { AssetTableEnginePageData } from '@/lib/entity-table/engine/useServerPagedData'
import { mapStatColsForCategoryStrip } from '@/lib/entity-table/engine/categoryStripTable.tsx'
import { syncCategoryStripRowSelection } from '@/lib/entity-table/engine/categoryStripSelection'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import {
  cellsForNewFunnel,
  createCampaignTreeLoadPageData,
  filterCampaignStripRows,
  filterRowsForArchiveTab,
  finalizeCampaignStrip,
  findTemplateFunnelRow,
  passesArchiveTab,
} from '@/pages/campaigns/campaignTreeAdapter'
import type { CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import { AddFunnelModal } from '@/pages/campaigns/AddFunnelModal'
import { CampaignEditorModal } from '@/pages/campaigns/CampaignEditorModal'
import {
  metricColumnIdsForScope,
  metricsForColumnIds,
  visibleMetricColumnIdsFromVisibility,
} from '@/lib/drilldownMetrics'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { ReportCell } from '@/types/stats'
import type { Campaign, Funnel, IdName, IdNamePair } from '@/types/entities'
import { useAuthStore } from '@/store/auth'
import { selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
import { EntityPage } from '@/lib/entity-table/EntityPage'

type PendingAction =
  | { kind: 'clone'; row: CampaignRow }
  | { kind: 'delete'; row: CampaignRow }
  | { kind: 'archive'; row: CampaignRow; archive: boolean }

const TABLE_KEY = 'campaigns'
const CAMPAIGNS_MAX_PAGE_SIZE = 200

const canSelectCampaignRow = (row: { original: CampaignRow }) => row.original.id !== '__totals__'
const campaignRowClassName = (row: CampaignRow) => row._isCategoryHeader ? 'dt-row--category-strip' : undefined

function buildCampaignTotalsRow(cells: ReportCell[] | null | undefined): CampaignRow | null {
  if (!cells?.length) return null
  return {
    id: '__totals__',
    name: 'Totals',
    cells,
    campaignId: '',
  }
}

async function archiveCampaignRemote(campaignId: string, archive: boolean): Promise<void> {
  const campaign = await api.get<Campaign>('/data/campaign/find/byId/', { idCampaign: campaignId })
  await api.put<Campaign>('/data/campaign/save/', { ...campaign, isArchived: archive })
}

async function archiveFunnelRemote(funnelId: string, archive: boolean): Promise<void> {
  const funnel = await api.get<Funnel>('/data/campaign/funnel/find/byId/', {
    idFunnel: funnelId,
    loadDependencies: 'true',
  })
  await api.put<Funnel>('/data/campaign/funnel/save/', { ...funnel, isArchived: archive }, {
    deleteDependencies: 'false',
  })
}


export function CampaignsPage() {
  const navigate = useNavigate()
  const toast = useToastApi()
  const tableRef = useRef<Table<CampaignRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<CampaignRow> | null>(null)
  const [search, setSearch] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }))
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: CAMPAIGNS_MAX_PAGE_SIZE,
  })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [campaignModal, setCampaignModal] = useState<
    null | { mode: 'create' } | { mode: 'edit'; campaignId: string }
  >(null)
  const [addFunnelModalOpen, setAddFunnelModalOpen] = useState(false)
  const [addFunnelModalKey, setAddFunnelModalKey] = useState(0)
  const canEditCampaigns = useAuthStore((s) => Boolean(s.user?.permissions.campaigns.canEdit))
  const cloneCampaign = useCloneCampaign()
  const cloneFunnel = useCloneFunnel()
  const deleteCampaign = useDeleteCampaign()
  const deleteFunnel = useDeleteFunnel()

  const tableConfig = useTableConfigStore(selectTableConfig(TABLE_KEY))
  const setColumnSizing = useTableConfigStore((state) => state.setColumnSizing)
  const setColumnVisibility = useTableConfigStore((state) => state.setColumnVisibility)

  const metricColumnIds = useMemo(
    () => visibleMetricColumnIdsFromVisibility(tableConfig.columnVisibility, {
      defaultVisibleColumnIds: defaultColIds,
    }),
    [tableConfig.columnVisibility],
  )
  const reportMetrics = useMemo(() => metricsForColumnIds(metricColumnIds), [metricColumnIds])
  const selectedColumnIds = useMemo(() => {
    const selected = new Set(metricColumnIds)
    if (tableConfig.columnVisibility.id ?? true) selected.add('id')
    return selected
  }, [metricColumnIds, tableConfig.columnVisibility.id])

  const loadPageData = useMemo(() => createCampaignTreeLoadPageData(archiveStatus), [archiveStatus])

  const controller = useEntityTable<CampaignRow>({
    mode: 'server-paged',
    tableKey: TABLE_KEY,
    queryKeyPrefix: queryKeys.campaignStrip.all,
    queryScopeKey: `${ASSET_CAMPAIGNS_HIERARCHY_REPORT}:${archiveStatus}`,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    reportMetrics,
    loadPageData,
    filterRows: filterCampaignStripRows,
    // Keep campaign strip headers adjacent to their funnels.
    sortRows: (rows) => rows,
  })

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, controller.rows)
      })
    },
    [controller.rows],
  )

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const patchStrip = controller.setCachedPage

  const handleCampaignPersisted = useCallback((saved: Campaign) => {
    const cid = String(saved.idCampaign)
    patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
      if (!prev) return prev
      const isEdit = prev.rows.some((r) => r._isCategoryHeader && r.campaignId === cid)
      if (!isEdit) {
        const header: CampaignRow = {
          id: `campaign:${cid}`,
          name: saved.campaignName,
          cells: [{ raw: cid, formatted: saved.campaignName }],
          campaignId: cid,
          campaignName: saved.campaignName,
          categoryId: cid,
          _categoryId: cid,
          _isCategoryHeader: true,
          isArchived: Boolean(saved.isArchived),
        }
        if (!passesArchiveTab(header, archiveStatus)) return prev
        const beforeVisible = filterRowsForArchiveTab(prev.rows, archiveStatus)
        const merged = finalizeCampaignStrip([...prev.rows, header])
        const nextRows = filterRowsForArchiveTab(merged, archiveStatus)
        const gained = nextRows.length - beforeVisible.length
        return {
          ...prev,
          rows: nextRows,
          totalRows: Math.max(0, prev.totalRows + gained),
        }
      }
      const mapped = prev.rows.map((r) => {
        if (r._isCategoryHeader && r.campaignId === cid) {
          return {
            ...r,
            name: saved.campaignName,
            campaignName: saved.campaignName,
            cells: [{ raw: cid, formatted: saved.campaignName }],
            isArchived: Boolean(saved.isArchived),
          }
        }
        if (!r._isCategoryHeader && r.campaignId === cid) {
          return { ...r, campaignName: saved.campaignName, isArchived: Boolean(saved.isArchived) }
        }
        return r
      })
      const nextRows = filterRowsForArchiveTab(mapped, archiveStatus)
      const delta = mapped.length - nextRows.length
      return {
        ...prev,
        rows: nextRows,
        totalRows: Math.max(0, prev.totalRows - delta),
      }
    })
  }, [archiveStatus, patchStrip])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<CampaignRow>(controller.columns)),
    [controller.columns],
  )
  const handleEditClick = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    if (row._isCategoryHeader) {
      setCampaignModal({ mode: 'edit', campaignId: row.campaignId })
      return
    }
    if (row.funnelId) {
      navigate(`/campaigns/${row.campaignId}/funnels/${row.funnelId}`)
    }
  }, [navigate])

  const runClone = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    if (row._isCategoryHeader) {
      cloneCampaign.mutate(row.campaignId, {
        onSuccess: async (pair: IdNamePair) => {
          toast.success('Campaign cloned')
          const newCampId = String(pair.id ?? '')
          const newName = String(pair.name ?? '')
          let funnelList: IdName[] = []
          try {
            funnelList = await api.get<IdName[]>('/data/campaign/funnel/list/', {
              idCampaign: newCampId,
            })
          } catch {
            funnelList = []
          }
          patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
            if (!prev) return prev
            const tmplCells = findTemplateFunnelRow(prev.rows, row.campaignId)?.cells
              ?? [{ raw: '0', formatted: '-' }]
            const header: CampaignRow = {
              id: `campaign:${newCampId}`,
              name: newName,
              cells: [{ raw: newCampId, formatted: newName }],
              campaignId: newCampId,
              campaignName: newName,
              categoryId: newCampId,
              _categoryId: newCampId,
              _isCategoryHeader: true,
              isArchived: false,
            }
            const funnelRows: CampaignRow[] = (funnelList ?? []).map((fn) => {
              const fid = String(fn.id)
              return {
                id: fid,
                name: fn.name,
                cells: cellsForNewFunnel(tmplCells, fid, fn.name),
                campaignId: newCampId,
                campaignName: newName,
                funnelId: fid,
                categoryId: newCampId,
                isArchived: false,
              }
            })
            const beforeVisible = filterRowsForArchiveTab(prev.rows, archiveStatus)
            const merged = finalizeCampaignStrip([...prev.rows, header, ...funnelRows])
            const nextRows = filterRowsForArchiveTab(merged, archiveStatus)
            const gained = nextRows.length - beforeVisible.length
            return {
              ...prev,
              rows: nextRows,
              totalRows: Math.max(0, prev.totalRows + gained),
            }
          })
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
      return
    }
    if (!row.funnelId) return
    cloneFunnel.mutate(row.funnelId, {
      onSuccess: (pair: IdNamePair) => {
        toast.success('Funnel cloned')
        const newId = String(pair.id ?? '')
        const newName = String(pair.name ?? row.name)
        patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
          if (!prev) return prev
          const ix = prev.rows.findIndex((r) => r.funnelId === row.funnelId)
          if (ix === -1) return prev
          const templateCells = prev.rows[ix]!.cells
          const newRow: CampaignRow = {
            id: newId,
            name: newName,
            cells: cellsForNewFunnel(templateCells, newId, newName),
            campaignId: row.campaignId,
            campaignName: row.campaignName,
            funnelId: newId,
            categoryId: row.campaignId,
            isArchived: false,
          }
          const merged = [...prev.rows.slice(0, ix + 1), newRow, ...prev.rows.slice(ix + 1)]
          return {
            ...prev,
            rows: finalizeCampaignStrip(merged),
            totalRows: prev.totalRows + 1,
          }
        })
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [archiveStatus, cloneCampaign, cloneFunnel, toast, patchStrip])

  const runDelete = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    if (row._isCategoryHeader) {
      deleteCampaign.mutate(row.campaignId, {
        onSuccess: () => {
          toast.success('Campaign deleted')
          patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
            if (!prev) return prev
            const removed = prev.rows.reduce(
              (n, r) => n + (r.campaignId === row.campaignId ? 1 : 0),
              0,
            )
            const nextRowsRaw = prev.rows.filter((r) => r.campaignId !== row.campaignId)
            return {
              ...prev,
              rows: finalizeCampaignStrip(nextRowsRaw),
              totalRows: Math.max(0, prev.totalRows - removed),
            }
          })
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
      return
    }
    if (!row.funnelId) return
    deleteFunnel.mutate(row.funnelId, {
      onSuccess: () => {
        toast.success('Funnel deleted')
        patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
          if (!prev) return prev
          const nextRows = prev.rows.filter((r) => r.funnelId !== row.funnelId)
          return {
            ...prev,
            rows: finalizeCampaignStrip(nextRows),
            totalRows: Math.max(0, prev.totalRows - 1),
          }
        })
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [deleteCampaign, deleteFunnel, toast, patchStrip])

  const runArchive = useCallback(async (row: CampaignRow, archive: boolean) => {
    if (row.id === '__totals__') return
    try {
      if (row._isCategoryHeader) {
        await archiveCampaignRemote(row.campaignId, archive)
        toast.success(archive ? 'Campaign archived' : 'Campaign restored')
        patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
          if (!prev) return prev
          const mapped = prev.rows.map((r) =>
            r.campaignId === row.campaignId ? { ...r, isArchived: archive } : r,
          )
          const nextRows = filterRowsForArchiveTab(mapped, archiveStatus)
          const delta = prev.rows.length - nextRows.length
          return {
            ...prev,
            rows: nextRows,
            totalRows: Math.max(0, prev.totalRows - delta),
          }
        })
      } else if (row.funnelId) {
        await archiveFunnelRemote(row.funnelId, archive)
        toast.success(archive ? 'Funnel archived' : 'Funnel restored')
        patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
          if (!prev) return prev
          const mapped = prev.rows.map((r) =>
            r.funnelId === row.funnelId ? { ...r, isArchived: archive } : r,
          )
          const nextRows = filterRowsForArchiveTab(mapped, archiveStatus)
          const delta = prev.rows.length - nextRows.length
          return {
            ...prev,
            rows: nextRows,
            totalRows: Math.max(0, prev.totalRows - delta),
          }
        })
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [archiveStatus, toast, patchStrip])

  const bulkTargetRows = useMemo(() => {
    const selectedSet = new Set(selectedIds)
    const selectedCampaignIds = new Set(
      controller.rows
        .filter((row) => row._isCategoryHeader && selectedSet.has(row.id))
        .map((row) => row.campaignId),
    )
    return controller.rows.filter((row) => {
      if (row.id === '__totals__' || !selectedSet.has(row.id)) return false
      if (!row._isCategoryHeader && selectedCampaignIds.has(row.campaignId)) return false
      return true
    })
  }, [controller.rows, selectedIds])

  const handleBulkDeselectAll = useCallback(() => setRowSelection({}), [])

  const handleBulkArchive = useCallback(async () => {
    for (const row of bulkTargetRows) {
      await runArchive(row, true)
    }
    setRowSelection({})
  }, [bulkTargetRows, runArchive])

  const handleBulkDelete = useCallback(async () => {
    for (const row of bulkTargetRows) {
      if (row._isCategoryHeader) {
        await deleteCampaign.mutateAsync(row.campaignId)
      } else if (row.funnelId) {
        await deleteFunnel.mutateAsync(row.funnelId)
      }
    }
    toast.success('Selected items deleted')
    setRowSelection({})
    await controller.reload()
  }, [bulkTargetRows, controller, deleteCampaign, deleteFunnel, toast])

  const requestClone = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    setPendingAction({ kind: 'clone', row })
  }, [])

  const requestDelete = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    setPendingAction({ kind: 'delete', row })
  }, [])

  const requestArchive = useCallback((row: CampaignRow, archive: boolean) => {
    if (row.id === '__totals__') return
    setPendingAction({ kind: 'archive', row, archive })
  }, [])

  const handleCancelConfirm = useCallback(() => {
    if (confirmLoading) return
    setPendingAction(null)
  }, [confirmLoading])

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return
    setConfirmLoading(true)
    try {
      if (pendingAction.kind === 'clone') {
        runClone(pendingAction.row)
      } else if (pendingAction.kind === 'delete') {
        runDelete(pendingAction.row)
      } else {
        await runArchive(pendingAction.row, pendingAction.archive)
      }
      setPendingAction(null)
    } finally {
      setConfirmLoading(false)
    }
  }, [pendingAction, runArchive, runClone, runDelete])

  const confirmTitle = useMemo(() => {
    if (!pendingAction) return ''
    if (pendingAction.kind === 'clone') {
      return pendingAction.row._isCategoryHeader ? 'Clone Campaign' : 'Clone Funnel'
    }
    if (pendingAction.kind === 'delete') {
      return pendingAction.row._isCategoryHeader ? 'Delete Campaign' : 'Delete Funnel'
    }
    return pendingAction.archive
      ? (pendingAction.row._isCategoryHeader ? 'Archive Campaign' : 'Archive Funnel')
      : (pendingAction.row._isCategoryHeader ? 'Restore Campaign' : 'Restore Funnel')
  }, [pendingAction])

  const confirmDescription = useMemo(() => {
    if (!pendingAction) return ''
    const label = pendingAction.row.name
    if (pendingAction.kind === 'clone') return `Clone "${label}"?`
    if (pendingAction.kind === 'delete') return `Delete "${label}"? This cannot be undone.`
    return pendingAction.archive
      ? `Archive "${label}"? Archived items are hidden from default active views.`
      : `Restore "${label}" to active view?`
  }, [pendingAction])

  const confirmDanger = pendingAction?.kind === 'delete' || (pendingAction?.kind === 'archive' && pendingAction.archive)

  const columnDefs = useMemo(() => [
    selectionColumn<CampaignRow>(),
    nameColumn<CampaignRow>({
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
    editBtnColumn<CampaignRow>(handleEditClick, { hidden: (row) => row.id === '__totals__' }),
    cloneBtnColumn<CampaignRow>(requestClone, { hidden: (row) => row.id === '__totals__' }),
    archiveBtnColumn<CampaignRow>(requestArchive, {
      hidden: (row) => row.id === '__totals__',
      isArchived: (row) => Boolean(row.isArchived),
    }),
    deleteBtnColumn<CampaignRow>(requestDelete, { hidden: (row) => row.id === '__totals__' }),
    idColumn<CampaignRow>({ hideIdForRow: (row) => Boolean(row._isCategoryHeader) }),
    ...statCols,
  ], [statCols, handleEditClick, requestClone, requestArchive, requestDelete])

  const pinnedBottomRows = useMemo(() => {
    if (controller.rows.length === 0) return undefined
    const row = buildCampaignTotalsRow(controller.totalsCells)
    return row ? [row] : undefined
  }, [controller.rows.length, controller.totalsCells])

  const pageBodyState = controller.error
    ? {
        status: 'error' as const,
        message: getErrorMessage(controller.error),
        onRetry: () => void controller.reload(),
      }
    : controller.isLoading && controller.rows.length === 0
      ? { status: 'loading' as const }
      : { status: 'ready' as const }

  const handleDateRangeChange = useCallback((value: { from?: Date; to?: Date }) => {
    if (value.from && value.to) {
      setDateRange({ from: value.from, to: value.to })
      setPagination((previous) => ({ ...previous, pageIndex: 0 }))
    }
  }, [])

  const handleArchiveStatusChange = useCallback((status: 'active' | 'archived' | 'all') => {
    setArchiveStatus(status)
    setPagination((previous) => ({ ...previous, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback((nextPagination: PaginationState) => {
    setPagination({
      pageIndex: Math.max(0, nextPagination.pageIndex),
      pageSize: Math.min(CAMPAIGNS_MAX_PAGE_SIZE, Math.max(1, nextPagination.pageSize)),
    })
  }, [])

  const handleTableColumnSizingChange = useCallback((sizing: Record<string, number>) => {
    setColumnSizing(TABLE_KEY, sizing)
  }, [setColumnSizing])

  const handleTableColumnVisibilityChange = useCallback((vis: VisibilityState) => {
    setColumnVisibility(TABLE_KEY, vis)
  }, [setColumnVisibility])

  const handleChooserColumnsChange = useCallback((next: Set<string>) => {
    const allIds = [...metricColumnIdsForScope(), 'id']
    setColumnVisibility(
      TABLE_KEY,
      Object.fromEntries(allIds.map((id) => [id, next.has(id)])),
    )
  }, [setColumnVisibility])

  return (
    <EntityPage<CampaignRow>
      title="Campaigns"
      bodyState={pageBodyState}
      headerActions={(
        <>
          <Button
            type="primary"
            disabled={!canEditCampaigns}
            onClick={() => {
              setAddFunnelModalKey((n) => n + 1)
              setAddFunnelModalOpen(true)
            }}
          >
            Add Funnel
          </Button>
          <Button type="primary" onClick={() => setCampaignModal({ mode: 'create' })}>
            Add Campaign
          </Button>
        </>
      )}
      topContent={controller.error ? (
        <Alert
          type="error"
          showIcon
          message="Campaign data failed to load"
          description={getErrorMessage(controller.error)}
          className="mb-3"
        />
      ) : null}
      searchToolbarProps={{
        value: search,
        onChange: setSearch,
        placeholder: 'Search campaigns...',
        onRefresh: () => void controller.reload(),
        refreshLoading: controller.isFetching,
        filters: (
          <ArchiveToggle value={archiveStatus} onChange={handleArchiveStatusChange} />
        ),
        trailing: (
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={handleDateRangeChange}
              density="compact"
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        ),
        actions: tableForChooser ? (
          <ColumnChooser
            columns={columnDefs}
            table={tableForChooser}
            storageKey="campaigns"
            defaultVisibleColumnIds={defaultColIds}
            selectedCols={selectedColumnIds}
            onColumnsChange={handleChooserColumnsChange}
          />
        ) : null,
      }}
      tableProps={{
        data: controller.rows,
        columns: columnDefs,
        loading: controller.isLoading || controller.isFetching,
        getRowId: entityRowId,
        tableConfigKey: TABLE_KEY,
        sorting: controller.sorting,
        onSortingChange: controller.handleSortingChange,
        manualSorting: true,
        pagination,
        onPaginationChange: handlePaginationChange,
        manualPagination: true,
        pageCount: controller.pageCount,
        manualPaginationTotalRows: controller.totalRows,
        pageSizeOptions: [25, 50, 100, 200],
        pinnedBottomRows,
        enableRowSelection: canSelectCampaignRow,
        rowSelection,
        onRowSelectionChange: handleRowSelectionChange,
        rowClassName: campaignRowClassName,
        tableRef,
        onTableInstance: setTableForChooser,
        columnSizing: tableConfig.columnSizing,
        onColumnSizingChange: handleTableColumnSizingChange,
        columnVisibility: tableConfig.columnVisibility,
        onColumnVisibilityChange: handleTableColumnVisibilityChange,
        emptyMessage: search ? 'No campaigns or funnels match your search.' : 'No campaigns found.',
      }}
      bulkActions={(
        <BulkActionsBar
          count={bulkTargetRows.length}
          onDeselectAll={handleBulkDeselectAll}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          archiveLabel="Archive"
        />
      )}
      overlays={(
        <>
          <AddFunnelModal
            key={addFunnelModalKey}
            open={addFunnelModalOpen}
            onClose={() => setAddFunnelModalOpen(false)}
          />
          <CampaignEditorModal
            open={campaignModal !== null}
            mode={campaignModal?.mode === 'edit' ? 'edit' : 'create'}
            campaignId={campaignModal?.mode === 'edit' ? campaignModal.campaignId : null}
            onClose={() => setCampaignModal(null)}
            onSaved={handleCampaignPersisted}
          />
          <ConfirmModal
            open={Boolean(pendingAction)}
            onCancel={handleCancelConfirm}
            title={confirmTitle}
            description={confirmDescription}
            onConfirm={() => void handleConfirmAction()}
            loading={confirmLoading}
            danger={Boolean(confirmDanger)}
          />
        </>
      )}
    />
  )
}
