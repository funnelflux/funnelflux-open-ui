import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { FormField, FormModal, FormModalBody, FormModalFooter, FormModalHeader, Button, Input, Select } from '@/components/ui-kit'
import { useOfferSourceTemplates, useLoadOfferSourceTemplate } from '@/api/hooks'
import { useDomains } from '@/api/hooks/useDomains'
import { mapOfferSourceTemplateLoadToFormPatch } from '@/api/offerSourceTemplateLoad'
import { offerSourceSchema, type OfferSourceFormData } from '@/schemas/offerSource'
import type { OfferSource } from '@/types/entities'
import { generateEntityId } from '@/lib/id-generator'

export type OfferSourceFormMode = 'create' | 'edit' | 'clone'

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

function toTrackingBaseUrl(domain: string | null | undefined): string {
  if (!domain) return window.location.origin
  const trimmed = domain.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/+$/, '')
  }
  return `${window.location.protocol}//${trimmed}`.replace(/\/+$/, '')
}

export function OfferSourceForm({
  open,
  onOpenChange,
  mode: modeProp,
  initialData,
  createInitialValues,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: OfferSourceFormMode
  initialData?: OfferSource | null
  createInitialValues?: OfferSourceFormData
  onSubmit: (
    data: OfferSourceFormData,
    options?: { createAnother?: boolean },
  ) => Promise<void>
  isSubmitting?: boolean
}) {
  const { data: templates } = useOfferSourceTemplates(open)
  const { data: domains } = useDomains()
  const loadTemplate = useLoadOfferSourceTemplate()
  const loadTemplateMutate = loadTemplate.mutate
  const [templateSelectValue, setTemplateSelectValue] = useState<string | undefined>()
  const [submitMode, setSubmitMode] = useState<'default' | 'createAnother'>('default')
  const mode: OfferSourceFormMode =
    modeProp ?? (initialData?.idOfferSource ? 'edit' : 'create')
  const isEditing = mode === 'edit'
  const isClone = mode === 'clone'
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
  const postbackSubId = useWatch({ control, name: 'postbackSubId' })
  const postbackTxId = useWatch({ control, name: 'postbackTxId' })
  const postbackPayout = useWatch({ control, name: 'postbackPayout' })
  const defaultDomain = useMemo(
    () => domains?.find((domain) => domain.isDefault)?.domain ?? domains?.[0]?.domain,
    [domains],
  )

  useEffect(() => {
    if (!open) return
    if (isEditing && initialData) {
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
      return
    }
    if (createInitialValues) {
      reset(createInitialValues)
      return
    }
    reset({ ...defaultValues, idOfferSource: generateEntityId() })
  }, [open, isEditing, initialData, createInitialValues, reset])

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

  const postbackUrlPreview = useMemo(() => {
    const base = `${toTrackingBaseUrl(defaultDomain)}/tracking/conversions/postback.php`
    const payout = postbackPayout || '{payout}'
    const txid = postbackTxId || '{transaction_id}'
    const subid = postbackSubId || '{aff_sub}'
    return `${base}?flux_payout=${payout}&flux_txid=${txid}&flux_hid=${subid}`
  }, [defaultDomain, postbackPayout, postbackSubId, postbackTxId])

  const handleSubmitAndMaybeReset = useCallback(
    async (data: OfferSourceFormData) => {
      const createAnother = submitMode === 'createAnother' && !isEditing
      await onSubmit(data, createAnother ? { createAnother: true } : undefined)
      if (createAnother) {
        reset({ ...defaultValues, idOfferSource: generateEntityId() })
      }
      setSubmitMode('default')
    },
    [isEditing, onSubmit, reset, submitMode],
  )

  const modalTitle = isEditing
    ? 'Edit Offer Source'
    : isClone
      ? 'Clone Offer Source'
      : 'Add Offer Source'

  const templateHeaderActions = useMemo(() => {
    if (isEditing || isClone || templateOptions.length === 0) return undefined
    return (
      <div className="flex w-full min-w-0 flex-col gap-2 text-xs font-normal text-muted-foreground sm:flex-row sm:items-center">
        <span className="shrink-0">Use template</span>
        <Select
          allowClear
          value={templateSelectValue}
          placeholder="Select template"
          className="w-full min-w-0 sm:w-52"
          size="sm"
          onChange={handlePickTemplate}
          options={templateOptions}
        />
      </div>
    )
  }, [handlePickTemplate, isClone, isEditing, templateOptions, templateSelectValue])

  return (
    <FormModal
      open={open}
      onCancel={handleClose}
      afterClose={handleAfterClose}
      destroyOnHidden
    >
      <FormModalHeader title={modalTitle} actions={templateHeaderActions} />
      <FormModalBody>
        <form
          id={formId}
          onSubmit={handleSubmit(handleSubmitAndMaybeReset)}
          className="space-y-4"
        >
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

          <FormField label="Postback URL">
            <Input value={postbackUrlPreview} disabled className="font-mono text-xs" />
          </FormField>

        </form>
      </FormModalBody>
      <FormModalFooter>
        {offerSourceId ? (
          <div className="mr-auto text-[11px] text-muted-foreground max-sm:mr-0 max-sm:w-full">
            ID <span className="font-mono">{offerSourceId}</span>
          </div>
        ) : null}
        <Button htmlType="button" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        {!isEditing && !isClone ? (
          <Button
            htmlType="submit"
            form={formId}
            disabled={isSubmitting}
            onClick={() => setSubmitMode('createAnother')}
          >
            Create & New
          </Button>
        ) : null}
        <Button
          type="primary"
          htmlType="submit"
          form={formId}
          disabled={isSubmitting}
          iconName={isSubmitting ? 'loader-2' : undefined}
          iconAnimation={isSubmitting ? 'spin' : 'none'}
          iconSize="sm"
          onClick={() => setSubmitMode('default')}
        >
          {isEditing ? 'Save Changes' : 'Create'}
        </Button>
      </FormModalFooter>
    </FormModal>
  )
}
