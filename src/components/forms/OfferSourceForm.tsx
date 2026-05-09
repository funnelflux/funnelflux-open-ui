import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { FormField, Modal, Button, Input, Select } from '@/components/ui-kit'
import { useOfferSourceTemplates, useLoadOfferSourceTemplate } from '@/api/hooks'
import { mapOfferSourceTemplateLoadToFormPatch } from '@/api/offerSourceTemplateLoad'
import { offerSourceSchema, type OfferSourceFormData } from '@/schemas/offerSource'
import type { OfferSource } from '@/types/entities'
import { generateEntityId } from '@/lib/id-generator'

const defaultValues: OfferSourceFormData = {
  idOfferSource: '',
  offerSourceName: '',
  subId: '',
  querySeparator: '&',
  postbackSubId: '',
  postbackTxId: '',
  postbackPayout: '',
  notes: '',
}

export function OfferSourceForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: OfferSource | null | undefined
  onSubmit: (data: OfferSourceFormData) => void
  isSubmitting?: boolean
}) {
  const { data: templates } = useOfferSourceTemplates(open)
  const loadTemplate = useLoadOfferSourceTemplate()
  const loadTemplateMutate = loadTemplate.mutate
  const [templateSelectValue, setTemplateSelectValue] = useState<string | undefined>()
  const isEditing = !!initialData?.idOfferSource
  const templateOptions = useMemo(
    () => (templates ?? []).map((template) => ({ value: template.id, label: template.name })),
    [templates],
  )

  const form = useForm<OfferSourceFormData>({
    resolver: zodResolver(offerSourceSchema) as Resolver<OfferSourceFormData>,
    defaultValues,
  })

  const {
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = form
  const formId = useId()
  const offerSourceId = useWatch({ control, name: 'idOfferSource' })

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idOfferSource: initialData.idOfferSource,
          offerSourceName: initialData.offerSourceName,
          subId: initialData.subId ?? '',
          querySeparator: initialData.querySeparator ?? '&',
          postbackSubId: initialData.postbackSubId ?? '',
          postbackTxId: initialData.postbackTxId ?? '',
          postbackPayout: initialData.postbackPayout ?? '',
          notes: (initialData as OfferSource & { notes?: string }).notes ?? '',
          isArchived: initialData.isArchived,
        })
      } else {
        reset({ ...defaultValues, idOfferSource: generateEntityId() })
      }
    }
  }, [open, initialData, reset])

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange])

  const handleAfterClose = useCallback(() => setTemplateSelectValue(undefined), [])

  const handlePickTemplate = useCallback((templateId: string | null) => {
    setTemplateSelectValue(templateId ?? undefined)
    if (!templateId) return
    loadTemplateMutate(templateId, {
      onSuccess: (data) => {
        setTemplateSelectValue(undefined)
        const draftId = getValues('idOfferSource')
        reset({
          ...defaultValues,
          ...mapOfferSourceTemplateLoadToFormPatch(data),
          idOfferSource: draftId && draftId.length > 0 ? draftId : generateEntityId(),
        })
      },
    })
  }, [getValues, loadTemplateMutate, reset])

  const modalTitle = useMemo(() => {
    const title = isEditing ? 'Edit Offer Source' : 'Add Offer Source'
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
      footer={
        <div className="flex flex-col gap-2 border-t border-border bg-background px-5 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button htmlType="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form={formId}
              disabled={isSubmitting}
              iconName={isSubmitting ? 'loader-2' : undefined}
              iconAnimation={isSubmitting ? 'spin' : 'none'}
              iconSize="sm"
            >
              {isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
          {offerSourceId && (
            <div className="text-right text-[11px] text-muted-foreground">
              ID <span className="font-mono">{offerSourceId}</span>
            </div>
          )}
        </div>
      }
      width={640}
      destroyOnHidden
      layoutVariant="form"
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-3 pb-4">
          <FormField label="Name" htmlFor="offerSourceName" error={errors.offerSourceName?.message}>
            <Controller
              control={control}
              name="offerSourceName"
              render={({ field }) => (
                <Input
                  id="offerSourceName"
                  placeholder="Offer source name"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          <FormField label="Sub ID Parameter" htmlFor="subId">
            <Controller
              control={control}
              name="subId"
              render={({ field }) => (
                <Input
                  id="subId"
                  placeholder="e.g. sub_id"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          <FormField label="Postback Sub ID" htmlFor="postbackSubId">
            <Controller
              control={control}
              name="postbackSubId"
              render={({ field }) => (
                <Input
                  id="postbackSubId"
                  placeholder="Postback sub ID token"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          <FormField label="Postback TX ID" htmlFor="postbackTxId">
            <Controller
              control={control}
              name="postbackTxId"
              render={({ field }) => (
                <Input
                  id="postbackTxId"
                  placeholder="Postback transaction ID token"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          <FormField label="Postback Payout" htmlFor="postbackPayout">
            <Controller
              control={control}
              name="postbackPayout"
              render={({ field }) => (
                <Input
                  id="postbackPayout"
                  placeholder="Postback payout token"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          <FormField label="Notes" htmlFor="notes">
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Input.TextArea
                  id="notes"
                  placeholder="Optional notes..."
                  rows={3}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormField>

          {isEditing && initialData && (
            <FormField label="Postback URL">
              <Input
                value={`YOUR_DOMAIN/postback?subid=${initialData.postbackSubId || '{subid}'}&txid=${initialData.postbackTxId || '{txid}'}&payout=${initialData.postbackPayout || '{payout}'}`}
                disabled
                className="font-mono text-xs"
              />
            </FormField>
          )}

        </div>
      </form>
    </Modal>
  )
}
