import { useEffect } from 'react'
import { useForm, Controller, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input, Checkbox, FormField, Modal } from '@/components/ui-kit'
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
    resolver: zodResolver(campaignSchema) as Resolver<CampaignFormData>,
    defaultValues: {
      idCampaign: '',
      campaignName: '',
      acculumatedUrlParams: [],
      customTokens: [],
      isArchived: false,
    },
  })

  const { reset } = form
  const acculumatedUrlParams = useWatch({ control: form.control, name: 'acculumatedUrlParams' })
  const customTokens = useWatch({ control: form.control, name: 'customTokens' })

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idCampaign: initialData.idCampaign,
          campaignName: initialData.campaignName,
          acculumatedUrlParams: initialData.acculumatedUrlParams ?? [],
          customTokens: initialData.customTokens ?? [],
          isArchived: initialData.isArchived ?? false,
        })
      } else {
        reset({
          idCampaign: '',
          campaignName: '',
          acculumatedUrlParams: [],
          customTokens: [],
          isArchived: false,
        })
      }
    }
  }, [open, initialData, reset])

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title={initialData ? 'Edit Campaign' : 'New Campaign'}
      footer={null}
      width={640}
      destroyOnHidden
      layoutVariant="form"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 space-y-6">
        {initialData?.idCampaign && (
          <FormField label="ID">
            <Input value={initialData.idCampaign} disabled className="font-mono text-xs" />
          </FormField>
        )}

        <FormField label="Name" htmlFor="campaignName" error={form.formState.errors.campaignName?.message}>
          <Controller
            control={form.control}
            name="campaignName"
            render={({ field }) => (
              <Input
                id="campaignName"
                placeholder="Campaign name"
                maxLength={255}
                showCount
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>

        <FormField label="Archived">
          <Controller
            control={form.control}
            name="isArchived"
            render={({ field }) => (
              <Checkbox checked={field.value ?? false} onChange={(e) => field.onChange(e.target.checked)}>
                Archived
              </Checkbox>
            )}
          />
        </FormField>

        <FormField label="URL Parameters">
          <KeyValueListField
            value={acculumatedUrlParams}
            onChange={(v) => form.setValue('acculumatedUrlParams', v, { shouldDirty: true })}
            keyLabel="Parameter"
            valueLabel="Value"
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        </FormField>

        <FormField label="Custom Tokens">
          <KeyValueListField
            value={customTokens}
            onChange={(v) => form.setValue('customTokens', v, { shouldDirty: true })}
            keyLabel="Token"
            valueLabel="Value"
            keyPlaceholder="token_name"
            valuePlaceholder="token_value"
          />
        </FormField>

        <p className="text-xs text-muted-foreground">
          Default cost per entrance, cost overrides, and postback overrides are set on each funnel (FunnelFlux funnel model), not on the campaign.
        </p>

        </div>
        <div className="shrink-0 border-t border-border bg-background px-6 py-3 flex flex-wrap justify-end gap-2">
          <Button htmlType="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <span className="mr-2 inline-flex">
                <Icon name="loader-2" size="md" animation="spin" />
              </span>
            )}
            {initialData ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
