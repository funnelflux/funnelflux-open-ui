import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select, Drawer } from 'antd'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { trafficSourceSchema, type TrafficSourceFormData } from '@/schemas/trafficSource'
import { useTrafficSourceTemplates, useLoadTrafficSourceTemplate } from '@/api/hooks'
import type { TrafficSource } from '@/types/entities'

interface TrafficSourceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficSource | null
  onSubmit: (data: TrafficSourceFormData) => void
  isSubmitting?: boolean
}

const defaultValues: TrafficSourceFormData = {
  trafficSourceName: '',
  costType: 'cpe',
  defaultCost: 0,
  trackingFields: [],
  postback: {
    postbackType: 'none',
    postbackCode: '',
  },
}

export function TrafficSourceForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: TrafficSourceFormProps) {
  const { data: templates } = useTrafficSourceTemplates(open)
  const loadTemplate = useLoadTrafficSourceTemplate()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<TrafficSourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(trafficSourceSchema) as any,
    defaultValues,
  })

  const postbackType = watch('postback.postbackType')
  const isEditing = !!initialData?.idTrafficSource

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idTrafficSource: initialData.idTrafficSource,
          trafficSourceName: initialData.trafficSourceName,
          costType: initialData.costType,
          defaultCost: initialData.defaultCost,
          trackingFields: initialData.trackingFields ?? [],
          postback: {
            postbackType: initialData.postback?.postbackType ?? 'none',
            postbackCode: initialData.postback?.postbackCode ?? '',
          },
          isArchived: initialData.isArchived,
        })
      } else {
        reset(defaultValues)
      }
    }
  }, [open, initialData, reset])

  const handleLoadTemplate = (templateId: string) => {
    loadTemplate.mutate(templateId, {
      onSuccess: (data) => {
        reset({
          ...defaultValues,
          trafficSourceName: data.trafficSourceName,
          costType: data.costType,
          defaultCost: data.defaultCost,
          trackingFields: data.trackingFields ?? [],
          postback: {
            postbackType: data.postback?.postbackType ?? 'none',
            postbackCode: data.postback?.postbackCode ?? '',
          },
        })
      },
    })
  }

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title={isEditing ? 'Edit Traffic Source' : 'Add Traffic Source'} width={512} destroyOnHidden>
      <p className="text-sm text-muted-foreground mb-4">
        {isEditing ? 'Update the traffic source configuration.' : 'Create a new traffic source.'}
      </p>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
        {/* Load Template */}
        {!isEditing && templates && templates.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Copy from Template</label>
            <Select
              onChange={handleLoadTemplate}
              placeholder="Select a template"
              className="w-full"
              options={templates.map((template) => ({
                value: template.id,
                label: template.name,
              }))}
            />
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="trafficSourceName" className="text-sm font-medium">Name</label>
          <Input
            id="trafficSourceName"
            {...register('trafficSourceName')}
            placeholder="Traffic source name"
          />
          {errors.trafficSourceName && (
            <p className="text-xs text-destructive">{errors.trafficSourceName.message}</p>
          )}
        </div>

        {/* Cost Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Cost Type</label>
          <Controller
            control={control}
            name="costType"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onChange={field.onChange}
                className="w-full"
                options={[
                  { value: 'cpe', label: 'CPE (Cost Per Entrance)' },
                  { value: 'cpa', label: 'CPA (Cost Per Action)' },
                ]}
              />
            )}
          />
        </div>

        {/* Default Cost */}
        <div className="space-y-1.5">
          <label htmlFor="defaultCost" className="text-sm font-medium">Default Cost</label>
          <Input
            id="defaultCost"
            type="number"
            step="any"
            min="0"
            {...register('defaultCost')}
          />
          {errors.defaultCost && (
            <p className="text-xs text-destructive">{errors.defaultCost.message}</p>
          )}
        </div>

        {/* Tracking Fields */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tracking Fields</label>
          <Controller
            control={control}
            name="trackingFields"
            render={({ field }) => (
              <KeyValueListField
                value={field.value}
                onChange={field.onChange}
                keyLabel="Parameter"
                valueLabel="Token"
              />
            )}
          />
        </div>

        {/* Postback Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Postback Type</label>
          <Controller
            control={control}
            name="postback.postbackType"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onChange={field.onChange}
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

        {/* Postback Code */}
        {postbackType !== 'none' && (
          <div className="space-y-1.5">
            <label htmlFor="postbackCode" className="text-sm font-medium">
              {postbackType === 'javascript' ? 'JavaScript Code' : 'Postback URL'}
            </label>
            <Input.TextArea
              id="postbackCode"
              {...register('postback.postbackCode')}
              placeholder={
                postbackType === 'javascript'
                  ? 'Enter JavaScript code...'
                  : 'Enter postback URL...'
              }
              rows={3}
            />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            htmlType="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
