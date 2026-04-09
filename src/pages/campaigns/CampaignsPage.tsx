import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays } from 'date-fns'
import type { AgGridReact } from 'ag-grid-react'
import type { ColDef, SelectionChangedEvent, SortModelItem } from 'ag-grid-community'
import { Copy, Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { Button } from 'antd'
import {
  PageShell,
  SearchToolbar,
  DataGrid,
  ConfirmModal,
  EmptyState,
  TimezoneSelect,
  useToastApi,
  nameColumn,
  visitsColumn,
  clicksColumn,
  ctrColumn,
  convColumn,
  revenueColumn,
  costColumn,
  plColumn,
  roiColumn,
  idColumn,
} from '@/components/ui-kit'
import { InlineActions } from '@/components/shared/InlineActions'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'
import { ColumnChooser } from '@/components/shared/ColumnChooser'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  useSaveCampaign,
  useDeleteCampaign,
  useCloneCampaign,
  useCampaign,
  useSaveFunnel,
  useDeleteFunnel,
  useCloneFunnel,
} from '@/api/hooks'
import { CampaignEditForm } from './CampaignEditForm'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { DrilldownRequest, Report, ReportCell } from '@/types/stats'
import type { Campaign, Funnel } from '@/types/entities'
import type { CampaignFormData } from '@/schemas/campaign'
import { getErrorMessage } from '@/lib/utils'

interface CampaignGridRow {
  id: string
  name: string
  cells: ReportCell[]
  kind: 'campaign' | 'funnel'
  campaignId: string
  funnelId?: string
}

function reportRowsToRows(report: Report, kind: 'campaign' | 'funnel', campaignId?: string): CampaignGridRow[] {
  return (report.rows ?? []).map((row, index) => {
    const cells = row.cells ?? []
    const id = String(cells[0]?.raw ?? index)
    return {
      id: kind === 'campaign' ? `campaign-${id}` : `funnel-${id}`,
      name: cells[0]?.formatted ?? '',
      cells,
      kind,
      campaignId: campaignId ?? id,
      funnelId: kind === 'funnel' ? id : undefined,
    }
  })
}

