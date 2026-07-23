import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FormField, Input, Select, FormModal, FormModalBody, FormModalFooter, FormModalHeader, useToastApi } from '@/components/ui-kit'
import { useCampaignsList, useSaveFunnel } from '@/api/hooks'
import { buildMinimalNewFunnelPayload } from '@/lib/defaultNewFunnelNodes'
import { getErrorMessage } from '@/lib/utils'
import {
  FUNNEL_NAME_MAX_LEN,
  funnelModalSchema,
  type FunnelModalFormValues,
} from '@/schemas/funnel'
import type { Funnel } from '@/types/entities'

const ADD_FUNNEL_FORM_ID = 'add-funnel-form'

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
  const [createIntent, setCreateIntent] = useState<CreateIntent | null>(null)
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList({ enabled: open })

  const { control, handleSubmit, reset } = useForm<FunnelModalFormValues>({
    resolver: zodResolver(funnelModalSchema),
    defaultValues: { idCampaign: initialCampaignId ?? '', funnelName: '' },
  })

  // destroyOnHidden does not reset a useForm colocated with the modal — reset on open.
  // createIntent needs no reset here: it is cleared on success/error and spinners gate on `busy`.
  useEffect(() => {
    if (!open) return
    reset({ idCampaign: initialCampaignId ?? '', funnelName: '' })
  }, [open, initialCampaignId, reset])

  const campaignOptions = useMemo(
    () => (campaigns ?? []).map((campaign) => ({ label: campaign.name, value: campaign.id })),
    [campaigns],
  )

  const busy = saveFunnel.isPending

  const handleModalClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const runCreate = useCallback(
    (data: FunnelModalFormValues, intent: CreateIntent) => {
      setCreateIntent(intent)
      const payload = buildMinimalNewFunnelPayload(data.idCampaign, data.funnelName)
      saveFunnel.mutate(
        { ...payload, create: true },
        {
          onSuccess: (saved: Funnel) => {
            const summary: CreatedFunnelSummary = {
              idFunnel: String(saved.idFunnel ?? payload.idFunnel),
              funnelName: String(saved.funnelName ?? data.funnelName),
              idCampaign: String(saved.idCampaign ?? data.idCampaign),
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
    [saveFunnel, toast, onFunnelCreated, onClose, navigate],
  )

  const submitWithIntent = useCallback(
    (intent: CreateIntent) => handleSubmit((data) => runCreate(data, intent)),
    [handleSubmit, runCreate],
  )

  return (
    <FormModal
      open={open}
      onCancel={handleModalClose}
      destroyOnHidden
    >
      <FormModalHeader title="Add Funnel" />
      <FormModalBody>
        <form id={ADD_FUNNEL_FORM_ID} onSubmit={submitWithIntent('list')} className="space-y-4">
          <Controller
            control={control}
            name="idCampaign"
            render={({ field, fieldState }) => (
              <FormField
                label="Campaign"
                required
                htmlFor="add-funnel-modal-campaign"
                error={fieldState.error?.message}
              >
                <Select
                  id="add-funnel-modal-campaign"
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
                htmlFor="add-funnel-modal-name"
                error={fieldState.error?.message}
                help={`Required (API max ${FUNNEL_NAME_MAX_LEN} characters).`}
              >
                <Input
                  id="add-funnel-modal-name"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  placeholder="e.g. Main push landing flow"
                  maxLength={FUNNEL_NAME_MAX_LEN}
                  className="w-full"
                  disabled={busy}
                />
              </FormField>
            )}
          />
          {!campaignsLoading && campaignOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a campaign first, then add a funnel.
            </p>
          ) : null}
        </form>
      </FormModalBody>
      <FormModalFooter>
        <Button onClick={handleModalClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          htmlType="submit"
          form={ADD_FUNNEL_FORM_ID}
          disabled={busy}
          loading={busy && createIntent === 'list'}
        >
          Create
        </Button>
        <Button
          type="primary"
          htmlType="button"
          disabled={busy}
          loading={busy && createIntent === 'editor'}
          onClick={() => void submitWithIntent('editor')()}
        >
          Create and open editor
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
