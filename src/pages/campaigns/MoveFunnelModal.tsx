import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  Modal,
  Select,
  useToastApi,
} from '@/components/ui-kit'
import { useCampaignsList } from '@/api/hooks'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'
import type { FunnelMoveRequest } from '@/types/entities'

export interface MoveFunnelTarget {
  funnelId: string
  funnelName: string
  currentCampaignId: string
}

export interface MoveFunnelModalProps {
  open: boolean
  onClose: () => void
  target: MoveFunnelTarget | null
  onMoved: () => void
}

export function MoveFunnelModal({
  open,
  onClose,
  target,
  onMoved,
}: MoveFunnelModalProps) {
  const toast = useToastApi()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined)
  const [manualCampaignId, setManualCampaignId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentCampaignId = target?.currentCampaignId ?? ''

  const selectOptions = useMemo(
    () =>
      campaigns
        ?.filter((c) => c.id !== currentCampaignId)
        .map((c) => ({
          value: c.id,
          label: c.name ? `${c.name} (${c.id})` : c.id,
        })) ?? [],
    [campaigns, currentCampaignId],
  )

  useEffect(() => {
    if (!open) return
    setSelectedCampaignId(undefined)
    setManualCampaignId('')
    setSubmitting(false)
  }, [open])

  const resolvedTargetId = manualCampaignId.trim() || selectedCampaignId?.trim() || ''

  const handleSubmit = async () => {
    if (!target?.funnelId) return
    if (!resolvedTargetId) {
      toast.error('Select a campaign or enter a campaign ID')
      return
    }
    if (resolvedTargetId === currentCampaignId) {
      toast.error('Choose a different campaign than the current one')
      return
    }
    const body: FunnelMoveRequest = {
      idFunnel: target.funnelId,
      idCampaign: resolvedTargetId,
    }
    setSubmitting(true)
    try {
      await api.put('/data/campaign/funnel/move/', body)
      toast.success('Funnel moved')
      onMoved()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Move funnel to another campaign"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>,
        <Button
          key="move"
          type="primary"
          className="bg-orange-600 hover:bg-orange-600/90"
          loading={submitting}
          disabled={!resolvedTargetId}
          onClick={() => void handleSubmit()}
        >
          Move
        </Button>,
      ]}
      width={480}
    >
      <div className="space-y-4 pt-1">
        {target?.funnelName ? (
          <p className="text-sm text-muted-foreground">
            Funnel: <span className="font-medium text-foreground">{target.funnelName}</span>
          </p>
        ) : null}

        <FormField
          label="Target campaign"
          help="Search by name or ID. You can paste a campaign ID below if it is not in the list."
        >
          <Select
            showSearch
            allowClear
            placeholder="Choose a campaign"
            className="w-full"
            loading={campaignsLoading}
            options={selectOptions}
            value={selectedCampaignId}
            onChange={(value) => setSelectedCampaignId(value)}
            optionFilterProp="label"
          />
        </FormField>

        <FormField label="Or paste campaign ID">
          <Input
            placeholder="e.g. 1829177054538638144"
            value={manualCampaignId}
            onChange={(e) => setManualCampaignId(e.target.value)}
            onPressEnter={() => void handleSubmit()}
          />
        </FormField>
      </div>
    </Modal>
  )
}
