import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  addFunnelOrMoveColumn,
  cloneBtnColumn,
  deleteBtnColumn,
  editBtnColumn,
  idColumn,
  nameColumn,
  selectionColumn,
} from '@/components/ui-kit/data-table'
import type { CampaignTreeRow } from '@/pages/campaigns/campaignTreeUtils'
import { isCampaignTotalsRow } from '@/pages/campaigns/useCampaignsController'

interface UseCampaignsColumnsArgs {
  statCols: ColumnDef<CampaignTreeRow, unknown>[]
  onEditCampaign: (idCampaign: string) => void
  onOpenFunnelEditor: (campaignId: string, funnelId: string) => void
  onCloneCampaign: (idCampaign: string) => void
  onCloneFunnel: (idFunnel: string) => void
  onOpenAddCampaignOrFunnel: (campaignId?: string) => void
  onOpenMoveFunnel: (row: CampaignTreeRow) => void
  onRequestDelete: (target: { id: string; kind: 'campaign' | 'funnel' }) => void
}

export function useCampaignsColumns({
  statCols,
  onEditCampaign,
  onOpenFunnelEditor,
  onCloneCampaign,
  onCloneFunnel,
  onOpenAddCampaignOrFunnel,
  onOpenMoveFunnel,
  onRequestDelete,
}: UseCampaignsColumnsArgs) {
  const columnDefs = useMemo<ColumnDef<CampaignTreeRow, unknown>[]>(() => [
    selectionColumn<CampaignTreeRow>(),
    nameColumn<CampaignTreeRow>(),
    editBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') onEditCampaign(row.campaignId)
      else if (row.funnelId) onOpenFunnelEditor(row.campaignId, row.funnelId)
    }, { hidden: isCampaignTotalsRow }),
    cloneBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') onCloneCampaign(row.campaignId)
      else if (row.funnelId) onCloneFunnel(row.funnelId)
    }, { hidden: isCampaignTotalsRow }),
    addFunnelOrMoveColumn<CampaignTreeRow>(
      (row) => onOpenAddCampaignOrFunnel(row.campaignId),
      (row) => { onOpenMoveFunnel(row) },
      {
        hidden: isCampaignTotalsRow,
        showAdd: (row) => row.kind === 'campaign',
        showMove: (row) => row.kind === 'funnel',
      },
    ),
    deleteBtnColumn<CampaignTreeRow>((row) => {
      if (row.kind === 'campaign') onRequestDelete({ id: row.campaignId, kind: 'campaign' })
      else if (row.funnelId) onRequestDelete({ id: row.funnelId, kind: 'funnel' })
    }, { hidden: isCampaignTotalsRow }),
    {
      ...idColumn<CampaignTreeRow>(),
      accessorFn: (row) => (row.kind === 'campaign' ? row.campaignId : row.funnelId),
    },
    ...statCols,
  ], [
    statCols,
    onEditCampaign,
    onOpenFunnelEditor,
    onCloneCampaign,
    onCloneFunnel,
    onOpenAddCampaignOrFunnel,
    onOpenMoveFunnel,
    onRequestDelete,
  ])

  return { columnDefs }
}
