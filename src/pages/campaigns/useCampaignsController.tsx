import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PaginationState, RowSelectionState, SortingState, Table, Updater, VisibilityState } from '@tanstack/react-table'
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
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import { api } from '@/api/client'
import { executeObservedRequest } from '@/api/observedRequest'
import { invalidateCampaignFunnelAuxiliary } from '@/api/invalidations'
import { queryKeys } from '@/api/queryKeys'
import { ENTITY_GRID_LIST_KEY } from '@/lib/entity-table/data/queryCache'
import { mapStatColsForCategoryStrip } from '@/lib/entity-table/engine/categoryStripTable.tsx'
import { syncCategoryStripRowSelection } from '@/lib/entity-table/engine/categoryStripSelection'
import { paginateAtomicCategorySegments } from '@/lib/entity-table/engine/paginateCategorySegments'
import { defaultColIds } from '@/lib/entity-table/columns/defaultColIds'
import type { CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import type { CreatedFunnelSummary } from '@/pages/campaigns/AddFunnelModal'
import type { CloneFunnelSource } from '@/pages/campaigns/CloneFunnelModal'
import {
  addFunnelToStatic,
  cloneCampaignInStatic,
  removeCampaignFromStatic,
  removeFunnelFromStatic,
  setArchiveOnStatic,
  upsertCampaignInStatic,
} from '@/pages/campaigns/campaignStaticPatch'
import {
  buildSortedCampaignSegments,
  filterCampaignFunnelRows,
  mapMergedRowsToCampaignFunnels,
} from '@/pages/campaigns/campaignTreeMerge'
import { fetchCampaignTreeStaticData, type CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import {
  metricColumnIdsForScope,
  visibleMetricColumnIdsFromVisibility,
} from '@/lib/drilldownMetrics'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { ReportCell } from '@/types/stats'
import type { Campaign, Funnel, IdName, IdNamePair } from '@/types/entities'
import { useAuthStore } from '@/store/auth'
import { useEntityTableFiltersStore } from '@/store/entityTableFilters'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
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
const DEFAULT_PAGE_SIZE = 50

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
  const tz = useEntityTableFiltersStore((state) => state.timezone)
  const setTz = useEntityTableFiltersStore((state) => state.setTimezone)
  const dateRange = useEntityTableFiltersStore((state) => state.dateRange)
  const setDateRange = useEntityTableFiltersStore((state) => state.setDateRange)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
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
  const setTableSorting = useTableConfigStore((state) => state.setSorting)
  const setColumnSizing = useTableConfigStore((state) => state.setColumnSizing)
  const setColumnVisibility = useTableConfigStore((state) => state.setColumnVisibility)
  const effectiveSorting = tableConfig.sorting.length > 0 ? tableConfig.sorting : DEFAULT_TABLE_SORTING

  const metricColumnIds = useMemo(
    () => visibleMetricColumnIdsFromVisibility(tableConfig.columnVisibility, {
      defaultVisibleColumnIds: defaultColIds,
    }),
    [tableConfig.columnVisibility],
  )
  const selectedColumnIds = useMemo(() => {
    const selected = new Set(metricColumnIds)
    if (tableConfig.columnVisibility.id ?? true) selected.add('id')
    return selected
  }, [metricColumnIds, tableConfig.columnVisibility.id])

  const queryKeyPrefix = useMemo(
    () => [...queryKeys.campaignStrip.all, archiveStatus] as const,
    [archiveStatus],
  )

  const listQueryFn = useCallback(async () => {
    const staticData = await queryClient.fetchQuery({
      queryKey: queryKeys.campaignStrip.static(archiveStatus),
      queryFn: () => fetchCampaignTreeStaticData(archiveStatus),
    })
    return staticData.orderedFunnels.map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
      campaignId: funnel.campaignId,
      campaignName: funnel.campaignName,
      isArchived: funnel.isArchived,
      categoryId: funnel.campaignId,
    }))
  }, [queryClient, archiveStatus])

  const entityGrid = useEntityGrid({
    queryKeyPrefix,
    listQueryFn,
    groupBy: 'Element: Funnel',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metricColumnIds,
    includeMissingAssets: false,
    enabled: true,
  })

  const invalidateCampaignList = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeyPrefix,
      predicate: (query) => {
        const key = query.queryKey as unknown[]
        return key.includes(ENTITY_GRID_LIST_KEY)
      },
    })
  }, [queryClient, queryKeyPrefix])

  const patchStaticHierarchy = useCallback((
    updater: (prev: CampaignTreeStaticData | undefined) => CampaignTreeStaticData | undefined,
  ) => {
    queryClient.setQueryData(
      queryKeys.campaignStrip.static(archiveStatus),
      updater,
    )
    invalidateCampaignList()
  }, [queryClient, archiveStatus, invalidateCampaignList])

  const searchLower = search.trim().toLowerCase()
  const funnelRows = useMemo(
    () => mapMergedRowsToCampaignFunnels(entityGrid.mergedRows),
    [entityGrid.mergedRows],
  )
  const filteredFunnels = useMemo(
    () => filterCampaignFunnelRows(funnelRows, searchLower),
    [funnelRows, searchLower],
  )
  const segments = useMemo(
    () => buildSortedCampaignSegments(filteredFunnels, entityGrid.reportColumns, effectiveSorting),
    [filteredFunnels, entityGrid.reportColumns, effectiveSorting],
  )
  const pageSlice = useMemo(
    () => paginateAtomicCategorySegments(segments, pagination.pageIndex, pagination.pageSize),
    [segments, pagination.pageIndex, pagination.pageSize],
  )

  useEffect(() => {
    queueMicrotask(() => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    })
  }, [search, archiveStatus])

  useEffect(() => {
    if (pagination.pageIndex > pageSlice.pageCount - 1 && pageSlice.pageCount > 0) {
      queueMicrotask(() => {
        setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, pageSlice.pageCount - 1) }))
      })
    }
  }, [pagination.pageIndex, pageSlice.pageCount])

  const handleSortingChange = useCallback((nextSorting: SortingState) => {
    setTableSorting(TABLE_KEY, nextSorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setTableSorting])

  const grid = useMemo(() => ({
    rows: pageSlice.pageRows,
    pageCount: pageSlice.pageCount,
    totalRows: pageSlice.totalDataCount,
    columns: entityGrid.reportColumns,
    totalsCells: entityGrid.totalsCells,
    sorting: effectiveSorting,
    handleSortingChange,
    isLoading: entityGrid.isLoading,
    isFetching: entityGrid.isFetching,
    isLoadingMore: entityGrid.isLoadingMore,
    error: entityGrid.error,
    reload: entityGrid.refetch,
  }), [
    pageSlice.pageRows,
    pageSlice.pageCount,
    pageSlice.totalDataCount,
    entityGrid.reportColumns,
    entityGrid.totalsCells,
    entityGrid.isLoading,
    entityGrid.isFetching,
    entityGrid.isLoadingMore,
    entityGrid.error,
    entityGrid.refetch,
    effectiveSorting,
    handleSortingChange,
  ])

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

  const handleCampaignPersisted = useCallback((saved: Campaign) => {
    patchStaticHierarchy((prev) => (prev ? upsertCampaignInStatic(prev, saved) : prev))
  }, [patchStaticHierarchy])

  const handleFunnelCreated = useCallback((created: CreatedFunnelSummary) => {
    patchStaticHierarchy((prev) => (prev ? addFunnelToStatic(prev, created) : prev))
  }, [patchStaticHierarchy])

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

  const runClone = useCallback(async (row: CampaignRow) => {
    if (row.id === '__totals__') return
    if (!row._isCategoryHeader) return
    try {
      const pair: IdNamePair = await cloneCampaign.mutateAsync(row.campaignId)
      toast.success('Campaign cloned')
      const newCampId = String(pair.id ?? '')
      const newName = String(pair.name ?? '')
      let funnelList: IdName[] = []
      try {
        funnelList = await executeObservedRequest(queryClient, () =>
          api.get<IdName[]>('/data/campaign/funnel/list/', { idCampaign: newCampId }),
        )
      } catch {
        funnelList = []
      }
      patchStaticHierarchy((prev) =>
        prev ? cloneCampaignInStatic(prev, row.campaignId, newCampId, newName, funnelList) : prev,
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [cloneCampaign, patchStaticHierarchy, queryClient, toast])

  const runDelete = useCallback(async (row: CampaignRow) => {
    if (row.id === '__totals__') return
    try {
      if (row._isCategoryHeader) {
        await deleteCampaign.mutateAsync(row.campaignId)
        toast.success('Campaign deleted')
        patchStaticHierarchy((prev) => (prev ? removeCampaignFromStatic(prev, row.campaignId) : prev))
        return
      }
      if (!row.funnelId) return
      await deleteFunnel.mutateAsync(row.funnelId)
      toast.success('Funnel deleted')
      patchStaticHierarchy((prev) => (prev ? removeFunnelFromStatic(prev, row.funnelId!) : prev))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [deleteCampaign, deleteFunnel, toast, patchStaticHierarchy])

  const runArchive = useCallback(async (row: CampaignRow, archive: boolean) => {
    if (row.id === '__totals__') return
    try {
      if (row._isCategoryHeader) {
        await executeObservedRequest(queryClient, () =>
          archiveCampaignRemote(row.campaignId, archive),
        )
        toast.success(archive ? 'Campaign archived' : 'Campaign restored')
        patchStaticHierarchy((prev) =>
          prev ? setArchiveOnStatic(prev, archiveStatus, row.campaignId, null, archive) : prev,
        )
      } else if (row.funnelId) {
        await executeObservedRequest(queryClient, () =>
          archiveFunnelRemote(row.funnelId!, archive),
        )
        toast.success(archive ? 'Funnel archived' : 'Funnel restored')
        patchStaticHierarchy((prev) =>
          prev ? setArchiveOnStatic(prev, archiveStatus, null, row.funnelId!, archive) : prev,
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all }),
        invalidateCampaignFunnelAuxiliary(queryClient),
      ])
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [archiveStatus, toast, patchStaticHierarchy, queryClient])

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
        await runClone(pendingAction.row)
      } else if (pendingAction.kind === 'delete') {
        await runDelete(pendingAction.row)
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

  const confirmText = useMemo(() => {
    if (!pendingAction) return 'Confirm'
    if (pendingAction.kind === 'clone') return 'Clone'
    if (pendingAction.kind === 'delete') return 'Delete'
    return pendingAction.archive ? 'Archive' : 'Restore'
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
  }, [setDateRange])

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
      pageSize: Math.max(1, nextPagination.pageSize),
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
    confirmText,
    confirmDanger,
    handleCancelConfirm,
    handleConfirmAction,
  }
}
