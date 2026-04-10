import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subDays } from 'date-fns'
import type { ColumnDef, RowSelectionState, ExpandedState, Table } from '@tanstack/react-table'
import { Copy, Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { Button } from 'antd'
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
  visitsColumn,
  clicksColumn,
  ctrColumn,
  convColumn,
  revenueColumn,
  costColumn,
  plColumn,
  roiColumn,
  idColumn,
  selectionColumn,
} from '@/components/ui-kit/data-table'
import { InlineActions } from '@/components/shared/InlineActions'
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
} from '@/api/hooks'
import { CampaignEditForm } from './CampaignEditForm'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'
import type { Campaign, Funnel } from '@/types/entities'
import type { CampaignFormData } from '@/schemas/campaign'
import { getErrorMessage } from '@/lib/utils'

interface CampaignTreeRow {
  id: string
  name: string
  cells: ReportCell[]
  kind: 'campaign' | 'funnel'
  campaignId: string
  funnelId?: string
  _children?: CampaignTreeRow[]
}

function buildTreeFromReport(report: Report): CampaignTreeRow[] {
  const colCount = report.columns.length

  return (report.rows ?? []).map((row, index) => {
    const cells: ReportCell[] = []
    for (let i = 0; i < colCount; i++) {
      const cell = (row.cells ?? row)[i != null ? i : 0] as ReportCell | undefined
      cells.push(cell ?? row[String(i)] as ReportCell ?? { raw: '', formatted: '' })
    }
    if (row.cells) {
      cells.length = 0
      cells.push(...(row.cells as ReportCell[]))
    }

    const rawId = String(cells[0]?.raw ?? index)
    const children = (row.children ?? (row.expandableInfo as { children?: unknown[] } | undefined)?.children) as Record<string, unknown>[] | undefined

    const campaignRow: CampaignTreeRow = {
      id: `campaign-${rawId}`,
      name: cells[0]?.formatted ?? '',
      cells,
      kind: 'campaign',
      campaignId: rawId,
    }

    if (children?.length) {
      campaignRow._children = children.map((child, ci) => {
        const childCells: ReportCell[] = []
        if (Array.isArray((child as { cells?: unknown }).cells)) {
          childCells.push(...((child as { cells: ReportCell[] }).cells))
        } else {
          for (let i = 0; i < colCount; i++) {
            const c = child[String(i)] as ReportCell | undefined
            childCells.push(c ?? { raw: '', formatted: '' })
          }
        }

        const childId = String(childCells[0]?.raw ?? ci)
        return {
          id: `funnel-${childId}`,
          name: childCells[0]?.formatted ?? '',
          cells: childCells,
          kind: 'funnel' as const,
          campaignId: rawId,
          funnelId: childId,
        }
      })
    }

    return campaignRow
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
  const [tz, setTz] = useState('UTC')
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 365),
    to: new Date(),
  }))

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [treeData, setTreeData] = useState<CampaignTreeRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
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
    api
      .post<Report>('/stats/reporting/drilldown/', {
        timeRange: toApiDateTimeRange(dateRange.from, dateRange.to),
        timeZone: { name: tz },
        groupings: [
          { groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] },
          { groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] },
        ],
        paging: { start: 0, length: 200 },
        options: { viewType: 'tree' },
      })
      .then((report) => {
        setColumns(report.columns ?? [])
        setTreeData(buildTreeFromReport(report))
        setIsLoading(false)
      })
      .catch(() => {
        setTreeData([])
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

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection])

  const handleCreate = () => { setEditId(null); setSheetOpen(true) }
  const handleEdit = (id: string) => { setEditId(id); setSheetOpen(true) }

  const handleSubmit = (data: CampaignFormData) => {
    saveMutation.mutate(data as Partial<Campaign>, {
      onSuccess: () => {
        toast.success(data.idCampaign ? 'Campaign updated' : 'Campaign created')
        setSheetOpen(false)
        setEditId(null)
        fetchData()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const handleCloneCampaign = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: () => { toast.success('Campaign cloned'); fetchData() },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

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
      onSuccess: () => { toast.success('Funnel cloned'); fetchData() },
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
      fetchData()
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

  const getSubRows = useCallback((row: CampaignTreeRow) => row._children, [])

  const columnDefs = useMemo<ColumnDef<CampaignTreeRow, unknown>[]>(() => [
    selectionColumn<CampaignTreeRow>(),
    nameColumn<CampaignTreeRow>({
      actions: (row) => {
        if (row.kind === 'campaign') {
          return (
            <InlineActions
              actions={[
                { label: 'Edit', icon: Pencil, onClick: () => handleEdit(row.campaignId) },
                { label: 'Clone', icon: Copy, onClick: () => handleCloneCampaign(row.campaignId) },
                { label: 'Add Funnel', icon: Plus, onClick: () => handleAddFunnel(row.campaignId) },
                { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget({ id: row.campaignId, kind: 'campaign' }), destructive: true },
              ]}
            />
          )
        }
        return (
          <InlineActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => navigate(`/campaigns/${row.campaignId}/funnels/${row.funnelId}`) },
              { label: 'Clone', icon: Copy, onClick: () => row.funnelId && handleCloneFunnel(row.funnelId) },
              { label: 'Move', icon: Workflow, onClick: () => row.funnelId && handleMoveFunnel(row.funnelId) },
              { label: 'Delete', icon: Trash2, onClick: () => row.funnelId && setDeleteTarget({ id: row.funnelId, kind: 'funnel' }), destructive: true },
            ]}
          />
        )
      },
    }),
    {
      ...idColumn<CampaignTreeRow>(),
      accessorFn: (row) => row.kind === 'campaign' ? row.campaignId : row.funnelId,
    },
    visitsColumn<CampaignTreeRow>(iVisits),
    clicksColumn<CampaignTreeRow>(iClicks),
    ctrColumn<CampaignTreeRow>(iCTR),
    convColumn<CampaignTreeRow>(iConv),
    revenueColumn<CampaignTreeRow>(iRevenue),
    costColumn<CampaignTreeRow>(iCost),
    plColumn<CampaignTreeRow>(iPL),
    roiColumn<CampaignTreeRow>(iROI),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [iVisits, iClicks, iCTR, iConv, iRevenue, iCost, iPL, iROI, navigate])

  return (
    <PageShell
      title="Campaigns"
      actions={<Button type="primary" onClick={handleCreate}>Add Campaign</Button>}
      fillHeight
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
        actions={tableRef.current ? <ColumnChooser columns={columnDefs} table={tableRef.current} storageKey="campaigns" /> : null}
      />

      <DataTable
        data={filtered}
        columns={columnDefs}
        loading={isLoading}
        getRowId={(row) => row.id}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        treeMode
        getSubRows={getSubRows}
        expanded={expanded}
        onExpandedChange={setExpanded}
        tableRef={tableRef}
        columnSizing={tableConfig.columnSizing}
        onColumnSizingChange={(sizing) => setColumnSizing(TABLE_KEY, sizing)}
        columnVisibility={tableConfig.columnVisibility}
        onColumnVisibilityChange={(vis) => setColumnVisibility(TABLE_KEY, vis)}
        emptyMessage={search ? 'No campaigns match your search.' : 'No campaigns found.'}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onDeselectAll={() => setRowSelection({})}
        onDelete={async () => {
          for (const id of selectedIds) {
            const findRow = (rows: CampaignTreeRow[]): CampaignTreeRow | undefined => {
              for (const r of rows) {
                if (r.id === id) return r
                const found = r._children && findRow(r._children)
                if (found) return found
              }
              return undefined
            }
            const row = findRow(treeData)
            if (row?.kind === 'campaign') {
              await deleteMutation.mutateAsync(row.campaignId)
            } else if (row?.kind === 'funnel' && row.funnelId) {
              await deleteFunnel.mutateAsync(row.funnelId)
            }
          }
          toast.success('Selected items deleted')
          setRowSelection({})
          fetchData()
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
