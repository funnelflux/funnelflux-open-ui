import { useMemo, useState } from 'react'
import { Segmented, Space } from '@/components/ui-kit'
import { Button, Input, Select, FormField, Modal, useToastApi } from '@/components/ui-kit'
import { useCampaignsList } from '@/api/hooks'

export type AddCampaignOrFunnelMode = 'funnel' | 'campaign'

export interface AddCampaignOrFunnelModalProps {
  open: boolean
  onClose: () => void
  /** When opening from a campaign row’s “add funnel” action */
  initialCampaignId?: string | null
  onOpenCampaignForm: () => void
  onCreateFunnel: (args: { campaignId: string; funnelName: string; openEditor: boolean }) => void
  onQuickCreateCampaign: (name: string) => Promise<string>
  funnelCreatePending?: boolean
  campaignQuickCreatePending?: boolean
}

export function AddCampaignOrFunnelModal({
  open,
  onClose,
  initialCampaignId,
  onOpenCampaignForm,
  onCreateFunnel,
  onQuickCreateCampaign,
  funnelCreatePending,
  campaignQuickCreatePending,
}: AddCampaignOrFunnelModalProps) {
  const toast = useToastApi()
  const [mode, setMode] = useState<AddCampaignOrFunnelMode>('funnel')
  const [campaignId, setCampaignId] = useState<string | undefined>(initialCampaignId ?? undefined)
  const [funnelName, setFunnelName] = useState('')
  const [newCampaignOpen, setNewCampaignOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')

  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsList()

  const options = useMemo(
    () =>
      campaigns?.map((c) => ({
        value: c.id,
        label: c.name || c.id,
      })) ?? [],
    [campaigns],
  )

  const submitFunnel = (openEditor: boolean) => {
    const name = funnelName.trim()
    if (!campaignId) {
      toast.error('Select a campaign')
      return
    }
    if (!name) {
      toast.error('Funnel name is required')
      return
    }
    onCreateFunnel({ campaignId, funnelName: name, openEditor })
  }

  const handleQuickCreateCampaign = async () => {
    const name = newCampaignName.trim()
    if (!name) return
    try {
      const id = await onQuickCreateCampaign(name)
      setCampaignId(id)
      setNewCampaignOpen(false)
      setNewCampaignName('')
    } catch {
      /* toast from parent */
    }
  }

  return (
    <>
      <Modal
        title="Add funnel or campaign"
        open={open}
        onCancel={onClose}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <div className="mb-4">
          <Segmented
            block
            value={mode}
            onChange={(v) => setMode(v as AddCampaignOrFunnelMode)}
            options={[
              { label: 'Funnel', value: 'funnel' },
              { label: 'Campaign', value: 'campaign' },
            ]}
          />
        </div>

        {mode === 'campaign' ? (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Create a campaign with full settings: default costs, URL parameters, custom tokens, and overrides.
            </p>
            <Button
              type="primary"
              block
              uiVariant="default"
              onClick={() => {
                onClose()
                onOpenCampaignForm()
              }}
            >
              Open campaign form
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            <FormField label="1. Select a campaign">
              <Space.Compact className="w-full">
                <Select
                  showSearch
                  allowClear
                  placeholder="Choose a campaign"
                  className="flex-1 min-w-0"
                  loading={campaignsLoading}
                  options={options}
                  value={campaignId}
                  onChange={(v) => setCampaignId(v)}
                  optionFilterProp="label"
                />
                <Button
                  type="primary"
                  iconName="plus"
                  title="New campaign"
                  aria-label="Create campaign and select it"
                  loading={campaignQuickCreatePending}
                  onClick={() => setNewCampaignOpen(true)}
                />
              </Space.Compact>
            </FormField>

            <FormField label="2. Funnel name" help="Required.">
              <Input
                placeholder="Enter funnel name"
                value={funnelName}
                onChange={(e) => setFunnelName(e.target.value)}
                onPressEnter={() => submitFunnel(false)}
              />
            </FormField>

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <Button
                type="primary"
                disabled={!campaignId || !funnelName.trim() || funnelCreatePending}
                loading={funnelCreatePending}
                onClick={() => submitFunnel(false)}
              >
                Add funnel
              </Button>
              <Button
                type="primary"
                uiVariant="default"
                disabled={!campaignId || !funnelName.trim() || funnelCreatePending}
                loading={funnelCreatePending}
                onClick={() => submitFunnel(true)}
              >
                Add &amp; edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="New campaign name"
        open={newCampaignOpen}
        onCancel={() => { setNewCampaignOpen(false); setNewCampaignName('') }}
        onOk={() => void handleQuickCreateCampaign()}
        okText="Create"
        confirmLoading={campaignQuickCreatePending}
        destroyOnHidden
      >
        <Input
          placeholder="Enter new campaign name"
          value={newCampaignName}
          onChange={(e) => setNewCampaignName(e.target.value)}
          onPressEnter={() => void handleQuickCreateCampaign()}
        />
      </Modal>
    </>
  )
}
