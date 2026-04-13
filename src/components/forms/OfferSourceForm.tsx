import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select, Modal } from 'antd'
import { FormField } from '@/components/ui-kit'
import { useOfferSourceTemplates, useLoadOfferSourceTemplate } from '@/api/hooks'
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
  const isEditing = !!initialData?.idOfferSource

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferSourceFormData>({
    resolver: zodResolver(offerSourceSchema) as Resolver<OfferSourceFormData>,
    defaultValues,
  })

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

  const handleLoadTemplate = (templateId: string) => {
    loadTemplate.mutate(templateId, {
      onSuccess: (data) => {
        reset({
          ...defaultValues,
          offerSourceName: data.offerSourceName,
          subId: data.subId ?? '',
          querySeparator: data.querySeparator ?? '&',
          postbackSubId: data.postbackSubId ?? '',
          postbackTxId: data.postbackTxId ?? '',
          postbackPayout: data.postbackPayout ?? '',
        })
      },
    })
  }

  return (
    <Modal open={open} onCancel={() => onOpenChange(false)} title={isEditing ? 'Edit Offer Source' : 'Add Offer Source'} footer={null} width={640} destroyOnHidden>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
        {isEditing && initialData?.idOfferSource && (
          <FormField label="ID">
            <Input value={initialData.idOfferSource} disabled className="font-mono text-xs" />
          </FormField>
        )}

        {!isEditing && templates && templates.length > 0 && (
          <FormField label="Copy from Template">
            <Select onChange={handleLoadTemplate} placeholder="Select a template" className="w-full">
              {templates.map((template) => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Name" htmlFor="offerSourceName" error={errors.offerSourceName?.message}>
          <Input id="offerSourceName" {...register('offerSourceName')} placeholder="Offer source name" />
        </FormField>

        <FormField label="Sub ID Parameter" htmlFor="subId">
          <Input id="subId" {...register('subId')} placeholder="e.g. sub_id" />
        </FormField>

        <FormField label="Query Separator" htmlFor="querySeparator">
          <Input id="querySeparator" {...register('querySeparator')} placeholder="&" />
        </FormField>

        <FormField label="Postback Sub ID" htmlFor="postbackSubId">
          <Input id="postbackSubId" {...register('postbackSubId')} placeholder="Postback sub ID token" />
        </FormField>

        <FormField label="Postback TX ID" htmlFor="postbackTxId">
          <Input id="postbackTxId" {...register('postbackTxId')} placeholder="Postback transaction ID token" />
        </FormField>

        <FormField label="Postback Payout" htmlFor="postbackPayout">
          <Input id="postbackPayout" {...register('postbackPayout')} placeholder="Postback payout token" />
        </FormField>

        <FormField label="Notes" htmlFor="notes">
          <Input.TextArea id="notes" {...register('notes')} placeholder="Optional notes..." rows={3} />
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
