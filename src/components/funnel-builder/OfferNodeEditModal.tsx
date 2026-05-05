import { Icon } from '@/components/ui-kit/icons'
import { useEffect, useMemo } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  FormField,
  Input,
  InputNumber,
  Select,
  Switch,
  Modal,
  useToastApi,
} from '@/components/ui-kit'
import { useCategories, useOfferSources } from '@/api/hooks'
import { offerNodeEditSchema, type OfferNodeEditFormData } from '@/schemas/offerNode'
import type { Page } from '@/types/entities'
import { NODE_TYPES, type OfferNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { cn, getErrorMessage } from '@/lib/utils'
import { PageCategoryCreateModal } from './PageCategoryCreateModal'
import {
  REDIRECT_NOTES,
  REDIRECT_SELECT_OPTIONS,
  TOKEN_SELECT_OPTIONS,
  UNCATEGORIZED,
  openNodePageUrl,
  pageNameForToast,
  toNodeAdditionalTokens,
  useCategorySmartOptions,
  useNodePageDetail,
  usePageCategoryCreator,
} from './pageNodeModalShared'

interface OfferNodeEditModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

export function OfferNodeEditModal({ nodeId, open, onClose }: OfferNodeEditModalProps) {
  const toast = useToastApi()
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)
  const setPendingPageDraft = useFunnelEditorStore((s) => s.setPendingPageDraft)
  const pendingPageDraft = useFunnelEditorStore((s) =>
    nodeId ? s.pendingPageDrafts[nodeId] : undefined,
  )

  const pageId =
    node?.data.nodeType === NODE_TYPES.offer
      ? String((node.data.params as OfferNodeParams).pageId ?? '')
      : ''

  const { data: page, isFetching, isError, error, noPage, pageLoading } = useNodePageDetail(pageId, open)
  const { data: categories } = useCategories('page')
  const { data: offerSources } = useOfferSources()

  const form = useForm<OfferNodeEditFormData>({
    resolver: zodResolver(offerNodeEditSchema),
    defaultValues: {
      pageType: 'offer',
      pageName: '',
      url: '',
      redirectType: '307',
      tags: [],
      notes: '',
      offerParams: { idOfferSource: '', payout: 0 },
      accumulateUrlParams: false,
      additionalTokens: [{ field: '', token: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additionalTokens',
  })

  useEffect(() => {
    if (!open || !node || node.data.nodeType !== NODE_TYPES.offer) return
    if (!pageId || (!page && !pendingPageDraft?.page)) return
    if (!pendingPageDraft?.page && isFetching) return
    if (form.formState.isDirty) return

    const p = node.data.params as OfferNodeParams
    const draft = pendingPageDraft?.page
    form.reset({
      idPage: String(draft?.idPage ?? page?.idPage ?? ''),
      pageType: 'offer',
      pageName: String(draft?.pageName ?? page?.pageName ?? ''),
      url: String(draft?.url ?? page?.url ?? ''),
      redirectType: (draft?.redirectType ?? page?.redirectType ?? '307') as OfferNodeEditFormData['redirectType'],
      tags: draft?.tags ?? page?.tags ?? [],
      notes: draft?.notes ?? page?.notes ?? '',
      isArchived: draft?.isArchived ?? page?.isArchived,
      offerParams: draft?.offerParams ?? page?.offerParams ?? { idOfferSource: '', payout: 0 },
      accumulateUrlParams: p.accumulateUrlParams ?? false,
      additionalTokens:
        p.additionalTokens && p.additionalTokens.length > 0
          ? p.additionalTokens.map((t) => ({ field: t.field, token: t.token }))
          : [{ field: '', token: '' }],
    })
  }, [open, node, page, pageId, form, isFetching, pendingPageDraft?.page])

  const urlValue = useWatch({ control: form.control, name: 'url', defaultValue: '' })
  const tags = useWatch({ control: form.control, name: 'tags', defaultValue: [] as string[] })
  const idPageWatch = useWatch({ control: form.control, name: 'idPage' })
  const redirectTypeWatch = useWatch({ control: form.control, name: 'redirectType', defaultValue: '307' })
  const accumulateUrlParamsWatch = useWatch({
    control: form.control,
    name: 'accumulateUrlParams',
    defaultValue: false,
  })

  const { categorySelectValue, categorySmartOptions } = useCategorySmartOptions(categories, tags)

  const offerSourceOptions = useMemo(
    () =>
      offerSources?.map((os) => ({
        label: os.offerSourceName,
        value: os.idOfferSource,
      })) ?? [],
    [offerSources],
  )

  const {
    addCategoryOpen,
    newCategoryName,
    setNewCategoryName,
    openAddCategoryModal,
    closeAddCategoryModal,
    handleConfirmAddCategory,
    addCategorySaving,
  } = usePageCategoryCreator({
    onCreated: (name) => form.setValue('tags', [name], { shouldDirty: true }),
  })

  const openOfferUrl = () => {
    openNodePageUrl(urlValue ?? '', toast)
  }

  const onSubmit = async (data: OfferNodeEditFormData) => {
    if (!nodeId || !node) return
    const payload: Partial<Page> = {
      idPage: data.idPage,
      pageType: 'offer',
      pageName: data.pageName,
      url: data.url,
      redirectType: data.redirectType,
      tags: data.tags ?? [],
      notes: data.notes ?? '',
      isArchived: data.isArchived,
      offerParams: data.offerParams,
    }

    const tokenRows = data.additionalTokens ?? form.getValues('additionalTokens')
    const tokens = toNodeAdditionalTokens(tokenRows)

    setPendingPageDraft(nodeId, { page: payload, original: page, isCreate: !pageId })

    updateNodeData(nodeId, {
      label: data.pageName,
      params: {
        ...(node.data.params as object),
        pageId: String(data.idPage),
        pageName: data.pageName,
        accumulateUrlParams: data.accumulateUrlParams,
        additionalTokens: tokens,
      },
    })

    toast.success(`${pageNameForToast('offer')} changes staged. Save the funnel to persist them.`)
    onClose()
  }

  const busy = false

  return (
    <>
      <Modal
        open={open}
        title="Edit offer"
        onCancel={onClose}
        destroyOnHidden
        maskClosable={false}
        width={640}
        layoutVariant="form"
        footer={
          <div className="flex w-full gap-2">
            <Button
              type="primary"
              htmlType="submit"
              form="offer-node-edit-form"
              disabled={busy || noPage || (!pendingPageDraft?.page && pageLoading) || isError}
              loading={busy}
              block
            >
              Save
            </Button>
            <Button htmlType="button" disabled={busy} onClick={onClose} block>
              Cancel
            </Button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
          {noPage ? (
                <p className="text-sm text-muted-foreground">
                  This node has no offer page assigned. Set a page ID from the funnel context or pick an offer when
                  creating the node.
                </p>
              ) : !pendingPageDraft?.page && pageLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Icon name="loader-2" size="lg" animation="spin" aria-label="Loading" />
                  Loading offer…
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive">
                  {error ? getErrorMessage(error) : 'Could not load offer.'}
                </p>
              ) : (
                <form
                  id="offer-node-edit-form"
                  className="min-w-0 space-y-8"
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Page</h3>

                    <div className="flex flex-col gap-4">
                      <FormField
                        label="Name"
                        htmlFor="offer-name"
                        required
                        error={form.formState.errors.pageName?.message}
                      >
                        <Controller
                          control={form.control}
                          name="pageName"
                          render={({ field }) => (
                            <Input
                              id="offer-name"
                              className="min-w-0 max-w-full"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              autoComplete="off"
                            />
                          )}
                        />
                      </FormField>

                      <FormField label="Category">
                        <div className="flex max-w-full min-w-0 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <Select
                              className="w-full"
                              options={categorySmartOptions}
                              value={categorySelectValue}
                              placeholder="Category"
                              onChange={(v) => {
                                if (v === '__none__' || v === UNCATEGORIZED) {
                                  form.setValue('tags', [], { shouldDirty: true })
                                } else {
                                  form.setValue('tags', [v], { shouldDirty: true })
                                }
                              }}
                            />
                          </div>
                          <Button
                            htmlType="button"
                            type="default"
                            size="md"
                            className="shrink-0"
                            title="Add category"
                            iconName="plus"
                            onClick={openAddCategoryModal}
                          />
                        </div>
                      </FormField>

                      <FormField label="ID">
                        <div className="flex max-w-full min-h-control-md min-w-0 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-xs text-muted-foreground">
                          <span className="min-w-0 truncate">
                            {idPageWatch || page?.idPage || '—'}
                          </span>
                        </div>
                      </FormField>
                    </div>

                      <FormField label="Offer URL" error={form.formState.errors.url?.message}>
                      <div className="flex max-w-full min-w-0 items-center gap-2">
                        <Controller
                          control={form.control}
                          name="url"
                          render={({ field }) => (
                            <Input
                              id="offer-url"
                              type="url"
                              size="md"
                              className="h-control-md min-h-0 min-w-0 flex-1"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              placeholder="https://…"
                            />
                          )}
                        />
                        <Button
                          htmlType="button"
                          type="default"
                          size="md"
                          className="shrink-0"
                          title="Open URL"
                          iconName="external-link"
                          onClick={openOfferUrl}
                        />
                      </div>
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                      <FormField label="Offer source">
                        <Controller
                          control={form.control}
                          name="offerParams.idOfferSource"
                          render={({ field }) => (
                            <Select
                              allowClear
                              className="w-full min-w-0"
                              options={offerSourceOptions}
                              placeholder="Select offer source"
                              value={field.value || undefined}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Payout"
                        error={form.formState.errors.offerParams?.payout?.message}
                      >
                        <Controller
                          control={form.control}
                          name="offerParams.payout"
                          render={({ field }) => (
                            <InputNumber
                              className="min-w-0 w-full"
                              min={0}
                              placeholder="0.00"
                              step={0.01}
                              value={field.value}
                              onBlur={field.onBlur}
                              onChange={(v) =>
                                field.onChange(typeof v === 'number' && !Number.isNaN(v) ? v : 0)
                              }
                            />
                          )}
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 sm:items-start">
                      <div className="flex min-w-0 flex-col space-y-2 sm:h-full">
                        <FormField label="Redirect type">
                          <Controller
                            control={form.control}
                            name="redirectType"
                            render={({ field }) => (
                              <Select
                                className="w-full min-w-0"
                                options={REDIRECT_SELECT_OPTIONS}
                                placeholder="Redirect type"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        </FormField>
                        {REDIRECT_NOTES[redirectTypeWatch] ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {REDIRECT_NOTES[redirectTypeWatch]}
                          </p>
                        ) : null}
                      </div>
                      <FormField
                        label="Notes"
                        className="flex min-h-0 min-w-0 flex-1 flex-col sm:h-full"
                      >
                        <Controller
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <Input.TextArea
                              className="min-h-0 flex-1 resize-y text-sm sm:min-h-[9.5rem]"
                              placeholder="Optional"
                              rows={6}
                              value={field.value ?? ''}
                              onBlur={field.onBlur}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          )}
                        />
                      </FormField>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-border pt-6">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">URL tokens (funnel node)</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional query parameters appended when visitors reach this page from this funnel. Field names
                        must be alphanumeric, dash, or underscore.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                      <div className="space-y-0.5">
                        <label htmlFor="offer-acc-url" className="text-sm font-normal text-foreground">
                          Pass accumulated URL parameters
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Include all accumulated query parameters from the visitor journey on the redirect URL.
                        </p>
                      </div>
                      <Switch
                        id="offer-acc-url"
                        checked={Boolean(accumulateUrlParamsWatch)}
                        onChange={(c) => form.setValue('accumulateUrlParams', c, { shouldDirty: true })}
                      />
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="space-y-1.5">
                            <span className={cn('block text-sm font-medium text-foreground', index > 0 && 'sr-only')}>
                              Query field
                            </span>
                            <Controller
                              control={form.control}
                              name={`additionalTokens.${index}.field`}
                              render={({ field }) => (
                                <Input
                                  placeholder="field_name"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  onBlur={field.onBlur}
                                  size="md"
                                  className="h-control-md font-mono text-sm"
                                />
                              )}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <span className={cn('block text-sm font-medium text-foreground', index > 0 && 'sr-only')}>
                              Token
                            </span>
                            <Controller
                              control={form.control}
                              name={`additionalTokens.${index}.token`}
                              render={({ field }) => (
                                <Select
                                  className="h-control-md w-full font-mono text-xs"
                                  value={field.value || '__pick__'}
                                  onChange={(v) => {
                                    field.onChange(v === '__pick__' ? '' : v)
                                  }}
                                  options={TOKEN_SELECT_OPTIONS}
                                  placeholder="Insert…"
                                  alphabetical={false}
                                />
                              )}
                            />
                          </div>
                          <div className="flex justify-end sm:justify-center">
                            <Button
                              htmlType="button"
                              type="text"
                              size="md"
                              className="text-muted-foreground"
                              title="Remove row"
                              disabled={fields.length <= 1}
                              iconName="trash-2"
                              onClick={() => remove(index)}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        htmlType="button"
                        iconName="plus"
                        iconSize="sm"
                        onClick={() => append({ field: '', token: '' })}
                      >
                        Pass another token
                      </Button>
                    </div>
                  </section>
                </form>
              )}
        </div>
      </Modal>

      <PageCategoryCreateModal
        open={addCategoryOpen}
        inputId="offer-new-category-name"
        value={newCategoryName}
        confirmLoading={addCategorySaving}
        onChange={setNewCategoryName}
        onConfirm={handleConfirmAddCategory}
        onCancel={closeAddCategoryModal}
      />
    </>
  )
}
