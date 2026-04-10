import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button, Input, InputNumber, Select, Collapse, Modal } from 'antd'
import { FormField, SmartSelect } from '@/components/ui-kit'
import type { SmartSelectOption } from '@/components/ui-kit'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { campaignSchema, type CampaignFormData } from '@/schemas/campaign'
import { useTrafficSources } from '@/api/hooks'
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
  const { data: trafficSources } = useTrafficSources()

  const tsOptions: SmartSelectOption[] = (trafficSources ?? []).map((ts) => ({
    label: ts.trafficSourceName,
    value: ts.idTrafficSource,
    searchId: ts.idTrafficSource,
  }))

  const form = useForm<CampaignFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(campaignSchema) as any,
    defaultValues: {
      idCampaign: '',
      campaignName: '',
      acculumatedUrlParams: [],
      customTokens: [],
      defaultCostPerEntrance: 0,
      costOverrides: [],
      postbackOverrides: [],
    },
  })

  const costOverrides = useFieldArray({ control: form.control, name: 'costOverrides' })
  const postbackOverrides = useFieldArray({ control: form.control, name: 'postbackOverrides' })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idCampaign: initialData.idCampaign,
          campaignName: initialData.campaignName,
          acculumatedUrlParams: initialData.acculumatedUrlParams ?? [],
          customTokens: initialData.customTokens ?? [],
          defaultCostPerEntrance: initialData.defaultCostPerEntrance ?? 0,
          costOverrides: initialData.costOverrides ?? [],
          postbackOverrides: initialData.postbackOverrides ?? [],
        })
      } else {
        form.reset({
          idCampaign: '',
          campaignName: '',
          acculumatedUrlParams: [],
          customTokens: [],
          defaultCostPerEntrance: 0,
          costOverrides: [],
          postbackOverrides: [],
        })
      }
    }
  }, [open, initialData, form])

  return (
    <Modal open={open} onCancel={() => onOpenChange(false)} title={initialData ? 'Edit Campaign' : 'New Campaign'} footer={null} width={640} destroyOnHidden>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form
        onSubmit={form.handleSubmit(onSubmit as any)}
        className="space-y-6 pt-4"
      >
        {initialData?.idCampaign && (
          <FormField label="ID">
            <Input value={initialData.idCampaign} disabled className="font-mono text-xs" />
          </FormField>
        )}

        <FormField label="Name" htmlFor="campaignName" error={form.formState.errors.campaignName?.message}>
          <Input
            id="campaignName"
            {...form.register('campaignName')}
            placeholder="Campaign name"
          />
        </FormField>

        <FormField label="Default Cost Per Entrance" htmlFor="defaultCostPerEntrance">
          <Controller
            control={form.control}
            name="defaultCostPerEntrance"
            render={({ field }) => (
              <InputNumber
                id="defaultCostPerEntrance"
                value={field.value}
                onChange={(v) => field.onChange(v ?? 0)}
                min={0}
                step={0.01}
                className="w-full"
                placeholder="0.00"
              />
            )}
          />
        </FormField>

        <FormField label="URL Parameters">
          <KeyValueListField
            value={form.watch('acculumatedUrlParams')}
            onChange={(v) => form.setValue('acculumatedUrlParams', v, { shouldDirty: true })}
            keyLabel="Parameter"
            valueLabel="Value"
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        </FormField>

        <FormField label="Custom Tokens">
          <KeyValueListField
            value={form.watch('customTokens')}
            onChange={(v) => form.setValue('customTokens', v, { shouldDirty: true })}
            keyLabel="Token"
            valueLabel="Value"
            keyPlaceholder="token_name"
            valuePlaceholder="token_value"
          />
        </FormField>

        <Collapse
          ghost
          items={[
            {
              key: 'cost-overrides',
              label: `Cost Overrides (${costOverrides.fields.length})`,
              children: (
                <div className="space-y-3">
                  {costOverrides.fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name={`costOverrides.${index}.idTrafficSource`}
                          render={({ field: f }) => (
                            <SmartSelect
                              options={tsOptions}
                              value={f.value || undefined}
                              onChange={f.onChange}
                              placeholder="Traffic source"
                              className="w-full"
                            />
                          )}
                        />
                      </div>
                      <div className="w-28">
                        <Controller
                          control={form.control}
                          name={`costOverrides.${index}.cost`}
                          render={({ field: f }) => (
                            <InputNumber
                              value={f.value}
                              onChange={(v) => f.onChange(v ?? 0)}
                              min={0}
                              step={0.01}
                              className="w-full"
                              placeholder="Cost"
                            />
                          )}
                        />
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => costOverrides.remove(index)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => costOverrides.append({ idTrafficSource: '', cost: 0 })}
                  >
                    Add Override
                  </Button>
                </div>
              ),
            },
            {
              key: 'postback-overrides',
              label: `Postback Overrides (${postbackOverrides.fields.length})`,
              children: (
                <div className="space-y-3">
                  {postbackOverrides.fields.map((field, index) => (
                    <div key={field.id} className="space-y-2 border border-border rounded p-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Controller
                            control={form.control}
                            name={`postbackOverrides.${index}.idTrafficSource`}
                            render={({ field: f }) => (
                              <SmartSelect
                                options={tsOptions}
                                value={f.value || undefined}
                                onChange={f.onChange}
                                placeholder="Traffic source"
                                className="w-full"
                              />
                            )}
                          />
                        </div>
                        <div className="w-40">
                          <Controller
                            control={form.control}
                            name={`postbackOverrides.${index}.postbackType`}
                            render={({ field: f }) => (
                              <Select
                                value={f.value || undefined}
                                onChange={f.onChange}
                                className="w-full"
                                options={[
                                  { value: 'none', label: 'None' },
                                  { value: 'postbackUrl', label: 'Postback URL' },
                                  { value: 'pixelUrl', label: 'Pixel URL' },
                                  { value: 'javascript', label: 'JavaScript' },
                                ]}
                              />
                            )}
                          />
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => postbackOverrides.remove(index)}
                        />
                      </div>
                      <Input.TextArea
                        {...form.register(`postbackOverrides.${index}.postbackCode`)}
                        placeholder="Postback code or URL..."
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => postbackOverrides.append({ idTrafficSource: '', postbackType: 'none', postbackCode: '' })}
                  >
                    Add Override
                  </Button>
                </div>
              ),
            },
          ]}
        />

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
    </Modal>
  )
}
