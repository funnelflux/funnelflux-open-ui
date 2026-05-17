import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Collapse,
  Field,
  Input,
  Modal,
  Spin,
  useToastApi,
} from '@/components/ui-kit'
import { type SaveCampaignInput, useCampaign, useSaveCampaign } from '@/api/hooks'
import { getErrorMessage } from '@/lib/utils'
import type { Campaign, KeyValuePair } from '@/types/entities'

function kvToLines(rows: KeyValuePair[] | undefined): string {
  if (!rows?.length) return ''
  return rows.map((row) => `${row.key}=${row.value}`).join('\n')
}

function linesToKv(text: string): KeyValuePair[] {
  return text
    .split('\n')
    .map((line) => {
      const equalsIndex = line.indexOf('=')
      if (equalsIndex === -1) return { key: line.trim(), value: '' }
      return { key: line.slice(0, equalsIndex).trim(), value: line.slice(equalsIndex + 1).trim() }
    })
    .filter((row) => row.key !== '' || row.value !== '')
}

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
  const [campaignName, setCampaignName] = useState('')
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = campaignName.trim()
    if (!trimmed) {
      toast.error('Campaign name is required')
      return
    }
    saveCampaignMutate(
      { create: true, campaignName: trimmed, isArchived: false },
      {
        onSuccess: (data) => {
          toast.success('Campaign created')
          onSaved(data)
          onClose()
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }
  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
      <Field title="Campaign name" htmlFor="campaignName" required>
        <Input
          id="campaignName"
          value={campaignName}
          onChange={(event) => setCampaignName(event.target.value)}
          placeholder="Campaign name"
          maxLength={255}
        />
      </Field>
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
  const [campaignName, setCampaignName] = useState(campaign.campaignName)
  const [customTokensText, setCustomTokensText] = useState(kvToLines(campaign.customTokens))
  const [accParamsText, setAccParamsText] = useState(kvToLines(campaign.acculumatedUrlParams))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = campaignName.trim()
    if (!trimmed) {
      toast.error('Campaign name is required')
      return
    }
    const payload: SaveCampaignInput = {
      ...campaign,
      campaignName: trimmed,
      customTokens: linesToKv(customTokensText),
      acculumatedUrlParams: linesToKv(accParamsText),
    }
    saveCampaignMutate(payload, {
      onSuccess: (data) => {
        toast.success('Campaign saved')
        onSaved(data)
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
      <Field title="Campaign name" htmlFor="campaignNameEdit" required>
        <Input
          id="campaignNameEdit"
          value={campaignName}
          onChange={(event) => setCampaignName(event.target.value)}
          placeholder="Campaign name"
          maxLength={255}
        />
      </Field>
      <Field title="Campaign ID" htmlFor="campaignIdReadonly" description="Read-only identifier">
        <Input id="campaignIdReadonly" readOnly value={campaign.idCampaign} />
      </Field>
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
                <Field
                  title="Custom tokens"
                  htmlFor="campCustomTokens"
                  description="One key=value per line. Usable in conditions, JS and PHP nodes."
                >
                  <Input.TextArea
                    id="campCustomTokens"
                    rows={5}
                    className="font-mono text-xs"
                    placeholder={'token1=value_one\ntoken2=value_two'}
                    value={customTokensText}
                    onChange={(event) => setCustomTokensText(event.target.value)}
                  />
                </Field>
                <Field
                  title="Accumulate these URL params"
                  htmlFor="campAccParams"
                  description="One key=value per line. Added to funnel tracking URLs unless a funnel overrides them."
                >
                  <Input.TextArea
                    id="campAccParams"
                    rows={4}
                    className="font-mono text-xs"
                    placeholder={'param1=value\nparam2=value'}
                    value={accParamsText}
                    onChange={(event) => setAccParamsText(event.target.value)}
                  />
                </Field>
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
    <Modal
      open={open}
      onCancel={handleModalClose}
      title={mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
      layoutVariant="form"
      scrollBody
      width={560}
      destroyOnHidden
      footer={(
        <div className="flex justify-end gap-2">
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
        </div>
      )}
    >
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
    </Modal>
  )
}
