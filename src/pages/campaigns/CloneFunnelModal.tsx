import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { Button, Field, Input, Select, FormModal, FormModalBody, FormModalFooter, FormModalHeader, useToastApi } from '@/components/ui-kit'
import { useCampaignsList } from '@/api/hooks'
import {
  cloneFunnelWithOptions,
  defaultClonedFunnelName,
  FUNNEL_NAME_MAX_LEN,
  type ClonedFunnelSummary,
} from '@/lib/funnelClone'
import { getErrorMessage } from '@/lib/utils'

export type { ClonedFunnelSummary }

export type CloneFunnelSource = {
  funnelId: string
  funnelName: string
  campaignId: string
}

export interface CloneFunnelModalProps {
  open: boolean
  source: CloneFunnelSource | null
  onClose: () => void
  onFunnelCloned?: (created: ClonedFunnelSummary) => void
}

type CloneIntent = 'list' | 'editor'

export function CloneFunnelModal({
  open,
  source,
  onClose,
  onFunnelCloned,
}: CloneFunnelModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastApi()
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined)
  const [funnelName, setFunnelName] = useState('')
  const [cloneIntent, setCloneIntent] = useState<CloneIntent | null>(null)
  const [isCloning, setIsCloning] = useState(false)
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList()

  const campaignOptions = useMemo(
    () => (campaigns ?? []).map((campaign) => ({ label: campaign.name, value: campaign.id })),
    [campaigns],
  )

  const sourceFunnelId = source?.funnelId ?? ''
  const trimmedName = funnelName.trim().slice(0, FUNNEL_NAME_MAX_LEN)
  const canSubmit = Boolean(sourceFunnelId && campaignId && trimmedName)
  const busy = isCloning

  const handleModalClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const runClone = useCallback(
    async (intent: CloneIntent) => {
      if (!source || !campaignId || !trimmedName) return
      setCloneIntent(intent)
      setIsCloning(true)
      try {
        const summary = await cloneFunnelWithOptions({
          sourceFunnelId: source.funnelId,
          sourceCampaignId: source.campaignId,
          targetCampaignId: campaignId,
          funnelName: trimmedName,
        })
        toast.success('Funnel cloned')
        await queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all })
        onFunnelCloned?.(summary)
        onClose()
        setCloneIntent(null)
        if (intent === 'editor') {
          navigate(`/campaigns/${summary.idCampaign}/funnels/${summary.idFunnel}`)
        }
      } catch (err) {
        toast.error(getErrorMessage(err))
        setCloneIntent(null)
      } finally {
        setIsCloning(false)
      }
    },
    [source, campaignId, trimmedName, toast, queryClient, onFunnelCloned, onClose, navigate],
  )

  const handleClone = useCallback(() => void runClone('list'), [runClone])
  const handleCloneAndOpenEditor = useCallback(() => void runClone('editor'), [runClone])

  const formReady = open && Boolean(source)

  return (
    <FormModal
      open={open}
      onCancel={handleModalClose}
      afterOpenChange={(visible) => {
        if (!visible || !source) return
        setCampaignId(source.campaignId)
        setFunnelName(defaultClonedFunnelName(source.funnelName))
        setCloneIntent(null)
      }}
      destroyOnHidden
    >
      <FormModalHeader title="Clone funnel" />
      <FormModalBody>
        {formReady && source ? (
          <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cloning <span className="font-medium text-foreground">{source.funnelName}</span>
          </p>
          <Field title="Campaign" required htmlFor="clone-funnel-modal-campaign">
            <Select
              id="clone-funnel-modal-campaign"
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
            htmlFor="clone-funnel-modal-name"
            description={`API max ${FUNNEL_NAME_MAX_LEN} characters.`}
          >
            <Input
              id="clone-funnel-modal-name"
              value={funnelName}
              onChange={(event) =>
                setFunnelName(event.target.value.slice(0, FUNNEL_NAME_MAX_LEN))
              }
              maxLength={FUNNEL_NAME_MAX_LEN}
              className="w-full"
              disabled={busy}
              onPressEnter={canSubmit && !busy ? handleClone : undefined}
            />
          </Field>
          </div>
        ) : null}
      </FormModalBody>
      <FormModalFooter>
        <Button onClick={handleModalClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit || !formReady}
          loading={busy && cloneIntent === 'list'}
          onClick={handleClone}
        >
          Clone
        </Button>
        <Button
          type="primary"
          disabled={!canSubmit || !formReady}
          loading={busy && cloneIntent === 'editor'}
          onClick={handleCloneAndOpenEditor}
        >
          Clone and open editor
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
