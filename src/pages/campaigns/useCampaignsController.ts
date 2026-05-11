import { useState, useMemo, useCallback, useRef } from 'react'
import type { ExpandedState, RowSelectionState, Table, VisibilityState } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subDays } from 'date-fns'
import { useToastApi } from '@/components/ui-kit'
import { useTableConfigStore, selectTableConfig } from '@/store/tableConfig'
import {
  useSaveCampaign,
  useDeleteCampaign,
  useCloneCampaign,
  useCampaign,
  useSaveFunnel,
  useDeleteFunnel,
  useCloneFunnel,
  type SaveCampaignInput,
} from '@/api/hooks'
import type { MoveFunnelTarget } from '@/pages/campaigns/MoveFunnelModal'
import type { Funnel } from '@/types/entities'
import type { CampaignTreeRow } from '@/pages/campaigns/campaignTreeUtils'
import { loadCampaignPageData } from '@/pages/campaigns/campaignLoad'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { ReportCell } from '@/types/stats'
import type { CampaignFormData } from '@/schemas/campaign'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import { createDefaultEntranceApiNode } from '@/lib/defaultNewFunnelNodes'
import { generateId } from '@/lib/id-generator'
import {
  metricColumnIdsForScope,
  metricsForColumnIds,
  visibleMetricColumnIdsFromVisibility,
} from '@/lib/drilldownMetrics'
import { defaultColIds } from '@/lib/entityPageDefaultColIds'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'

const TABLE_KEY = 'campaigns'

export function isCampaignTotalsRow(row: CampaignTreeRow): boolean {
  return row.id === '__totals__'
}

export function buildCampaignTotalsRow(cells: ReportCell[] | null | undefined): CampaignTreeRow | null {
  if (!cells?.length) return null
  return {
    id: '__totals__',
    name: 'Totals',
    cells,
    kind: 'campaign',
    campaignId: '',
  }
}

function findCampaignRowById(rows: CampaignTreeRow[], id: string): CampaignTreeRow | undefined {
  for (const row of rows) {
    if (row.id === id) return row
    const nested = row._children && findCampaignRowById(row._children, id)
    if (nested) return nested
  }
  return undefined
}

async function archiveFunnelRemote(funnelId: string): Promise<void> {
  const funnel = await api.get<Funnel>('/data/campaign/funnel/find/byId/', {
    idFunnel: funnelId,
    loadDependencies: 'true',
  })
  await api.put<Funnel>('/data/campaign/funnel/save/', { ...funnel, isArchived: true }, {
    deleteDependencies: 'false',
  })
}

