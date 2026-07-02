import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { invalidateCampaignFunnelAuxiliary } from '@/api/invalidations'
import { queryKeys } from '@/api/queryKeys'
import { Button, FormField, Input, Select, FormModal, FormModalBody, FormModalFooter, FormModalHeader, useToastApi } from '@/components/ui-kit'
import { useCampaignsList } from '@/api/hooks'
import {
  cloneFunnelWithOptions,
  defaultClonedFunnelName,
  type ClonedFunnelSummary,
} from '@/lib/funnelClone'
import { getErrorMessage } from '@/lib/utils'
import {
  FUNNEL_NAME_MAX_LEN,
  funnelModalSchema,
  type FunnelModalFormValues,
} from '@/schemas/funnel'

export type { ClonedFunnelSummary }

const CLONE_FUNNEL_FORM_ID = 'clone-funnel-form'

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
  const [cloneIntent, setCloneIntent] = useState<CloneIntent | null>(null)
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FunnelModalFormValues>({
    resolver: zodResolver(funnelModalSchema),
    defaultValues: { idCampaign: '', funnelName: '' },
  })

  // destroyOnHidden does not reset a useForm colocated with the modal — seed on open.
  // cloneIntent needs no reset here: it is cleared on success/error and spinners gate on `busy`.
  useEffect(() => {
    if (!open || !source) return
    reset({
      idCampaign: source.campaignId,
      funnelName: defaultClonedFunnelName(source.funnelName),
    })
  }, [open, source, reset])

  const campaignOptions = useMemo(
    () => (campaigns ?? []).map((campaign) => ({ label: campaign.name, value: campaign.id })),
    [campaigns],
  )

  const busy = isSubmitting

  const handleModalClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const runClone = useCallback(
    async (data: FunnelModalFormValues, intent: CloneIntent) => {
      if (!source) return
      setCloneIntent(intent)
      try {
        const summary = await cloneFunnelWithOptions({
          sourceFunnelId: source.funnelId,
          sourceCampaignId: source.campaignId,
          targetCampaignId: data.idCampaign,
          funnelName: data.funnelName,
        })
        toast.success('Funnel cloned')
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.funnels.all }),
          // Grouping-filter dropdowns (campaign/funnel assets) go stale without this.
          invalidateCampaignFunnelAuxiliary(queryClient),
        ])
        onFunnelCloned?.(summary)
        onClose()
        setCloneIntent(null)
        if (intent === 'editor') {
          navigate(`/campaigns/${summary.idCampaign}/funnels/${summary.idFunnel}`)
        }
      } catch (err) {
        toast.error(getErrorMessage(err))
        setCloneIntent(null)
      }
    },
    [source, toast, queryClient, onFunnelCloned, onClose, navigate],
  )

  const submitWithIntent = useCallback(
    (intent: CloneIntent) => handleSubmit((data) => runClone(data, intent)),
    [handleSubmit, runClone],
  )

  const formReady = open && Boolean(source)

  return (
    <FormModal
      open={open}
      onCancel={handleModalClose}
      destroyOnHidden
    >
      <FormModalHeader title="Clone Funnel" />
      <FormModalBody>
        {formReady && source ? (
          <form
            id={CLONE_FUNNEL_FORM_ID}
            onSubmit={submitWithIntent('list')}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Cloning <span className="font-medium text-foreground">{source.funnelName}</span>
            </p>
            <Controller
              control={control}
              name="idCampaign"
              render={({ field, fieldState }) => (
                <FormField
                  label="Campaign"
                  required
                  htmlFor="clone-funnel-modal-campaign"
                  error={fieldState.error?.message}
                >
                  <Select
                    id="clone-funnel-modal-campaign"
                    options={campaignOptions}
                    value={field.value || undefined}
                    onChange={(id) => field.onChange(id ?? '')}
                    placeholder={campaignsLoading ? 'Loading campaigns…' : 'Select campaign'}
                    disabled={campaignsLoading || busy}
                    className="w-full"
                  />
                </FormField>
              )}
            />
            <Controller
              control={control}
              name="funnelName"
              render={({ field, fieldState }) => (
                <FormField
                  label="Funnel name"
                  required
                  htmlFor="clone-funnel-modal-name"
                  error={fieldState.error?.message}
                  help={`API max ${FUNNEL_NAME_MAX_LEN} characters.`}
                >
                  <Input
                    id="clone-funnel-modal-name"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    maxLength={FUNNEL_NAME_MAX_LEN}
                    className="w-full"
                    disabled={busy}
                  />
                </FormField>
              )}
            />
          </form>
        ) : null}
      </FormModalBody>
      <FormModalFooter>
        <Button onClick={handleModalClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          htmlType="submit"
          form={CLONE_FUNNEL_FORM_ID}
          disabled={busy || !formReady}
          loading={busy && cloneIntent === 'list'}
        >
          Clone
        </Button>
        <Button
          type="primary"
          htmlType="button"
          disabled={busy || !formReady}
          loading={busy && cloneIntent === 'editor'}
          onClick={() => void submitWithIntent('editor')()}
        >
          Clone and open editor
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
