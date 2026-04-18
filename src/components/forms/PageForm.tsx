import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import {
  Button,
  Input,
  InputNumber,
  Select,
  Switch,
  Collapse,
  FormField,
  useToastApi,
  Modal,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { useOfferSources, useCategories, useSaveCategory } from '@/api/hooks'
import { pageSchema, type PageFormData } from '@/schemas/page'
import type { Page, PageType, FluxifyParams } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'
import { generateEntityId } from '@/lib/id-generator'

type FluxifyFormParams = NonNullable<PageFormData['fluxifyParams']>

interface PageFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageType: PageType
  initialData?: Page
  onSubmit: (data: PageFormData) => void
  isSubmitting?: boolean
}

const REDIRECT_OPTIONS = [
  { value: '307', label: '307 Redirect' },
  { value: '301', label: '301 Redirect' },
  { value: 'umr', label: 'UMR (Meta Refresh)' },
  { value: 'fluxify', label: 'Fluxify (Reverse Proxy)' },
] as const

const defaultFluxifyParams: FluxifyFormParams = {
  enableCache: false,
  enableDirectTrafficProtection: false,
  enableLinkRewriter: false,
  enableContentRewriter: false,
  enableVideoAutoPlayBreaker: false,
  enableExitPopupBreaker: false,
  enableAnalyticsBreaker: false,
  enableReferrerAndUASpoofer: false,
}

