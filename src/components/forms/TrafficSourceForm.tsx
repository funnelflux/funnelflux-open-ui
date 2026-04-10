import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select, Modal } from 'antd'
import { FormField } from '@/components/ui-kit'
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
    <Modal open={open} onCancel={() => onOpenChange(false)} title={isEditing ? 'Edit Traffic Source' : 'Add Traffic Source'} footer={null} width={640} destroyOnHidden>
      <p className="text-sm text-muted-foreground mb-4">
        {isEditing ? 'Update the traffic source configuration.' : 'Create a new traffic source.'}
      </p>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 pt-4">
        {isEditing && initialData?.idTrafficSource && (
          <FormField label="ID">
            <Input value={initialData.idTrafficSource} disabled className="font-mono text-xs" />
          </FormField>
        )}

        {!isEditing && templates && templates.length > 0 && (
          <FormField label="Copy from Template">
            <Select
              onChange={handleLoadTemplate}
              placeholder="Select a template"
              className="w-full"
              options={templates.map((template) => ({
                value: template.id,
                label: template.name,
              }))}
            />
          </FormField>
        )}

        <FormField label="Name" htmlFor="trafficSourceName" error={errors.trafficSourceName?.message}>
          <Input id="trafficSourceName" {...register('trafficSourceName')} placeholder="Traffic source name" />
        </FormField>

        {isEditing && initialData?.categoryName && (
          <FormField label="Category">
            <Input value={initialData.categoryName} disabled />
          </FormField>
        )}

        <FormField label="Cost Type">
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
        </FormField>

        <FormField label="Default Cost" htmlFor="defaultCost" error={errors.defaultCost?.message}>
          <Input id="defaultCost" type="number" step="any" min="0" {...register('defaultCost')} />
        </FormField>

        <FormField label="Tracking Fields">
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
        </FormField>

        <FormField label="Postback Type">
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
        </FormField>

        {postbackType !== 'none' && (
          <FormField label={postbackType === 'javascript' ? 'JavaScript Code' : 'Postback URL'} htmlFor="postbackCode">
            <Input.TextArea
              id="postbackCode"
              {...register('postback.postbackCode')}
              placeholder={postbackType === 'javascript' ? 'Enter JavaScript code...' : 'Enter postback URL...'}
              rows={3}
            />
          </FormField>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button htmlType="button" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="primary" htmlType="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