export function CampaignsPage() {
  const toast = useToastApi()
  const navigate = useNavigate()
  const gridRef = useRef<AgGridReact>(null)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: 'campaign' | 'funnel' } | null>(null)
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [rows, setRows] = useState<CampaignGridRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const page = 0
  const pageSize = 50
  const sortModel: SortModelItem[] = []

  const { data: editCampaign } = useCampaign(editId ?? '')
  const saveMutation = useSaveCampaign()
  const deleteMutation = useDeleteCampaign()
  const cloneMutation = useCloneCampaign()
  const saveFunnel = useSaveFunnel()
  const deleteFunnel = useDeleteFunnel()
  const cloneFunnel = useCloneFunnel()

  const buildRequest = useCallback(
    (
      groupings: DrilldownRequest['groupings'],
      topLevelFilters?: DrilldownRequest['topLevelFilters'],
      pag?: { start: number; length: number },
      sort?: SortModelItem[],
    ) => {
      const sortParam = sort?.[0]
        ? {
            column: Number(String(sort[0].colId).replace('col-', '')),
            direction: sort[0].sort === 'desc' ? ('desc' as const) : ('asc' as const),
          }
        : undefined

      return {
        timeRange: toApiDateTimeRange(dateRange.from, dateRange.to),
        timeZone: { name: tz },
        groupings,
        topLevelFilters,
        paging: pag ?? { start: 0, length: 50 },
        sorting: sortParam,
        options: { viewType: 'flat' as const },
      }
    },
    [dateRange, tz],
  )

  const fetchData = useCallback(
    (currentPage: number, sort: SortModelItem[]) => {
      setIsLoading(true)
      api
        .post<Report>(
          '/stats/reporting/drilldown/',
          buildRequest(
            [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
            undefined,
            { start: currentPage * pageSize, length: pageSize },
            sort,
          ),
        )
        .then((report) => {
          setColumns(report.columns ?? [])
          const campaignRows = reportRowsToRows(report, 'campaign')
          setRows(campaignRows)
          setIsLoading(false)

          // Auto-expand: load funnels for each campaign
          for (const cRow of campaignRows) {
            loadFunnels(cRow)
          }
        })
        .catch(() => {
          setRows([])
          setIsLoading(false)
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildRequest, pageSize],
  )

  const loadFunnels = useCallback(
    (campaignRow: CampaignGridRow) => {
      api
        .post<Report>(
          '/stats/reporting/drilldown/',
          buildRequest(
            [{ groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] }],
            [{ groupBy: 'Element: Campaign', whitelistFilters: [campaignRow.campaignId], blacklistFilters: [] }],
            { start: 0, length: 99999 },
          ),
        )
        .then((report) => {
          const funnelRows = reportRowsToRows(report, 'funnel', campaignRow.campaignId)
          if (funnelRows.length > 0) {
            setRows((current) => {
              const idx = current.findIndex((r) => r.id === campaignRow.id)
              if (idx === -1) return current
              // Guard: skip if funnels already inserted for this campaign
              if (idx + 1 < current.length && current[idx + 1].kind === 'funnel' && current[idx + 1].campaignId === campaignRow.campaignId) {
                return current
              }
              const updated = [...current]
              updated.splice(idx + 1, 0, ...funnelRows)
              return updated
            })
          }
        })
        .catch(() => {})
    },
    [buildRequest],
  )

  useEffect(() => {
    fetchData(0, sortModel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildRequest])

  const loadData = useCallback(() => {
    fetchData(page, sortModel)
  }, [fetchData, page, sortModel])

  const filtered = useMemo(() => {
    if (!search) return rows
    const s = search.toLowerCase()
    return rows.filter((row) => row.name.toLowerCase().includes(s))
  }, [rows, search])

  const onSelectionChanged = useCallback((e: SelectionChangedEvent<CampaignGridRow>) => {
    setSelectedIds(e.api.getSelectedRows().map(r => r.id))
  }, [])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: CampaignFormData) => {
    saveMutation.mutate(data as Partial<Campaign>, {
      onSuccess: () => {
        toast.success(data.idCampaign ? 'Campaign updated' : 'Campaign created')
        setSheetOpen(false)
        setEditId(null)
        loadData()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleCloneCampaign = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Campaign cloned'); loadData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    if (deleteTarget.kind === 'campaign') {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); loadData() },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
      return
    }

    deleteFunnel.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); loadData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleAddFunnel = (campaignId: string) => {
    saveFunnel.mutate(
      {
        idCampaign: campaignId,
        funnelName: 'New Funnel',
        defaultCostPerEntrance: 0,
        nodes: [],
        connections: [],
      } as Partial<Funnel>,
      {
        onSuccess: (funnel) => {
          toast.success('Funnel created')
          navigate(`/campaigns/${campaignId}/funnels/${funnel.idFunnel}`)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  const handleCloneFunnel = (funnelId: string) => {
    cloneFunnel.mutate(funnelId, {
      onSuccess: () => { toast.success('Funnel cloned'); loadData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleMoveFunnel = async (funnelId: string) => {
    const targetCampaignId = window.prompt('Move funnel to campaign ID')
    if (!targetCampaignId?.trim()) return

    try {
      await api.put('/data/campaign/funnel/move/', {
        idFunnel: funnelId,
        idCampaign: targetCampaignId.trim(),
      })
      toast.success('Funnel moved')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const colMap = useMemo(() => {
    const m = new Map<string, number>()
    columns.forEach((c, i) => m.set(c.name, i))
    return m
  }, [columns])

  const iVisits = colMap.get('Entrances') ?? 1
  const iClicks = colMap.get('Lander Clicks') ?? 6
  const iCTR = colMap.get('Lander CTR') ?? 7
  const iConv = colMap.get('Conv.') ?? 17
  const iRevenue = colMap.get('Revenue') ?? 28
  const iCost = colMap.get('Cost') ?? 31
  const iPL = colMap.get('P/L') ?? 32
  const iROI = colMap.get('ROI') ?? 33

  const handleEditRef = useRef(handleEdit)
  handleEditRef.current = handleEdit
  const handleCloneCampaignRef = useRef(handleCloneCampaign)
  handleCloneCampaignRef.current = handleCloneCampaign
  const handleAddFunnelRef = useRef(handleAddFunnel)
  handleAddFunnelRef.current = handleAddFunnel
  const handleCloneFunnelRef = useRef(handleCloneFunnel)
  handleCloneFunnelRef.current = handleCloneFunnel
  const handleMoveFunnelRef = useRef(handleMoveFunnel)
  handleMoveFunnelRef.current = handleMoveFunnel

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      ...nameColumn(),
      cellStyle: { position: 'relative', overflow: 'visible' },
      cellRenderer: (params: { data: CampaignGridRow }) => {
        const row = params.data
        const indent = row.kind === 'funnel' ? 'pl-6' : ''
        const weight = row.kind === 'funnel' ? 'text-muted-foreground' : ''
        const actions = row.kind === 'campaign' ? (
          <InlineActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => handleEditRef.current(row.campaignId) },
              { label: 'Clone', icon: Copy, onClick: () => handleCloneCampaignRef.current(row.campaignId) },
              { label: 'Add Funnel', icon: Plus, onClick: () => handleAddFunnelRef.current(row.campaignId) },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget({ id: row.campaignId, kind: 'campaign' }), destructive: true },
            ]}
          />
        ) : (
          <InlineActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => navigate(`/campaigns/${row.campaignId}/funnels/${row.funnelId}`) },
              { label: 'Clone', icon: Copy, onClick: () => row.funnelId && handleCloneFunnelRef.current(row.funnelId) },
              { label: 'Move', icon: Workflow, onClick: () => row.funnelId && handleMoveFunnelRef.current(row.funnelId) },
              { label: 'Delete', icon: Trash2, onClick: () => row.funnelId && setDeleteTarget({ id: row.funnelId, kind: 'funnel' }), destructive: true },
            ]}
          />
        )
        return (
          <>
            <span className={`truncate ${indent} ${weight}`}>{row.name}</span>
            <div className="name-actions">{actions}</div>
          </>
        )
      },
    },
    {
      ...idColumn(),
      valueGetter: (p) => {
        const row = p.data as CampaignGridRow
        return row.kind === 'campaign' ? row.campaignId : row.funnelId
      },
    },
    visitsColumn(iVisits),
    clicksColumn(iClicks),
    ctrColumn(iCTR),
    convColumn(iConv),
    revenueColumn(iRevenue),
    costColumn(iCost),
    plColumn(iPL),
    roiColumn(iROI),
  ], [iVisits, iClicks, iCTR, iConv, iRevenue, iCost, iPL, iROI, navigate])

  return (
    <PageShell
      title="Campaigns"
      actions={<Button type="primary" onClick={handleCreate}>Add Campaign</Button>}
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search campaigns..."
        trailing={
          <>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to, preset: null }}
              timezone={tz}
              onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
            />
            <TimezoneSelect value={tz} onChange={setTz} />
          </>
        }
        actions={<ColumnChooser columnDefs={columnDefs} gridRef={gridRef} storageKey="campaigns" />}
      />

      {!isLoading && filtered.length === 0 ? (
        <EmptyState message={search ? 'No campaigns match your search.' : 'No campaigns found.'} />
      ) : (
        <DataGrid
          gridRef={gridRef}
          rowData={filtered}
          columnDefs={columnDefs}
          loading={isLoading}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          getRowId={(params) => params.data.id}
          getRowStyle={(params) => {
            if ((params.data as CampaignGridRow)?.kind === 'funnel') {
              return { background: 'var(--color-muted)' }
            }
            return undefined
          }}
        />
      )}

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setSelectedIds([])}
        onDelete={async () => {
          for (const id of selectedIds) {
            const row = rows.find(r => r.id === id)
            if (row?.kind === 'campaign') {
              await deleteMutation.mutateAsync(row.campaignId)
            } else if (row?.kind === 'funnel' && row.funnelId) {
              await deleteFunnel.mutateAsync(row.funnelId)
            }
          }
          toast.success('Selected items deleted')
          setSelectedIds([])
          loadData()
        }}
      />

      <CampaignEditForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editCampaign : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        title={deleteTarget?.kind === 'campaign' ? 'Delete Campaign' : 'Delete Funnel'}
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        loading={deleteTarget?.kind === 'campaign' ? deleteMutation.isPending : deleteFunnel.isPending}
        danger
      />
    </PageShell>
  )
}
