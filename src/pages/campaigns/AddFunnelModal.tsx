import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input, Modal, Select } from '@/components/ui-kit'
import { useCampaignsList } from '@/api/hooks'

/** OpenAPI `Funnel.funnelName`: max 255 characters */
export const FUNNEL_NAME_MAX_LEN = 255

export interface AddFunnelModalProps {
  open: boolean
  onClose: () => void
}

export function AddFunnelModal({ open, onClose }: AddFunnelModalProps) {
  const navigate = useNavigate()
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined)
  const [funnelName, setFunnelName] = useState('')
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList()

  const campaignOptions = useMemo(
    () => (campaigns ?? []).map((c) => ({ label: c.name, value: c.id })),
    [campaigns],
  )

  const handleConfirm = useCallback(() => {
    const name = funnelName.trim().slice(0, FUNNEL_NAME_MAX_LEN)
    if (!campaignId || !name) return
    navigate(`/campaigns/${campaignId}/funnels/new`, { state: { funnelName: name } })
    onClose()
  }, [campaignId, funnelName, navigate, onClose])

  return (
    <Modal
      open={open}
      title="Add funnel"
      okText="Open editor"
      onCancel={onClose}
      onOk={() => handleConfirm()}
      okButtonProps={{
        disabled: !campaignId || !funnelName.trim(),
      }}
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
            disabled={campaignsLoading}
            className="w-full"
          />
        </Field>
        <Field
          title="Funnel name"
          required
          htmlFor="add-funnel-modal-name"
          description={`Required when saving (API max ${FUNNEL_NAME_MAX_LEN} characters).`}
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
            onPressEnter={() => handleConfirm()}
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
