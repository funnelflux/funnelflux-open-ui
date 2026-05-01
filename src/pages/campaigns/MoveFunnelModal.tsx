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
  /** Single funnel, or several with the same workflow (bulk move to one campaign) */
  target: MoveFunnelTarget | MoveFunnelTarget[] | null
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

  const targets = useMemo((): MoveFunnelTarget[] => {
    if (!target) return []
    return Array.isArray(target) ? target : [target]
  }, [target])

  const currentCampaignId = targets[0]?.currentCampaignId ?? ''

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
    if (targets.length === 0) return
    if (!resolvedTargetId) {
      toast.error('Select a campaign or enter a campaign ID')
      return
    }
    const wrongCampaign = targets.some((t) => resolvedTargetId === t.currentCampaignId)
    if (wrongCampaign) {
      toast.error('Choose a different campaign than a funnel’s current campaign')
      return
    }
    setSubmitting(true)
    try {
      for (const t of targets) {
        const body: FunnelMoveRequest = {
          idFunnel: t.funnelId,
          idCampaign: resolvedTargetId,
        }
        await api.put('/data/campaign/funnel/move/', body)
      }
      toast.success(targets.length > 1 ? `${targets.length} funnels moved` : 'Funnel moved')
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
      title={targets.length > 1 ? `Move ${targets.length} funnels` : 'Move funnel to another campaign'}
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
          uiVariant="default"
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
        {targets.length === 1 && targets[0]?.funnelName ? (
          <p className="text-sm text-muted-foreground">
            Funnel: <span className="font-medium text-foreground">{targets[0].funnelName}</span>
          </p>
        ) : null}
        {targets.length > 1 ? (
          <ul className="text-sm text-muted-foreground max-h-32 overflow-y-auto list-disc pl-5 space-y-0.5">
            {targets.map((t) => (
              <li key={t.funnelId}><span className="text-foreground">{t.funnelName}</span></li>
            ))}
          </ul>
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
