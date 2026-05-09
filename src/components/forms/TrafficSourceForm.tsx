import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
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
  const loadTemplateMutate = loadTemplate.mutate
  const [templateSelectValue, setTemplateSelectValue] = useState<string | undefined>()

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<TrafficSourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(trafficSourceSchema) as any,
    defaultValues,
  })

  const formId = useId()
  const postbackType = useWatch({ control, name: 'postback.postbackType' })
  const isEditing = !!initialData?.idTrafficSource

  const categorySelectOptions = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        value: c.idCategory,
        label: c.name,
      })),
    [categories],
  )
  const templateOptions = useMemo(
    () => (templates ?? []).map((template) => ({ value: template.id, label: template.name })),
    [templates],
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

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange])

  const handleAfterClose = useCallback(() => setTemplateSelectValue(undefined), [])

  const handlePickTemplate = useCallback((templateName: string | null) => {
    setTemplateSelectValue(templateName ?? undefined)
    if (!templateName) return
    loadTemplateMutate(templateName, {
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
  }, [getValues, loadTemplateMutate, reset])

  const modalTitle = useMemo(() => {
    const title = isEditing ? 'Edit Traffic Source' : 'Add Traffic Source'
    if (isEditing || templateOptions.length === 0) return title

    return (
      <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          <span className="shrink-0">Use template</span>
          <Select
            allowClear
            value={templateSelectValue}
            placeholder="Select template"
            className="w-52"
            size="sm"
            onChange={handlePickTemplate}
            options={templateOptions}
          />
        </div>
      </div>
    )
  }, [handlePickTemplate, isEditing, templateOptions, templateSelectValue])

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterClose={handleAfterClose}
      title={modalTitle}
      width={640}
      destroyOnHidden
      layoutVariant="form"
      footer={
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button htmlType="button" onClick={handleClose}>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3">
          <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-3">
            {isEditing && initialData?.idTrafficSource && (
              <FormField label="ID">
                <Input value={initialData.idTrafficSource} disabled className="font-mono text-xs" />
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
