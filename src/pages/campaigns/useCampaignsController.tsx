import { useCallback, useMemo, useRef, useState } from 'react'
import type { PaginationState, RowSelectionState, Table, Updater, VisibilityState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useToastApi } from '@/components/ui-kit'
import {
  archiveBtnColumn,
  buildColumnsFromReport,
  cloneBtnColumn,
  deleteBtnColumn,
  editBtnColumn,
  nameColumn,
  selectionColumn,
  idColumn,
} from '@/components/ui-kit/data-table'
import {
  useCloneCampaign,
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
import type { CreatedFunnelSummary } from '@/pages/campaigns/AddFunnelModal'
import type { CloneFunnelSource } from '@/pages/campaigns/CloneFunnelModal'
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
import type { PageShellBodyState } from '@/components/ui-kit'

type PendingAction =
  | { kind: 'clone'; row: CampaignRow }
  | { kind: 'delete'; row: CampaignRow }
  | { kind: 'archive'; row: CampaignRow; archive: boolean }

export type CampaignModalState =
  | null
  | { mode: 'create' }
  | { mode: 'edit'; campaignId: string }

const TABLE_KEY = 'campaigns'
const CAMPAIGNS_MAX_PAGE_SIZE = 200

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

export function useCampaignsController() {
  const queryClient = useQueryClient()
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
  const [campaignModal, setCampaignModal] = useState<CampaignModalState>(null)
  const [addFunnelModalOpen, setAddFunnelModalOpen] = useState(false)
  const [addFunnelModalKey, setAddFunnelModalKey] = useState(0)
  const [cloneFunnelSource, setCloneFunnelSource] = useState<CloneFunnelSource | null>(null)
  const [cloneFunnelModalKey, setCloneFunnelModalKey] = useState(0)
  const canEditCampaigns = useAuthStore((s) => Boolean(s.user?.permissions.campaigns.canEdit))
  const cloneCampaign = useCloneCampaign()
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

  const loadPageData = useMemo(
    () => createCampaignTreeLoadPageData(archiveStatus, queryClient),
    [archiveStatus, queryClient],
  )

  const grid = useEntityTable<CampaignRow>({
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
    applySearchInLoadPage: true,
    filterRows: filterCampaignStripRows,
    sortRows: (rows) => rows,
  })

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return syncCategoryStripRowSelection(prev, next, grid.rows)
      })
    },
    [grid.rows],
  )

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])
  const patchStrip = grid.setCachedPage

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

  const handleFunnelCreated = useCallback((created: CreatedFunnelSummary) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaignStrip.static(archiveStatus) })
    const { idFunnel, funnelName, idCampaign } = created
    patchStrip((prev): AssetTableEnginePageData<CampaignRow> | undefined => {
      if (!prev) return prev
      const headerIx = prev.rows.findIndex(
        (row) => row._isCategoryHeader && row.campaignId === idCampaign,
      )
      if (headerIx === -1) return prev
      const header = prev.rows[headerIx]!
      const templateCells = findTemplateFunnelRow(prev.rows, idCampaign)?.cells
        ?? [{ raw: '0', formatted: '-' }]
      const newRow: CampaignRow = {
        id: idFunnel,
        name: funnelName,
        cells: cellsForNewFunnel(templateCells, idFunnel, funnelName),
        campaignId: idCampaign,
        campaignName: header.campaignName ?? header.name,
        funnelId: idFunnel,
        categoryId: idCampaign,
        isArchived: false,
      }
      if (!passesArchiveTab(newRow, archiveStatus)) return prev
      let insertAt = headerIx + 1
      while (
        insertAt < prev.rows.length
        && !prev.rows[insertAt]!._isCategoryHeader
        && prev.rows[insertAt]!.campaignId === idCampaign
      ) {
        insertAt += 1
      }
      const beforeVisible = filterRowsForArchiveTab(prev.rows, archiveStatus)
      const merged = finalizeCampaignStrip([
        ...prev.rows.slice(0, insertAt),
        newRow,
        ...prev.rows.slice(insertAt),
      ])
      const nextRows = filterRowsForArchiveTab(merged, archiveStatus)
      const gained = nextRows.length - beforeVisible.length
      return {
        ...prev,
        rows: nextRows,
        totalRows: Math.max(0, prev.totalRows + gained),
      }
    })
  }, [archiveStatus, patchStrip, queryClient])

  const statCols = useMemo(
    () => mapStatColsForCategoryStrip(buildColumnsFromReport<CampaignRow>(grid.columns)),
    [grid.columns],
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
    }
  }, [archiveStatus, cloneCampaign, toast, patchStrip])

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
      grid.rows
        .filter((row) => row._isCategoryHeader && selectedSet.has(row.id))
        .map((row) => row.campaignId),
    )
    return grid.rows.filter((row) => {
      if (row.id === '__totals__' || !selectedSet.has(row.id)) return false
      if (!row._isCategoryHeader && selectedCampaignIds.has(row.campaignId)) return false
      return true
    })
  }, [grid.rows, selectedIds])

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
    await grid.reload()
  }, [bulkTargetRows, grid, deleteCampaign, deleteFunnel, toast])

  const requestClone = useCallback((row: CampaignRow) => {
    if (row.id === '__totals__') return
    if (row._isCategoryHeader) {
      setPendingAction({ kind: 'clone', row })
      return
    }
    if (!row.funnelId) return
    setCloneFunnelModalKey((key) => key + 1)
    setCloneFunnelSource({
      funnelId: row.funnelId,
      funnelName: row.name,
      campaignId: row.campaignId,
    })
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
      return 'Clone Campaign'
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
    if (grid.rows.length === 0) return undefined
    const row = buildCampaignTotalsRow(grid.totalsCells)
    return row ? [row] : undefined
  }, [grid.rows.length, grid.totalsCells])

  const pageBodyState = useMemo((): PageShellBodyState => {
    const { error, isLoading, rows, reload } = grid
    if (error) {
      return {
        status: 'error',
        message: getErrorMessage(error),
        onRetry: () => void reload(),
      }
    }
    if (isLoading && rows.length === 0) {
      return { status: 'loading' }
    }
    return { status: 'ready' }
  }, [grid])

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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
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

  const handleOpenAddFunnel = useCallback(() => {
    setAddFunnelModalKey((n) => n + 1)
    setAddFunnelModalOpen(true)
  }, [])

  const handleOpenCreateCampaign = useCallback(() => {
    setCampaignModal({ mode: 'create' })
  }, [])

  const handleCloseAddFunnel = useCallback(() => {
    setAddFunnelModalOpen(false)
  }, [])

  const handleCloseCloneFunnel = useCallback(() => {
    setCloneFunnelSource(null)
  }, [])

  const handleCloseCampaignModal = useCallback(() => {
    setCampaignModal(null)
  }, [])

  const handleRefresh = useCallback(() => {
    void grid.reload()
  }, [grid])

  return {
    tableRef,
    tableForChooser,
    setTableForChooser,
    grid,
    columnDefs,
    pinnedBottomRows,
    pageBodyState,
    search,
    handleSearchChange,
    archiveStatus,
    handleArchiveStatusChange,
    dateRange,
    handleDateRangeChange,
    tz,
    setTz,
    pagination,
    handlePaginationChange,
    rowSelection,
    handleRowSelectionChange,
    bulkTargetRows,
    handleBulkDeselectAll,
    handleBulkArchive,
    handleBulkDelete,
    tableConfig,
    handleTableColumnSizingChange,
    handleTableColumnVisibilityChange,
    selectedColumnIds,
    handleChooserColumnsChange,
    canEditCampaigns,
    handleOpenAddFunnel,
    handleOpenCreateCampaign,
    handleCloseAddFunnel,
    handleCloseCloneFunnel,
    handleCloseCampaignModal,
    handleRefresh,
    addFunnelModalOpen,
    setAddFunnelModalOpen,
    addFunnelModalKey,
    cloneFunnelSource,
    setCloneFunnelSource,
    cloneFunnelModalKey,
    campaignModal,
    setCampaignModal,
    handleFunnelCreated,
    handleCampaignPersisted,
    pendingAction,
    confirmLoading,
    confirmTitle,
    confirmDescription,
    confirmDanger,
    handleCancelConfirm,
    handleConfirmAction,
  }
}