export function useCampaignsController() {
  const toast = useToastApi()
  const navigate = useNavigate()
  const tableRef = useRef<Table<CampaignTreeRow> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<CampaignTreeRow> | null>(null)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: 'campaign' | 'funnel' } | null>(null)
  const [addCombinedOpen, setAddCombinedOpen] = useState(false)
  const [funnelPrefillCampaignId, setFunnelPrefillCampaignId] = useState<string | null>(null)
  const [addModalKey, setAddModalKey] = useState(0)
  const [moveFunnelTarget, setMoveFunnelTarget] = useState<MoveFunnelTarget | MoveFunnelTarget[] | null>(null)
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})

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

  const { data: editCampaign } = useCampaign(editId ?? '')
  const saveMutation = useSaveCampaign()
  const deleteMutation = useDeleteCampaign()
  const cloneMutation = useCloneCampaign()
  const saveFunnel = useSaveFunnel()
  const deleteFunnel = useDeleteFunnel()
  const cloneFunnel = useCloneFunnel()

  const loadCampaignData = useCallback(() => loadCampaignPageData({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    ...(reportMetrics ? { reportMetrics } : {}),
  }), [dateRange.from, dateRange.to, tz, reportMetrics])

  const {
    data: campaignData,
    isLoading,
    isFetching,
    error,
    refetch: reload,
  } = useQuery({
    queryKey: [
      ...queryKeys.campaigns.all,
      'hierarchy-report',
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
      tz,
      reportMetrics ?? 'allMetrics',
    ],
    queryFn: loadCampaignData,
  })

  const treeData = useMemo(() => campaignData?.treeData ?? [], [campaignData?.treeData])
  const columns = useMemo(() => campaignData?.columns ?? [], [campaignData?.columns])
  const totalsCells = campaignData?.totalsCells ?? null
  const campaignLoadError = error ? getErrorMessage(error) : null

  const filtered = useMemo(() => {
    if (!search) return treeData
    const searchLower = search.toLowerCase()
    return treeData.filter((row) => {
      if (row.name.toLowerCase().includes(searchLower)) return true
      return row._children?.some((child) => child.name.toLowerCase().includes(searchLower))
    })
  }, [treeData, search])

  const pinnedBottomRows = useMemo(() => {
    if (filtered.length === 0) return undefined
    const row = buildCampaignTotalsRow(totalsCells)
    return row ? [row] : undefined
  }, [totalsCells, filtered.length])

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  const openAddCampaignOrFunnel = useCallback((prefillCampaignId?: string | null) => {
    setFunnelPrefillCampaignId(prefillCampaignId ?? null)
    setAddModalKey((key) => key + 1)
    setAddCombinedOpen(true)
  }, [])

  const handleOpenCampaignFormFromCombined = () => {
    setEditId(null)
    setSheetOpen(true)
  }

  const handleCreate = () => openAddCampaignOrFunnel()
  const handleOpenFunnelEditor = useCallback((campaignId: string, funnelId: string) => {
    navigate(`/campaigns/${campaignId}/funnels/${funnelId}`)
  }, [navigate])
  const handleEdit = useCallback((id: string) => { setEditId(id); setSheetOpen(true) }, [])

  const handleSubmit = (data: CampaignFormData) => {
    const isNew = !data.idCampaign || data.idCampaign === '0'
    const payload: SaveCampaignInput = {
      ...data,
      idCampaign: isNew ? generateId() : data.idCampaign,
      create: isNew,
    }
    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isNew ? 'Campaign created' : 'Campaign updated')
        setSheetOpen(false)
        setEditId(null)
        void reload()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleCloneCampaign = useCallback((id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Campaign cloned'); void reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneMutation, reload, toast])

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'campaign') {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); void reload() },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
      return
    }
    deleteFunnel.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); void reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleQuickCreateCampaign = async (name: string) => {
    const idCampaign = generateId()
    try {
      await saveMutation.mutateAsync({
        create: true,
        idCampaign,
        campaignName: name.trim(),
        acculumatedUrlParams: [],
        customTokens: [],
        isArchived: false,
      })
      toast.success('Campaign created')
      void reload()
      return idCampaign
    } catch (err) {
      toast.error(getErrorMessage(err))
      throw err
    }
  }

  const handleCreateFunnelFromModal = ({
    campaignId,
    funnelName,
    openEditor,
  }: {
    campaignId: string
    funnelName: string
    openEditor: boolean
  }) => {
    const idFunnel = generateId()
    const idEntranceNode = generateId()
    saveFunnel.mutate(
      {
        create: true,
        idFunnel,
        idCampaign: campaignId,
        funnelName,
        defaultCostPerEntrance: '0',
        canvasWidth: 2000,
        canvasHeight: 1500,
        nodes: [createDefaultEntranceApiNode(idFunnel, idEntranceNode)],
        connections: [],
      },
      {
        onSuccess: () => {
          toast.success('Funnel created')
          setAddCombinedOpen(false)
          void reload()
          if (openEditor) {
            navigate(`/campaigns/${campaignId}/funnels/${idFunnel}`)
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const handleCloneFunnel = useCallback((funnelId: string) => {
    cloneFunnel.mutate(funnelId, {
      onSuccess: () => { toast.success('Funnel cloned'); void reload() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneFunnel, reload, toast])

  const openMoveFunnelModal = useCallback((row: CampaignTreeRow) => {
    if (row.kind !== 'funnel' || !row.funnelId) return
    setMoveFunnelTarget({
      funnelId: row.funnelId,
      funnelName: row.name,
      currentCampaignId: row.campaignId,
    })
  }, [])

  const handleBulkDeselectAll = useCallback(() => {
    setRowSelection({})
  }, [])

  const handleBulkMoveFunnels = useCallback(() => {
    const targets: MoveFunnelTarget[] = []
    for (const id of selectedIds) {
      const row = findCampaignRowById(treeData, id)
      if (row?.kind === 'funnel' && row.funnelId) {
        targets.push({
          funnelId: row.funnelId,
          funnelName: row.name,
          currentCampaignId: row.campaignId,
        })
      }
    }
    if (targets.length === 0) {
      toast.error('Select one or more funnels to move')
      return
    }
    setMoveFunnelTarget(targets.length === 1 ? targets[0]! : targets)
  }, [selectedIds, treeData, toast])

  const handleBulkArchiveFunnels = useCallback(async () => {
    let archived = 0
    for (const id of selectedIds) {
      const row = findCampaignRowById(treeData, id)
      if (row?.kind !== 'funnel' || !row.funnelId) continue
      try {
        await archiveFunnelRemote(row.funnelId)
        archived += 1
      } catch (err) {
        toast.error(getErrorMessage(err))
        return
      }
    }
    if (archived === 0) {
      toast.error('Select funnels to archive')
      return
    }
    toast.success(archived === 1 ? 'Funnel archived' : `${archived} funnels archived`)
    setRowSelection({})
    void reload()
  }, [selectedIds, treeData, toast, reload])

  const handleBulkDeleteSelection = useCallback(async () => {
    for (const id of selectedIds) {
      const row = findCampaignRowById(treeData, id)
      if (row?.kind === 'campaign') {
        await deleteMutation.mutateAsync(row.campaignId)
      } else if (row?.kind === 'funnel' && row.funnelId) {
        await deleteFunnel.mutateAsync(row.funnelId)
      }
    }
    toast.success('Selected items deleted')
    setRowSelection({})
    void reload()
  }, [selectedIds, treeData, deleteMutation, deleteFunnel, toast, reload])

  const handleDateRangeChange = useCallback((value: DateRange & { preset: string | null }) => {
    if (value.from && value.to) setDateRange({ from: value.from, to: value.to })
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

  const handleCloseAddCombinedModal = useCallback(() => setAddCombinedOpen(false), [])
  const handleCloseMoveFunnelModal = useCallback(() => setMoveFunnelTarget(null), [])

  const handleCampaignEditOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) setEditId(null)
  }, [])

  const handleDismissDeleteCampaignOrFunnel = useCallback(() => setDeleteTarget(null), [])

  const getSubRows = useCallback((row: CampaignTreeRow) => row._children, [])

  const statCols = useMemo(
    () => buildColumnsFromReport<CampaignTreeRow>(columns),
    [columns],
  )

  return {
    tableRef,
    tableForChooser,
    setTableForChooser,
    search,
    setSearch,
    sheetOpen,
    editId,
    deleteTarget,
    setDeleteTarget,
    addCombinedOpen,
    funnelPrefillCampaignId,
    addModalKey,
    moveFunnelTarget,
    tz,
    setTz,
    dateRange,
    rowSelection,
    setRowSelection,
    expanded,
    setExpanded,
    tableConfig,
    selectedColumnIds,
    editCampaign,
    saveMutation,
    deleteMutation,
    saveFunnel,
    deleteFunnel,
    isLoading,
    isFetching,
    campaignLoadError,
    filtered,
    pinnedBottomRows,
    selectedIds,
    handleCreate,
    handleOpenCampaignFormFromCombined,
    handleOpenFunnelEditor,
    handleEdit,
    handleSubmit,
    handleCloneCampaign,
    handleDelete,
    handleQuickCreateCampaign,
    handleCreateFunnelFromModal,
    handleCloneFunnel,
    openAddCampaignOrFunnel,
    openMoveFunnelModal,
    handleBulkDeselectAll,
    handleBulkMoveFunnels,
    handleBulkArchiveFunnels,
    handleBulkDeleteSelection,
    handleDateRangeChange,
    handleTableColumnSizingChange,
    handleTableColumnVisibilityChange,
    handleChooserColumnsChange,
    handleCloseAddCombinedModal,
    handleCloseMoveFunnelModal,
    handleCampaignEditOpenChange,
    handleDismissDeleteCampaignOrFunnel,
    getSubRows,
    statCols,
    reload,
  }
}
