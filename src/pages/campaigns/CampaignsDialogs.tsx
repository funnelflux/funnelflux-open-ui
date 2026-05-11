import { ConfirmModal } from '@/components/ui-kit'
import { CampaignEditForm } from '@/pages/campaigns/CampaignEditForm'
import { AddCampaignOrFunnelModal } from '@/pages/campaigns/AddCampaignOrFunnelModal'
import { MoveFunnelModal, type MoveFunnelTarget } from '@/pages/campaigns/MoveFunnelModal'
import type { Campaign } from '@/types/entities'
import type { CampaignFormData } from '@/schemas/campaign'

interface CampaignsDialogsProps {
  addModalKey: number
  addCombinedOpen: boolean
  onCloseAddCombined: () => void
  initialCampaignId: string | null
  onOpenCampaignForm: () => void
  onCreateFunnel: (args: { campaignId: string; funnelName: string; openEditor: boolean }) => void
  onQuickCreateCampaign: (name: string) => Promise<string>
  funnelCreatePending: boolean
  campaignQuickCreatePending: boolean
  moveFunnelTarget: MoveFunnelTarget | MoveFunnelTarget[] | null
  onCloseMoveFunnel: () => void
  onMoved: () => void
  sheetOpen: boolean
  onCampaignEditOpenChange: (open: boolean) => void
  editCampaign: Campaign | undefined
  onSubmit: (data: CampaignFormData) => void
  savePending: boolean
  deleteTarget: { id: string; kind: 'campaign' | 'funnel' } | null
  onDeleteDismiss: () => void
  onDeleteConfirm: () => void
  deleteCampaignPending: boolean
  deleteFunnelPending: boolean
}

export function CampaignsDialogs({
  addModalKey,
  addCombinedOpen,
  onCloseAddCombined,
  initialCampaignId,
  onOpenCampaignForm,
  onCreateFunnel,
  onQuickCreateCampaign,
  funnelCreatePending,
  campaignQuickCreatePending,
  moveFunnelTarget,
  onCloseMoveFunnel,
  onMoved,
  sheetOpen,
  onCampaignEditOpenChange,
  editCampaign,
  onSubmit,
  savePending,
  deleteTarget,
  onDeleteDismiss,
  onDeleteConfirm,
  deleteCampaignPending,
  deleteFunnelPending,
}: CampaignsDialogsProps) {
  return (
    <>
      <AddCampaignOrFunnelModal
        key={addModalKey}
        open={addCombinedOpen}
        onClose={onCloseAddCombined}
        initialCampaignId={initialCampaignId}
        onOpenCampaignForm={onOpenCampaignForm}
        onCreateFunnel={onCreateFunnel}
        onQuickCreateCampaign={onQuickCreateCampaign}
        funnelCreatePending={funnelCreatePending}
        campaignQuickCreatePending={campaignQuickCreatePending}
      />

      <MoveFunnelModal
        open={Boolean(moveFunnelTarget)}
        target={moveFunnelTarget}
        onClose={onCloseMoveFunnel}
        onMoved={onMoved}
      />

      <CampaignEditForm
        open={sheetOpen}
        onOpenChange={onCampaignEditOpenChange}
        initialData={editCampaign}
        onSubmit={onSubmit}
        isSubmitting={savePending}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onCancel={onDeleteDismiss}
        title={deleteTarget?.kind === 'campaign' ? 'Delete Campaign' : 'Delete Funnel'}
        description="Are you sure? This cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={deleteTarget?.kind === 'campaign' ? deleteCampaignPending : deleteFunnelPending}
        danger
      />
    </>
  )
}
