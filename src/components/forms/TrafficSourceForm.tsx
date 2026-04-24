import { useEffect, useId, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField, Modal, Button, Input, Select } from '@/components/ui-kit'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { trafficSourceSchema, type TrafficSourceFormData } from '@/schemas/trafficSource'
import { mapTrafficSourceTemplateLoadToFormPatch } from '@/api/trafficSourceTemplateLoad'
import { useTrafficSourceTemplates, useLoadTrafficSourceTemplate, useCategories } from '@/api/hooks'
import type { TrafficSource } from '@/types/entities'
import { generateEntityId } from '@/lib/id-generator'

interface TrafficSourceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficSource | null
  onSubmit: (data: TrafficSourceFormData) => void
  isSubmitting?: boolean
}

const defaultValues: TrafficSourceFormData = {
  idTrafficSource: '',
  trafficSourceName: '',
  costType: 'cpe',
  defaultCost: '',
  trackingFields: [],
  postback: {
    postbackType: 'none',
    postbackCode: '',
  },
  idCategory: '',
}

function categoryIdForForm(
  initial: TrafficSource | null | undefined,
  categories: { idCategory: string; name: string }[] | undefined,
): string {
  if (!initial) return ''
  if (initial.idCategory) return initial.idCategory
  const name = initial.categoryName?.trim()
  if (!name || !categories?.length) return ''
  const hit = categories.find((c) => c.name === name)
  return hit?.idCategory ?? ''
}

function toFormDefaultCostField(value: string | number | undefined): string {
  if (value === undefined || value === '') return ''
  return String(value)
}

export function TrafficSourceForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: TrafficSourceFormProps) {
  const { data: templates } = useTrafficSourceTemplates(open)
  const { data: categories } = useCategories('trafficsource')
  const loadTemplate = useLoadTrafficSourceTemplate()
  const [templateSelectValue, setTemplateSelectValue] = useState<string | undefined>()

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
    formState: { errors },
  } = useForm<TrafficSourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(trafficSourceSchema) as any,
    defaultValues,
  })

  const formId = useId()
  const postbackType = watch('postback.postbackType')
  const isEditing = !!initialData?.idTrafficSource

  const categorySelectOptions = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        value: c.idCategory,
        label: c.name,
      })),
    [categories],
  )

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idTrafficSource: initialData.idTrafficSource,
          trafficSourceName: initialData.trafficSourceName,
          costType: initialData.costType,
          defaultCost: toFormDefaultCostField(initialData.defaultCost),
          trackingFields: initialData.trackingFields ?? [],
          postback: {
            postbackType: initialData.postback?.postbackType ?? 'none',
            postbackCode: initialData.postback?.postbackCode ?? '',
          },
          isArchived: initialData.isArchived,
          idCategory: categoryIdForForm(initialData, categories),
        })
      } else {
        reset({ ...defaultValues, idTrafficSource: generateEntityId() })
      }
    }
  }, [open, initialData, categories, reset])

  const handlePickTemplate = (templateName: string | null) => {
    setTemplateSelectValue(templateName ?? undefined)
    if (!templateName) return
    loadTemplate.mutate(templateName, {
      onSuccess: (data) => {
        setTemplateSelectValue(undefined)
        const draftId = getValues('idTrafficSource')
        reset({
          ...defaultValues,
          ...mapTrafficSourceTemplateLoadToFormPatch(data),
          idTrafficSource: draftId && draftId.length > 0 ? draftId : generateEntityId(),
          idCategory: '',
        })
      },
    })
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      afterClose={() => setTemplateSelectValue(undefined)}
      title={isEditing ? 'Edit Traffic Source' : 'Add Traffic Source'}
      width={640}
      destroyOnHidden
      scrollBody
      footer={
        <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
          <Button htmlType="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            form={formId}
            loading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {isEditing ? 'Update the traffic source configuration.' : 'Create a new traffic source.'}
          </p>

          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-4">
            {isEditing && initialData?.idTrafficSource && (
              <FormField label="ID">
                <Input value={initialData.idTrafficSource} disabled className="font-mono text-xs" />
              </FormField>
            )}

            {!isEditing && templates && templates.length > 0 && (
              <FormField label="Copy from Template">
                <Select
                  allowClear
                  value={templateSelectValue}
                  placeholder="Select a template"
                  className="w-full"
                  onChange={handlePickTemplate}
                  options={templates.map((template) => ({
                    value: template.id,
                    label: template.name,
                  }))}
                />
              </FormField>
            )}

            <FormField label="Name" htmlFor="trafficSourceName" error={errors.trafficSourceName?.message}>
              <Controller
                control={control}
                name="trafficSourceName"
                render={({ field }) => (
                  <Input
                    id="trafficSourceName"
                    placeholder="Traffic source name"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </FormField>

            <FormField label="Category">
              <Controller
                control={control}
                name="idCategory"
                render={({ field }) => (
                  <Select
                    allowClear
                    placeholder="Uncategorized"
                    className="w-full"
                    value={field.value && field.value.length > 0 ? field.value : undefined}
                    onChange={(v) => field.onChange(v ?? '')}
                    options={categorySelectOptions}
                  />
                )}
              />
            </FormField>

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
              <Controller
                control={control}
                name="defaultCost"
                render={({ field }) => (
                  <Input
                    id="defaultCost"
                    placeholder="e.g. 0, 0.5, {bid}"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
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
                <Controller
                  control={control}
                  name="postback.postbackCode"
                  render={({ field }) => (
                    <Input.TextArea
                      id="postbackCode"
                      placeholder={postbackType === 'javascript' ? 'Enter JavaScript code...' : 'Enter postback URL...'}
                      rows={3}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
              </FormField>
            )}
          </form>
        </div>
      </div>
    </Modal>
  )
}
