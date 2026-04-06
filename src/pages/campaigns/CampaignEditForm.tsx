import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Drawer } from 'antd'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { campaignSchema, type CampaignFormData } from '@/schemas/campaign'
import type { Campaign } from '@/types/entities'

interface CampaignEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Campaign
  onSubmit: (data: CampaignFormData) => void
  isSubmitting?: boolean
}

export function CampaignEditForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: CampaignEditFormProps) {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      idCampaign: '',
      campaignName: '',
      acculumatedUrlParams: [],
      customTokens: [],
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idCampaign: initialData.idCampaign,
          campaignName: initialData.campaignName,
          acculumatedUrlParams: initialData.acculumatedUrlParams ?? [],
          customTokens: initialData.customTokens ?? [],
        })
      } else {
        form.reset({
          idCampaign: '',
          campaignName: '',
          acculumatedUrlParams: [],
          customTokens: [],
        })
      }
    }
  }, [open, initialData, form])

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title={initialData ? 'Edit Campaign' : 'New Campaign'} width={440} destroyOnHidden>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="campaignName" className="text-sm font-medium">Name</label>
          <Input
            id="campaignName"
            {...form.register('campaignName')}
            placeholder="Campaign name"
          />
          {form.formState.errors.campaignName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.campaignName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">URL Parameters</label>
          <KeyValueListField
            value={form.watch('acculumatedUrlParams')}
            onChange={(v) => form.setValue('acculumatedUrlParams', v, { shouldDirty: true })}
            keyLabel="Parameter"
            valueLabel="Value"
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Tokens</label>
          <KeyValueListField
            value={form.watch('customTokens')}
            onChange={(v) => form.setValue('customTokens', v, { shouldDirty: true })}
            keyLabel="Token"
            valueLabel="Value"
            keyPlaceholder="token_name"
            valuePlaceholder="token_value"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Save' : 'Create'}
          </Button>
          <Button
            htmlType="button"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
