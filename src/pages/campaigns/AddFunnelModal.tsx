import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Modal, Select, useToastApi } from '@/components/ui-kit'
import { useCampaignsList, useSaveFunnel } from '@/api/hooks'
import { buildMinimalNewFunnelPayload } from '@/lib/defaultNewFunnelNodes'
import { getErrorMessage } from '@/lib/utils'
import type { Funnel } from '@/types/entities'

/** OpenAPI `Funnel.funnelName`: max 255 characters */
export const FUNNEL_NAME_MAX_LEN = 255

export type CreatedFunnelSummary = {
  idFunnel: string
  funnelName: string
  idCampaign: string
}

export interface AddFunnelModalProps {
  open: boolean
  onClose: () => void
  /** Pre-select campaign when opened from a campaign row action. */
  initialCampaignId?: string
  onFunnelCreated?: (created: CreatedFunnelSummary) => void
}

type CreateIntent = 'list' | 'editor'

export function AddFunnelModal({
  open,
  onClose,
  initialCampaignId,
  onFunnelCreated,
}: AddFunnelModalProps) {
  const navigate = useNavigate()
  const toast = useToastApi()
  const saveFunnel = useSaveFunnel()
  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId)
  const [funnelName, setFunnelName] = useState('')
  const [createIntent, setCreateIntent] = useState<CreateIntent | null>(null)
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList({ enabled: open })

  const campaignOptions = useMemo(
    () => (campaigns ?? []).map((campaign) => ({ label: campaign.name, value: campaign.id })),
    [campaigns],
  )

  const trimmedName = funnelName.trim().slice(0, FUNNEL_NAME_MAX_LEN)
  const canSubmit = Boolean(campaignId && trimmedName)
  const busy = saveFunnel.isPending

  const handleModalClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const runCreate = useCallback(
    (intent: CreateIntent) => {
      if (!campaignId || !trimmedName) return
      setCreateIntent(intent)
      const payload = buildMinimalNewFunnelPayload(campaignId, trimmedName)
      saveFunnel.mutate(
        { ...payload, create: true },
        {
          onSuccess: (saved: Funnel) => {
            const summary: CreatedFunnelSummary = {
              idFunnel: String(saved.idFunnel ?? payload.idFunnel),
              funnelName: String(saved.funnelName ?? trimmedName),
              idCampaign: String(saved.idCampaign ?? campaignId),
            }
            toast.success('Funnel created')
            onFunnelCreated?.(summary)
            onClose()
            setCreateIntent(null)
            if (intent === 'editor') {
              navigate(`/campaigns/${summary.idCampaign}/funnels/${summary.idFunnel}`)
            }
          },
          onError: (err) => {
            toast.error(getErrorMessage(err))
            setCreateIntent(null)
          },
        },
      )
    },
    [
      campaignId,
      trimmedName,
      saveFunnel,
      toast,
      onFunnelCreated,
      onClose,
      navigate,
    ],
  )

  const handleCreate = useCallback(() => runCreate('list'), [runCreate])
  const handleCreateAndOpenEditor = useCallback(() => runCreate('editor'), [runCreate])

  return (
    <Modal
      open={open}
      title="Add funnel"
      onCancel={handleModalClose}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={handleModalClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            loading={busy && createIntent === 'list'}
            onClick={handleCreate}
          >
            Create
          </Button>
          <Button
            type="primary"
            disabled={!canSubmit}
            loading={busy && createIntent === 'editor'}
            onClick={handleCreateAndOpenEditor}
          >
            Create and open editor
          </Button>
        </div>
      )}
      destroyOnHidden
    >
      <div className="py-4 space-y-4">
        <Field title="Campaign" required htmlFor="add-funnel-modal-campaign">
          <Select
            id="add-funnel-modal-campaign"
            options={campaignOptions}
            value={campaignId}
            onChange={(id) => setCampaignId(id)}
            placeholder={campaignsLoading ? 'Loading campaigns…' : 'Select campaign'}
            disabled={campaignsLoading || busy}
            className="w-full"
          />
        </Field>
        <Field
          title="Funnel name"
          required
          htmlFor="add-funnel-modal-name"
          description={`Required (API max ${FUNNEL_NAME_MAX_LEN} characters).`}
        >
          <Input
            id="add-funnel-modal-name"
            value={funnelName}
            onChange={(event) =>
              setFunnelName(event.target.value.slice(0, FUNNEL_NAME_MAX_LEN))
            }
            placeholder="e.g. Main push landing flow"
            maxLength={FUNNEL_NAME_MAX_LEN}
            className="w-full"
            disabled={busy}
            onPressEnter={canSubmit && !busy ? handleCreate : undefined}
          />
        </Field>
        {!campaignsLoading && campaignOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a campaign first, then add a funnel.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
