import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays } from 'date-fns'
import { type ColumnDef, type ExpandedState, type PaginationState, type SortingState, type OnChangeFn } from '@tanstack/react-table'
import { Copy, Pencil, Plus, Trash2, Waypoints, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TreeDataTable } from '@/components/shared/TreeDataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RowActionsMenu } from '@/components/shared/RowActionsMenu'
import { SearchInput } from '@/components/shared/SearchInput'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { useToast } from '@/components/shared/Toaster'
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

function cellFmt(cell?: ReportCell): string {
  return cell?.formatted ?? ''
}
function cellRaw(cell?: ReportCell): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
}

interface CampaignTreeRow {
  id: string
  name: string
  cells: ReportCell[]
  kind: 'campaign' | 'funnel'
  campaignId: string
  funnelId?: string
  _hasChildren?: boolean
  subRows?: CampaignTreeRow[]
}

function reportRowsToRows(report: Report, kind: 'campaign' | 'funnel', campaignId?: string): CampaignTreeRow[] {
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
      _hasChildren: kind === 'campaign',
    }
  })
}

export function CampaignsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: 'campaign' | 'funnel' } | null>(null)
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const [rows, setRows] = useState<CampaignTreeRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [sorting, setSorting] = useState<SortingState>([])

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
      sort?: SortingState,
    ) => {
      const sortParam = sort?.[0]
        ? {
            column: Number(String(sort[0].id).replace('col-', '')),
            direction: sort[0].desc ? ('desc' as const) : ('asc' as const),
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
    (pag: PaginationState, sort: SortingState) => {
      setIsLoading(true)
      api
        .post<Report>(
          '/stats/reporting/drilldown/',
          buildRequest(
            [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
            undefined,
            { start: pag.pageIndex * pag.pageSize, length: pag.pageSize },
            sort,
          ),
        )
        .then((report) => {
          setColumns(report.columns ?? [])
          setRows(reportRowsToRows(report, 'campaign'))
          setTotalRows(report.paging?.totalRecords ?? (report.rows ?? []).length)
          setIsLoading(false)
        })
        .catch(() => {
          setRows([])
          setTotalRows(0)
          setIsLoading(false)
        })
    },
    [buildRequest],
  )

  useEffect(() => {
    fetchData(pagination, sorting)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch on date/tz change
  }, [buildRequest])

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(next)
      setExpanded({})
      fetchData(next, sorting)
    },
    [fetchData, pagination, sorting],
  )

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      const resetPag = { ...pagination, pageIndex: 0 }
      setPagination(resetPag)
      setExpanded({})
      fetchData(resetPag, next)
    },
    [fetchData, pagination, sorting],
  )

  const loadData = useCallback(() => {
    fetchData(pagination, sorting)
  }, [fetchData, pagination, sorting])

  const setChildren = useCallback((currentRows: CampaignTreeRow[], rowId: string, children: CampaignTreeRow[]): CampaignTreeRow[] =>
    currentRows.map((row) => {
      if (row.id === rowId) {
        return { ...row, subRows: children }
      }
      return row.subRows ? { ...row, subRows: setChildren(row.subRows, rowId, children) } : row
    }), [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const s = search.toLowerCase()
    return rows.filter((row) => row.name.toLowerCase().includes(s))
  }, [rows, search])

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
    if (!targetCampaignId?.trim()) {
      return
    }

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

  const handleExpandRow = useCallback(
    async (rowId: string, row: CampaignTreeRow) => {
      if (row.kind !== 'campaign') {
        return []
      }

      // Child expansion keeps length: 99999 (few funnels per campaign)
      const report = await api.post<Report>(
        '/stats/reporting/drilldown/',
        buildRequest(
          [{ groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] }],
          [{ groupBy: 'Element: Campaign', whitelistFilters: [row.campaignId], blacklistFilters: [] }],
          { start: 0, length: 99999 },
        ),
      )

      const childRows = reportRowsToRows(report, 'funnel', row.campaignId)
      setRows((current) => setChildren(current, rowId, childRows))
      return childRows
    },
    [buildRequest, setChildren],
  )

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

  const tableCols: ColumnDef<CampaignTreeRow>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.original.kind === 'funnel' && row.original.funnelId ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              title="Open funnel builder"
              aria-label="Open funnel builder"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/campaigns/${row.original.campaignId}/funnels/${row.original.funnelId}`)
              }}
            >
              <Waypoints className="h-4 w-4" />
            </Button>
          ) : null}
          <span className="font-medium truncate">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'visits',
      header: 'Visits',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iVisits]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iVisits])}</span>,
    },
    {
      id: 'clicks',
      header: 'Clicks',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iClicks]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iClicks])}</span>,
    },
    {
      id: 'ctr',
      header: 'CTR',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iCTR]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCTR])}</span>,
    },
    {
      id: 'conv',
      header: 'Conv',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iConv]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iConv])}</span>,
    },
    {
      id: 'revenue',
      header: 'Revenue',
      size: 90,
      accessorFn: (r) => cellRaw(r.cells[iRevenue]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iRevenue])}</span>,
    },
    {
      id: 'cost',
      header: 'Cost',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iCost]),
      cell: ({ row }) => <span className="tabular-nums">{cellFmt(row.original.cells[iCost])}</span>,
    },
    {
      id: 'pl',
      header: 'P/L',
      size: 80,
      accessorFn: (r) => cellRaw(r.cells[iPL]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iPL])
        return <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>{cellFmt(row.original.cells[iPL])}</span>
      },
    },
    {
      id: 'roi',
      header: 'ROI',
      size: 70,
      accessorFn: (r) => cellRaw(r.cells[iROI]),
      cell: ({ row }) => {
        const val = cellRaw(row.original.cells[iROI])
        return <span className={`tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : ''}`}>{cellFmt(row.original.cells[iROI])}</span>
      },
    },
    {
      id: 'id',
      header: 'ID',
      size: 160,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.kind === 'campaign' ? row.original.campaignId : row.original.funnelId}
        </span>
      ),
    },
    {
      id: 'actions',
      size: 50,
      cell: ({ row }) => (
        row.original.kind === 'campaign' ? (
          <RowActionsMenu
            actions={[
              { label: 'Manage Funnels', icon: Workflow, onClick: () => navigate(`/campaigns/${row.original.campaignId}/funnels/new`) },
              { label: 'Add Funnel', icon: Plus, onClick: () => handleAddFunnel(row.original.campaignId) },
              { label: 'Edit', icon: Pencil, onClick: () => handleEdit(row.original.campaignId) },
              { label: 'Clone', icon: Copy, onClick: () => handleCloneCampaign(row.original.campaignId) },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget({ id: row.original.campaignId, kind: 'campaign' }), destructive: true },
            ]}
          />
        ) : (
          <RowActionsMenu
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => navigate(`/campaigns/${row.original.campaignId}/funnels/${row.original.funnelId}`) },
              { label: 'Clone', icon: Copy, onClick: () => row.original.funnelId && handleCloneFunnel(row.original.funnelId) },
              { label: 'Move', icon: Workflow, onClick: () => row.original.funnelId && handleMoveFunnel(row.original.funnelId) },
              { label: 'Delete', icon: Trash2, onClick: () => row.original.funnelId && setDeleteTarget({ id: row.original.funnelId, kind: 'funnel' }), destructive: true },
            ]}
          />
        )
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Campaigns">
        <Button onClick={handleCreate} size="sm">Add Campaign</Button>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search campaigns..." className="w-64" />
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to, preset: null }}
          timezone={tz}
          onChange={(v) => { if (v.from && v.to) setDateRange({ from: v.from, to: v.to }) }}
        />
        <TimezoneSelector value={tz} onChange={setTz} />
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState message={search ? 'No campaigns match your search.' : 'No campaigns found.'} />
      ) : (
        <TreeDataTable
          columns={tableCols}
          data={filtered}
          isLoading={isLoading}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualPagination
          manualSorting
          expanded={expanded}
          onExpandedChange={setExpanded}
          onExpandRow={handleExpandRow}
          getRowId={(row) => row.id}
        />
      )}

      <CampaignEditForm
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditId(null) }}
        initialData={editId ? editCampaign : undefined}
        onSubmit={handleSubmit}
        isSubmitting={saveMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={deleteTarget?.kind === 'campaign' ? 'Delete Campaign' : 'Delete Funnel'}
        description="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteTarget?.kind === 'campaign' ? deleteMutation.isPending : deleteFunnel.isPending}
      />
    </div>
  )
}
