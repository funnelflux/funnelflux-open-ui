import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { FormField, Modal, Button, Input, Select } from '@/components/ui-kit'
import { useOfferSourceTemplates, useLoadOfferSourceTemplate } from '@/api/hooks'
import { mapOfferSourceTemplateLoadToFormPatch } from '@/api/offerSourceTemplateLoad'
import { offerSourceSchema, type OfferSourceFormData } from '@/schemas/offerSource'
import type { OfferSource } from '@/types/entities'

const defaultValues: OfferSourceFormData = {
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
  const [templateSelectValue, setTemplateSelectValue] = useState<string | undefined>()
  const isEditing = !!initialData?.idOfferSource

  const form = useForm<OfferSourceFormData>({
    resolver: zodResolver(offerSourceSchema) as Resolver<OfferSourceFormData>,
    defaultValues,
  })

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = form

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
        reset(defaultValues)
      }
    }
  }, [open, initialData, reset])

  const handleClose = () => onOpenChange(false)

  const handlePickTemplate = (templateId: string | null) => {
    setTemplateSelectValue(templateId ?? undefined)
    if (!templateId) return
    loadTemplate.mutate(templateId, {
      onSuccess: (data) => {
        setTemplateSelectValue(undefined)
        reset({
          ...defaultValues,
          ...mapOfferSourceTemplateLoadToFormPatch(data),
        })
      },
    })
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterClose={() => setTemplateSelectValue(undefined)}
      title={isEditing ? 'Edit Offer Source' : 'Add Offer Source'}
      footer={null}
      width={640}
      destroyOnHidden
      scrollBody
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 space-y-6">
        {isEditing && initialData?.idOfferSource && (
          <FormField label="ID">
            <Input value={initialData.idOfferSource} disabled className="font-mono text-xs" />
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

        <FormField label="Query Separator" htmlFor="querySeparator">
          <Controller
            control={control}
            name="querySeparator"
            render={({ field }) => (
              <Input
                id="querySeparator"
                placeholder="&"
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
        <div className="shrink-0 border-t border-border bg-background px-6 py-3 flex gap-2">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create'}
          </Button>
          <Button htmlType="button" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