export function PageForm({
  open,
  onOpenChange,
  pageType,
  initialData,
  onSubmit,
  isSubmitting,
}: PageFormProps) {
  const isOffer = pageType === 'offer'
  const entityLabel = isOffer ? 'Offer' : 'Lander'
  const toast = useToastApi()
  const saveCategory = useSaveCategory()
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { data: offerSources } = useOfferSources()
  const { data: categories } = useCategories('page')

  const offerSourceOptions: SelectOption[] = useMemo(
    () => (offerSources ?? []).map((os) => ({ label: os.offerSourceName, value: os.idOfferSource, searchId: os.idOfferSource })),
    [offerSources],
  )

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { label: 'None', value: '' },
      ...(categories ?? []).map((c) => ({ label: c.name, value: c.idCategory })),
    ],
    [categories],
  )

  const form = useForm<PageFormData>({
    resolver: zodResolver(pageSchema) as Resolver<PageFormData>,
    defaultValues: {
      idPage: '',
      pageType,
      pageName: '',
      url: '',
      redirectType: '307',
      categoryId: '',
      numberOfActions: undefined,
      tags: [],
      notes: '',
      offerParams: isOffer ? { idOfferSource: '', payout: 0 } : undefined,
      fluxifyParams: undefined,
    },
  })

  const redirectType = form.watch('redirectType')
  const isFluxify = redirectType === 'fluxify'
  const fluxifyParams = form.watch('fluxifyParams')

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idPage: initialData.idPage,
          pageType: initialData.pageType,
          pageName: initialData.pageName,
          url: initialData.url,
          redirectType: initialData.redirectType,
          categoryId: initialData.categoryId ?? '',
          numberOfActions: initialData.numberOfActions,
          tags: initialData.tags ?? [],
          notes: initialData.notes ?? '',
          offerParams: isOffer
            ? initialData.offerParams ?? { idOfferSource: '', payout: 0 }
            : undefined,
          fluxifyParams: initialData.fluxifyParams ?? (initialData.redirectType === 'fluxify' ? defaultFluxifyParams : undefined),
        })
      } else {
        form.reset({
          idPage: generateEntityId(),
          pageType,
          pageName: '',
          url: '',
          redirectType: '307',
          categoryId: '',
          numberOfActions: undefined,
          tags: [],
          notes: '',
          offerParams: isOffer ? { idOfferSource: '', payout: 0 } : undefined,
          fluxifyParams: undefined,
        })
      }
    }
  }, [open, initialData, form, pageType, isOffer])

  // Auto-initialize fluxifyParams when switching to fluxify redirect type
  useEffect(() => {
    if (isFluxify && !fluxifyParams) {
      form.setValue('fluxifyParams', defaultFluxifyParams, { shouldDirty: true })
    } else if (!isFluxify && fluxifyParams) {
      form.setValue('fluxifyParams', undefined, { shouldDirty: true })
    }
  }, [isFluxify, fluxifyParams, form])

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    form.setValue('tags', tags, { shouldDirty: true })
  }

  const setFluxifyField = (field: keyof FluxifyParams, value: unknown) => {
    const current = form.getValues('fluxifyParams') ?? defaultFluxifyParams
    form.setValue('fluxifyParams', { ...current, [field]: value } as FluxifyFormParams, { shouldDirty: true })
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    try {
      const res = await saveCategory.mutateAsync({ entityType: 'page', name }) as { idCategory?: string }
      const id = res?.idCategory
      if (id) form.setValue('categoryId', id, { shouldDirty: true, shouldValidate: true })
      toast.success('Category created')
      setNewCategoryOpen(false)
      setNewCategoryName('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <Modal open={open} onCancel={() => onOpenChange(false)} title={initialData ? `Edit ${entityLabel}` : `New ${entityLabel}`} footer={null} width={640} destroyOnHidden scrollBody>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 space-y-5">
        {initialData?.idPage && (
          <FormField label="ID">
            <Input value={initialData.idPage} disabled className="font-mono text-xs" />
          </FormField>
        )}

        <FormField label="Name" htmlFor="pageName" error={form.formState.errors.pageName?.message}>
          <Controller
            control={form.control}
            name="pageName"
            render={({ field }) => (
              <Input
                id="pageName"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder={`${entityLabel} name`}
              />
            )}
          />
        </FormField>

        <FormField label="URL" htmlFor="url" error={form.formState.errors.url?.message}>
          <Controller
            control={form.control}
            name="url"
            render={({ field }) => (
              <Input
                id="url"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder="https://example.com/page"
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Redirect Type">
            <Controller
              control={form.control}
              name="redirectType"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onChange={field.onChange}
                  placeholder="Select redirect type"
                  className="w-full"
                  options={REDIRECT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                />
              )}
            />
          </FormField>

          <FormField label="Category">
            <div className="flex gap-1 items-center">
              <div className="min-w-0 flex-1">
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      options={categoryOptions}
                      value={field.value || undefined}
                      onChange={field.onChange}
                      placeholder="Select category"
                      className="w-full"
                    />
                  )}
                />
              </div>
              <Button
                type="text"
                size="small"
                icon={<Plus className="h-3.5 w-3.5" />}
                title="New category"
                onClick={() => setNewCategoryOpen(true)}
              />
            </div>
          </FormField>
        </div>

        {!isOffer && (
          <FormField label="Number of Actions" htmlFor="numberOfActions" help="Number of CTA actions on this lander (1-64)">
            <Controller
              control={form.control}
              name="numberOfActions"
              render={({ field }) => (
                <InputNumber
                  id="numberOfActions"
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? undefined)}
                  min={1}
                  max={64}
                  className="w-full"
                  placeholder="1"
                />
              )}
            />
          </FormField>
        )}

        <FormField label="Tags" htmlFor="tags" help="Comma-separated list of tags">
          <Input
            id="tags"
            value={form.watch('tags').join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
        </FormField>

        {isOffer && (
          <>
            <FormField label="Offer Source">
              <Select
                options={offerSourceOptions}
                value={form.watch('offerParams.idOfferSource') || undefined}
                onChange={(v) =>
                  form.setValue('offerParams.idOfferSource', v, {
                    shouldDirty: true,
                  })
                }
                placeholder="Select offer source"
                className="w-full"
              />
            </FormField>

            <FormField label="Payout" htmlFor="payout" error={form.formState.errors.offerParams?.payout?.message}>
              <Controller
                control={form.control}
                name="offerParams.payout"
                render={({ field }) => (
                  <Input
                    id="payout"
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      field.onChange(v === '' ? 0 : Number(v))
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    placeholder="0.00"
                  />
                )}
              />
            </FormField>
          </>
        )}

        <FormField label="Notes" htmlFor="notes">
          <Controller
            control={form.control}
            name="notes"
            render={({ field }) => (
              <Input.TextArea
                id="notes"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder="Optional notes..."
                rows={3}
              />
            )}
          />
        </FormField>

        {/* Fluxify Advanced Settings */}
        {isFluxify && fluxifyParams && (
          <Collapse
            ghost
            items={[{
              key: 'fluxify',
              label: 'Fluxify Advanced Settings',
              children: (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Page</span>
                    <Switch checked={fluxifyParams.enableCache} onChange={(v) => setFluxifyField('enableCache', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hide From Direct Traffic</span>
                    <Switch checked={fluxifyParams.enableDirectTrafficProtection} onChange={(v) => setFluxifyField('enableDirectTrafficProtection', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prevent Videos Auto-Playing</span>
                    <Switch checked={fluxifyParams.enableVideoAutoPlayBreaker} onChange={(v) => setFluxifyField('enableVideoAutoPlayBreaker', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Disable Exit Popups</span>
                    <Switch checked={fluxifyParams.enableExitPopupBreaker} onChange={(v) => setFluxifyField('enableExitPopupBreaker', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Break Analytics</span>
                    <Switch checked={fluxifyParams.enableAnalyticsBreaker} onChange={(v) => setFluxifyField('enableAnalyticsBreaker', v)} />
                  </div>

                  {/* Link Rewriter */}
                  <div className="border border-border rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Enable Link Rewriter</span>
                      <Switch checked={fluxifyParams.enableLinkRewriter} onChange={(v) => setFluxifyField('enableLinkRewriter', v)} />
                    </div>
                    {fluxifyParams.enableLinkRewriter && (
                      <KeyValueListField
                        value={fluxifyParams.linkRewriterParams?.map ?? []}
                        onChange={(v) => setFluxifyField('linkRewriterParams', { map: v })}
                        keyLabel="From URL"
                        valueLabel="To URL"
                        keyPlaceholder="https://old-domain.com"
                        valuePlaceholder="https://new-domain.com"
                      />
                    )}
                  </div>

                  {/* Content Rewriter */}
                  <div className="border border-border rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Enable Content Rewriter</span>
                      <Switch checked={fluxifyParams.enableContentRewriter} onChange={(v) => setFluxifyField('enableContentRewriter', v)} />
                    </div>
                    {fluxifyParams.enableContentRewriter && (
                      <>
                        <KeyValueListField
                          value={fluxifyParams.contentRewriterParams?.map ?? []}
                          onChange={(v) => setFluxifyField('contentRewriterParams', {
                            ...fluxifyParams.contentRewriterParams,
                            map: v,
                            headerCode: fluxifyParams.contentRewriterParams?.headerCode ?? '',
                            footerCode: fluxifyParams.contentRewriterParams?.footerCode ?? '',
                          })}
                          keyLabel="Find HTML"
                          valueLabel="Replace With"
                        />
                        <FormField label="Inject into <head>">
                          <Input.TextArea
                            value={fluxifyParams.contentRewriterParams?.headerCode ?? ''}
                            onChange={(e) => setFluxifyField('contentRewriterParams', {
                              ...fluxifyParams.contentRewriterParams,
                              map: fluxifyParams.contentRewriterParams?.map ?? [],
                              headerCode: e.target.value,
                              footerCode: fluxifyParams.contentRewriterParams?.footerCode ?? '',
                            })}
                            placeholder="Code to inject into <head>..."
                            rows={3}
                          />
                        </FormField>
                        <FormField label="Inject into <body>">
                          <Input.TextArea
                            value={fluxifyParams.contentRewriterParams?.footerCode ?? ''}
                            onChange={(e) => setFluxifyField('contentRewriterParams', {
                              ...fluxifyParams.contentRewriterParams,
                              map: fluxifyParams.contentRewriterParams?.map ?? [],
                              headerCode: fluxifyParams.contentRewriterParams?.headerCode ?? '',
                              footerCode: e.target.value,
                            })}
                            placeholder="Code to inject into <body>..."
                            rows={3}
                          />
                        </FormField>
                      </>
                    )}
                  </div>

                  {/* Referrer & UA Spoofer */}
                  <div className="border border-border rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Spoof Referrer & UA</span>
                      <Switch checked={fluxifyParams.enableReferrerAndUASpoofer} onChange={(v) => setFluxifyField('enableReferrerAndUASpoofer', v)} />
                    </div>
                    {fluxifyParams.enableReferrerAndUASpoofer && (
                      <>
                        <FormField label="Referrers (one per line)">
                          <Input.TextArea
                            value={(fluxifyParams.referrerAndUASpooferParams?.referrers ?? []).join('\n')}
                            onChange={(e) => setFluxifyField('referrerAndUASpooferParams', {
                              referrers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                              userAgents: fluxifyParams.referrerAndUASpooferParams?.userAgents ?? [],
                            })}
                            placeholder="https://google.com&#10;https://facebook.com"
                            rows={3}
                          />
                        </FormField>
                        <FormField label="User Agents (one per line)">
                          <Input.TextArea
                            value={(fluxifyParams.referrerAndUASpooferParams?.userAgents ?? []).join('\n')}
                            onChange={(e) => setFluxifyField('referrerAndUASpooferParams', {
                              referrers: fluxifyParams.referrerAndUASpooferParams?.referrers ?? [],
                              userAgents: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                            })}
                            placeholder="Mozilla/5.0 ..."
                            rows={3}
                          />
                        </FormField>
                      </>
                    )}
                  </div>
                </div>
              ),
            }]}
          />
        )}

        </div>
        <div className="shrink-0 border-t border-border bg-background px-6 py-3 flex gap-2">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Save' : 'Create'}
          </Button>
          <Button htmlType="button" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>

      <Modal
        open={newCategoryOpen}
        title="New category"
        onCancel={() => { setNewCategoryOpen(false); setNewCategoryName('') }}
        onOk={() => void handleCreateCategory()}
        okText="Create"
        confirmLoading={saveCategory.isPending}
        okButtonProps={{ disabled: !newCategoryName.trim() }}
        destroyOnHidden
      >
        <div className="py-3">
          <Input
            placeholder="Category name (letters, numbers, spaces)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={() => void handleCreateCategory()}
            autoFocus
          />
        </div>
      </Modal>
    </Modal>
  )
}
