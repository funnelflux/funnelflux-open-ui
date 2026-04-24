import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, ExpandedState, Table, VisibilityState } from '@tanstack/react-table'
import { Button } from '@/components/ui-kit'
import {
  PageShell,
  SearchToolbar,
  DataTable,
  ConfirmModal,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import {
  nameColumn,
  idColumn,
  selectionColumn,
  editBtnColumn,
  cloneBtnColumn,
  deleteBtnColumn,
  addFunnelOrMoveColumn,
  buildColumnsFromReport,
  entityRowId,
} from '@/components/ui-kit/data-table'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
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
import { CampaignEditForm } from './CampaignEditForm'
import { AddCampaignOrFunnelModal } from './AddCampaignOrFunnelModal'
import { MoveFunnelModal, type MoveFunnelTarget } from './MoveFunnelModal'
import type { Funnel } from '@/types/entities'
import {
  buildCampaignTreeFromMysqlAndFlatFunnelReport,
  type CampaignHierarchyResponse,
  type CampaignTreeRow,
} from './campaignTreeUtils'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'
import type { CampaignFormData } from '@/schemas/campaign'
import { getErrorMessage, selectedRowIds } from '@/lib/utils'
import type { DateRange } from '@/lib/date-presets'
import { generateId } from '@/lib/id-generator'

function isCampaignTotalsRow(row: CampaignTreeRow): boolean {
  return row.id === '__totals__'
}

function buildCampaignTotalsRow(cells: ReportCell[] | null | undefined): CampaignTreeRow | null {
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
  for (const r of rows) {
    if (r.id === id) return r
    const nested = r._children && findCampaignRowById(r._children, id)
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

const TABLE_KEY = 'campaigns'

export function CampaignsPage() {
  const toast = useToastApi()
  const navigate = useNavigate()
  const tableRef = useRef<Table<CampaignTreeRow> | null>(null)
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
  const [treeData, setTreeData] = useState<CampaignTreeRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [totalsCells, setTotalsCells] = useState<ReportCell[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const tableConfig = useTableConfigStore(selectTableConfig(TABLE_KEY))
  const setColumnSizing = useTableConfigStore((s) => s.setColumnSizing)
  const setColumnVisibility = useTableConfigStore((s) => s.setColumnVisibility)

  const { data: editCampaign } = useCampaign(editId ?? '')
  const saveMutation = useSaveCampaign()
  const deleteMutation = useDeleteCampaign()
  const cloneMutation = useCloneCampaign()
  const saveFunnel = useSaveFunnel()
  const deleteFunnel = useDeleteFunnel()
  const cloneFunnel = useCloneFunnel()

  const fetchData = useCallback(() => {
    setIsLoading(true)
    const drilldownBody = {
      timeRange: toApiDateTimeRange(dateRange.from, dateRange.to),
      timeZone: { name: tz },
      groupings: [
        { groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] },
      ],
      paging: { start: 0, length: 5000 },
      options: { viewType: 'flat' as const },
    }
    Promise.all([
      api.get<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/'),
      api.post<Report>('/stats/reporting/drilldown/', drilldownBody),
    ])
      .then(([hierarchy, report]) => {
        setColumns(report.columns ?? [])
        setTreeData(buildCampaignTreeFromMysqlAndFlatFunnelReport(hierarchy.campaigns ?? [], report))
        setTotalsCells(report.totals?.cells ?? null)
        setIsLoading(false)
      })
      .catch(() => {
        setTreeData([])
        setTotalsCells(null)
        setIsLoading(false)
      })
  }, [dateRange, tz])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    if (!search) return treeData
    const s = search.toLowerCase()
    return treeData.filter((row) => {
      if (row.name.toLowerCase().includes(s)) return true
      return row._children?.some((c) => c.name.toLowerCase().includes(s))
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
    setAddModalKey((k) => k + 1)
    setAddCombinedOpen(true)
  }, [])

  const handleOpenCampaignFormFromCombined = () => {
    setEditId(null)
    setSheetOpen(true)
  }

  const handleCreate = () => openAddCampaignOrFunnel()
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
        fetchData()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleCloneCampaign = useCallback((id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Campaign cloned'); fetchData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneMutation, fetchData, toast])

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'campaign') {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); fetchData() },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
      return
    }
    deleteFunnel.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); fetchData() },
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
      fetchData()
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
    saveFunnel.mutate(
      {
        create: true,
        idFunnel,
        idCampaign: campaignId,
        funnelName,
        defaultCostPerEntrance: '0',
        canvasWidth: 2000,
        canvasHeight: 1500,
        nodes: [],
        connections: [],
      },
      {
        onSuccess: () => {
          toast.success('Funnel created')
          setAddCombinedOpen(false)
          fetchData()
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
      onSuccess: () => { toast.success('Funnel cloned'); fetchData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }, [cloneFunnel, fetchData, toast])

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
    fetchData()
  }, [selectedIds, treeData, toast, fetchData])

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
    fetchData()
  }, [selectedIds, treeData, deleteMutation, deleteFunnel, toast, fetchData])

  const handleCampaignDateRangeChange = useCallback((v: DateRange & { preset: string | null }) => {
    if (v.from && v.to) setDateRange({ from: v.from, to: v.to })
  }, [])

  const handleTableColumnSizingChange = useCallback((sizing: Record<string, number>) => {
    setColumnSizing(TABLE_KEY, sizing)
  }, [setColumnSizing])

  const handleTableColumnVisibilityChange = useCallback((vis: VisibilityState) => {
    setColumnVisibility(TABLE_KEY, vis)
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

  const columnDefs = useMemo<ColumnDef<CampaignTreeRow, unknown>[]>(() => [
    selectionColumn<CampaignTreeRow>(),
    nameColumn<CampaignTreeRow>(),
    editBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') handleEdit(row.campaignId)
      else navigate(`/campaigns/${row.campaignId}/funnels/${row.funnelId}`)
    }, { hidden: isCampaignTotalsRow }),
    cloneBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') handleCloneCampaign(row.campaignId)
      else if (row.funnelId) handleCloneFunnel(row.funnelId)
    }, { hidden: isCampaignTotalsRow }),
    addFunnelOrMoveColumn<CampaignTreeRow>(
      (row) => openAddCampaignOrFunnel(row.campaignId),
      (row) => { openMoveFunnelModal(row) },
      {
        hidden: isCampaignTotalsRow,
        showAdd: (row) => row.kind === 'campaign',
        showMove: (row) => row.kind === 'funnel',
      },
    ),
    deleteBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') setDeleteTarget({ id: row.campaignId, kind: 'campaign' })
      else if (row.funnelId) setDeleteTarget({ id: row.funnelId, kind: 'funnel' })
    }, { hidden: isCampaignTotalsRow }),
    {
      ...idColumn<CampaignTreeRow>(),
      accessorFn: (row) => row.kind === 'campaign' ? row.campaignId : row.funnelId,
    },
    ...statCols,
  ], [
    statCols,
    navigate,
    handleEdit,
    handleCloneCampaign,
    handleCloneFunnel,
    openAddCampaignOrFunnel,
    openMoveFunnelModal,
  ])

  return (
    <PageShell
      title="Campaigns"
      actions={
        <Button type="primary" className="bg-orange-600 hover:bg-orange-600/90" onClick={handleCreate}>
          Add funnel or campaign
        </Button>
      }
      fillHeight
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search campaigns..."
        onRefresh={fetchData}
        refreshLoading={isLoading}
        trailing={
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={handleCampaignDateRangeChange}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={tableRef.current ? <ColumnChooser columns={columnDefs} table={tableRef.current} storageKey="campaigns" /> : null}
      />

      <DataTable
        data={filtered}
        columns={columnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        tableConfigKey={TABLE_KEY}
        pinnedBottomRows={pinnedBottomRows}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        treeMode
        getSubRows={getSubRows}
        expanded={expanded}
        onExpandedChange={setExpanded}
        tableRef={tableRef}
        columnSizing={tableConfig.columnSizing}
        onColumnSizingChange={handleTableColumnSizingChange}
        columnVisibility={tableConfig.columnVisibility}
        onColumnVisibilityChange={handleTableColumnVisibilityChange}
        emptyMessage={search ? 'No campaigns match your search.' : 'No campaigns found.'}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={handleBulkDeselectAll}
        onMove={handleBulkMoveFunnels}
        onArchive={handleBulkArchiveFunnels}
        onDelete={handleBulkDeleteSelection}
        moveLabel="Move funnels"
        archiveLabel="Archive funnels"
      />

      <AddCampaignOrFunnelModal
        key={addModalKey}
        open={addCombinedOpen}
        onClose={handleCloseAddCombinedModal}
        initialCampaignId={funnelPrefillCampaignId}
        onOpenCampaignForm={handleOpenCampaignFormFromCombined}
        onCreateFunnel={handleCreateFunnelFromModal}
        onQuickCreateCampaign={handleQuickCreateCampaign}
        funnelCreatePending={saveFunnel.isPending}
        campaignQuickCreatePending={saveMutation.isPending}
      />

      <MoveFunnelModal
        open={!!moveFunnelTarget}
        target={moveFunnelTarget}
        onClose={handleCloseMoveFunnelModal}
        onMoved={fetchData}
      />

      <CampaignEditForm
        open={sheetOpen}
        onOpenChange={handleCampaignEditOpenChange}
        initialData={editId ? editCampaign : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onCancel={handleDismissDeleteCampaignOrFunnel}
        title={deleteTarget?.kind === 'campaign' ? 'Delete Campaign' : 'Delete Funnel'}
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteTarget?.kind === 'campaign' ? deleteMutation.isPending : deleteFunnel.isPending}
        danger
      />
    </PageShell>
  )
}
