import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Collapse,
  FormField,
  FormModal,
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  Input,
  Spin,
  useToastApi,
} from '@/components/ui-kit'
import { type SaveCampaignInput, useCampaign, useSaveCampaign } from '@/api/hooks'
import { kvToLines, linesToKv } from '@/lib/kvLines'
import { getErrorMessage } from '@/lib/utils'
import {
  campaignCreateSchema,
  campaignEditSchema,
  type CampaignCreateFormValues,
  type CampaignEditFormValues,
} from '@/schemas/campaign'
import type { Campaign } from '@/types/entities'

const CAMPAIGN_EDITOR_FORM_ID = 'campaign-editor-form'

type SaveCampaignMutate = ReturnType<typeof useSaveCampaign>['mutate']

interface CampaignCreateFormProps {
  formId: string
  saveCampaignMutate: SaveCampaignMutate
  onSaved: (campaign: Campaign) => void
  onClose: () => void
}

function CampaignCreateForm({
  formId,
  saveCampaignMutate,
  onSaved,
  onClose,
}: CampaignCreateFormProps) {
  const toast = useToastApi()
  // Mounted only while the modal is open (destroyOnHidden), so defaultValues suffice.
  const { control, handleSubmit } = useForm<CampaignCreateFormValues>({
    resolver: zodResolver(campaignCreateSchema),
    defaultValues: { campaignName: '' },
  })

  const onValid = (data: CampaignCreateFormValues) => {
    saveCampaignMutate(
      { create: true, campaignName: data.campaignName, isArchived: false },
      {
        onSuccess: (saved) => {
          toast.success('Campaign created')
          onSaved(saved)
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 py-1">
      <Controller
        control={control}
        name="campaignName"
        render={({ field, fieldState }) => (
          <FormField
            label="Campaign name"
            htmlFor="campaignName"
            required
            error={fieldState.error?.message}
          >
            <Input
              id="campaignName"
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              placeholder="Campaign name"
              maxLength={255}
            />
          </FormField>
        )}
      />
    </form>
  )
}

interface CampaignEditFormProps {
  formId: string
  campaign: Campaign
  saveCampaignMutate: SaveCampaignMutate
  onSaved: (campaign: Campaign) => void
  onClose: () => void
}

function CampaignEditForm({
  formId,
  campaign,
  saveCampaignMutate,
  onSaved,
  onClose,
}: CampaignEditFormProps) {
  const toast = useToastApi()
  // Keyed by campaign id and mounted only when open + loaded, so defaultValues suffice.
  const { control, handleSubmit } = useForm<CampaignEditFormValues>({
    resolver: zodResolver(campaignEditSchema),
    defaultValues: {
      campaignName: campaign.campaignName,
      customTokensText: kvToLines(campaign.customTokens),
      accumulatedParamsText: kvToLines(campaign.acculumatedUrlParams),
    },
  })

  const onValid = (data: CampaignEditFormValues) => {
    const payload: SaveCampaignInput = {
      ...campaign,
      campaignName: data.campaignName,
      customTokens: linesToKv(data.customTokensText),
      acculumatedUrlParams: linesToKv(data.accumulatedParamsText),
    }
    saveCampaignMutate(payload, {
      onSuccess: (saved) => {
        toast.success('Campaign saved')
        onSaved(saved)
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 py-1">
      <Controller
        control={control}
        name="campaignName"
        render={({ field, fieldState }) => (
          <FormField
            label="Campaign name"
            htmlFor="campaignNameEdit"
            required
            error={fieldState.error?.message}
          >
            <Input
              id="campaignNameEdit"
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              placeholder="Campaign name"
              maxLength={255}
            />
          </FormField>
        )}
      />
      <FormField label="Campaign ID" htmlFor="campaignIdReadonly" help="Read-only identifier">
        <Input id="campaignIdReadonly" readOnly value={campaign.idCampaign} />
      </FormField>
      <Collapse
        bordered={false}
        className="bg-muted/40 rounded-md"
        items={[
          {
            key: 'advanced',
            label: (
              <span className="text-sm font-medium">
                Advanced settings (all funnels in this campaign)
              </span>
            ),
            children: (
              <div className="flex flex-col gap-4 pt-1">
                <Controller
                  control={control}
                  name="customTokensText"
                  render={({ field, fieldState }) => (
                    <FormField
                      label="Custom tokens"
                      htmlFor="campCustomTokens"
                      error={fieldState.error?.message}
                      help="One key=value per line. Usable in conditions, JS and PHP nodes."
                    >
                      <Input.TextArea
                        id="campCustomTokens"
                        rows={5}
                        className="font-mono text-xs"
                        placeholder={'token1=value_one\ntoken2=value_two'}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                      />
                    </FormField>
                  )}
                />
                <Controller
                  control={control}
                  name="accumulatedParamsText"
                  render={({ field, fieldState }) => (
                    <FormField
                      label="Accumulate these URL params"
                      htmlFor="campAccParams"
                      error={fieldState.error?.message}
                      help="One key=value per line. Added to funnel tracking URLs unless a funnel overrides them."
                    >
                      <Input.TextArea
                        id="campAccParams"
                        rows={4}
                        className="font-mono text-xs"
                        placeholder={'param1=value\nparam2=value'}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                      />
                    </FormField>
                  )}
                />
              </div>
            ),
          },
        ]}
      />
    </form>
  )
}

export interface CampaignEditorModalProps {
  open: boolean
  mode: 'create' | 'edit'
  campaignId: string | null
  onClose: () => void
  onSaved: (campaign: Campaign) => void
}

export function CampaignEditorModal({
  open,
  mode,
  campaignId,
  onClose,
  onSaved,
}: CampaignEditorModalProps) {
  const saveCampaign = useSaveCampaign()
  const detailQuery = useCampaign(campaignId ?? '')
  const busy = saveCampaign.isPending

  const loadingDetail = mode === 'edit' && open && Boolean(campaignId) && detailQuery.isLoading

  const handleModalClose = () => {
    if (busy) return
    onClose()
  }

  const formReady =
    open &&
    !loadingDetail &&
    !(mode === 'edit' && detailQuery.isError) &&
    (mode === 'create' || Boolean(detailQuery.data))

  return (
    <FormModal
      open={open}
      onCancel={handleModalClose}
      destroyOnHidden
    >
      <FormModalHeader title={mode === 'create' ? 'Create Campaign' : 'Edit Campaign'} />
      <FormModalBody>
        {loadingDetail ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : mode === 'edit' && detailQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Could not load campaign"
            description={getErrorMessage(detailQuery.error)}
          />
        ) : mode === 'create' ? (
          <CampaignCreateForm
            formId={CAMPAIGN_EDITOR_FORM_ID}
            saveCampaignMutate={saveCampaign.mutate}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : detailQuery.data ? (
          <CampaignEditForm
            key={detailQuery.data.idCampaign}
            formId={CAMPAIGN_EDITOR_FORM_ID}
            campaign={detailQuery.data}
            saveCampaignMutate={saveCampaign.mutate}
            onSaved={onSaved}
            onClose={onClose}
          />
        ) : null}
      </FormModalBody>
      <FormModalFooter>
        <Button onClick={handleModalClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          form={CAMPAIGN_EDITOR_FORM_ID}
          loading={busy}
          disabled={!formReady}
        >
          {mode === 'create' ? 'Create Campaign' : 'Save Campaign'}
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
