import { Icon } from '@/components/ui-kit/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  type SelectOption,
} from '@/components/ui-kit'
import { useCategories, useOfferSources, usePage, useSaveCategory, useSavePage } from '@/api/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { offerNodeEditSchema, type OfferNodeEditFormData } from '@/schemas/offerNode'
import type { Page } from '@/types/entities'
import { NODE_TYPES, type OfferNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { FUNNEL_URL_TOKEN_OPTIONS } from '@/lib/urlTokens'
import { cn, getErrorMessage } from '@/lib/utils'

const REDIRECT_OPTIONS = [
  { value: '307', label: '307 Temporary Redirect' },
  { value: '301', label: '301 Permanent Redirect' },
  { value: 'umr', label: 'Ultimate Meta Refresh (UMR)' },
  { value: 'fluxify', label: 'Fluxify (reverse proxy)' },
] as const

const UNCATEGORIZED = 'Uncategorized'

/** Category select value derived from tags[0] (same logic as Offers list). */
function tagCategorySelectValue(tags: string[] | undefined): string {
  const raw = tags?.[0]
  if (!raw || raw === UNCATEGORIZED) return '__none__'
  return raw
}

const REDIRECT_NOTES: Partial<Record<OfferNodeEditFormData['redirectType'], string>> = {
  umr:
    "FunnelFlux's Ultimate Meta Refresh does not leak the referrer the way a double meta refresh can. " +
    'It is faster than a typical double meta refresh, but still slower than a 301 or 307 redirect.',
  '301': 'Permanent redirect. Search engines treat the destination URL as the canonical URL.',
  '307': 'Temporary redirect. Preserves the request method; good default for most tracking flows.',
  fluxify:
    'Advanced cloaking with Fluxify. Use when you need on-page rewriting, referrers/UA spoofing, or other Fluxify features.',
}

interface OfferNodeEditModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

export function OfferNodeEditModal({ nodeId, open, onClose }: OfferNodeEditModalProps) {
  const toast = useToastApi()
  const qc = useQueryClient()
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)

  const pageId =
    node?.data.nodeType === NODE_TYPES.offer
      ? String((node.data.params as OfferNodeParams).pageId ?? '')
      : ''

  const {
    data: page,
    isLoading,
    isFetching,
    isError,
    error,
  } = usePage(pageId, {
    enabled: open && !!pageId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const pageLoading = isLoading || (open && isFetching)
  const { data: categories } = useCategories('page')
  const { data: offerSources } = useOfferSources()
  const savePage = useSavePage()
  const saveCategory = useSaveCategory()

  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

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
    if (!pageId || !page) return
    if (isFetching) return
    if (form.formState.isDirty) return

    const p = node.data.params as OfferNodeParams
    form.reset({
      idPage: page.idPage,
      pageType: 'offer',
      pageName: page.pageName,
      url: page.url,
      redirectType: page.redirectType,
      tags: page.tags ?? [],
      notes: page.notes ?? '',
      isArchived: page.isArchived,
      offerParams: page.offerParams ?? { idOfferSource: '', payout: 0 },
      accumulateUrlParams: p.accumulateUrlParams ?? false,
      additionalTokens:
        p.additionalTokens && p.additionalTokens.length > 0
          ? p.additionalTokens.map((t) => ({ field: t.field, token: t.token }))
          : [{ field: '', token: '' }],
    })
  }, [open, node, page, pageId, form, isFetching])

  const urlValue = useWatch({ control: form.control, name: 'url', defaultValue: '' })
  const tags = useWatch({ control: form.control, name: 'tags', defaultValue: [] as string[] })
  const idPageWatch = useWatch({ control: form.control, name: 'idPage' })
  const redirectTypeWatch = useWatch({ control: form.control, name: 'redirectType', defaultValue: '307' })
  const accumulateUrlParamsWatch = useWatch({
    control: form.control,
    name: 'accumulateUrlParams',
    defaultValue: false,
  })

  const categoryNamesFromApi = new Set((categories ?? []).map((c) => c.name).filter(Boolean))
  const rawTag = tags?.[0]
  const orphanCategory =
    rawTag && rawTag !== UNCATEGORIZED && !categoryNamesFromApi.has(rawTag) ? rawTag : null

  const categorySmartOptions = useMemo<SelectOption[]>(() => {
    const out: SelectOption[] = [{ value: '__none__', label: '—' }]
    if (orphanCategory) out.push({ value: orphanCategory, label: orphanCategory })
    for (const c of categories?.filter((c) => c.name && c.name !== UNCATEGORIZED) ?? []) {
      out.push({ value: c.name, label: c.name })
    }
    return out
  }, [categories, orphanCategory])

  const tokenSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: '__pick__', label: '—' },
      ...FUNNEL_URL_TOKEN_OPTIONS.map((t) => ({ value: t, label: t })),
    ],
    [],
  )

  const offerSourceOptions = useMemo(
    () =>
      offerSources?.map((os) => ({
        label: os.offerSourceName,
        value: os.idOfferSource,
      })) ?? [],
    [offerSources],
  )

  const openAddCategoryModal = useCallback(() => {
    setNewCategoryName('')
    setAddCategoryOpen(true)
  }, [])

  const openOfferUrl = useCallback(() => {
    const u = urlValue?.trim()
    if (!u || !/^https?:\/\//i.test(u)) {
      toast.error('Enter a valid http(s) URL first')
      return
    }
    window.open(u, '_blank', 'noopener,noreferrer')
  }, [toast, urlValue])

  const handleConfirmAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('Enter a category name')
      return
    }
    try {
      await saveCategory.mutateAsync({ entityType: 'page', name })
      toast.success('Category saved')
      form.setValue('tags', [name], { shouldDirty: true })
      setAddCategoryOpen(false)
      setNewCategoryName('')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const onSubmit = async (data: OfferNodeEditFormData) => {
    if (!nodeId || !node) return
    try {
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
      await savePage.mutateAsync({ page: payload, isCreate: false })
      await qc.refetchQueries({ queryKey: queryKeys.pages.detail(String(data.idPage)) })

      const tokenRows = data.additionalTokens ?? form.getValues('additionalTokens') ?? []
      const tokens = tokenRows
        .filter((r) => r.field.trim() !== '')
        .map((r) => ({ field: r.field.trim(), token: r.token }))

      updateNodeData(nodeId, {
        label: data.pageName,
        params: {
          ...(node.data.params as object),
          pageId: String(data.idPage),
          pageName: data.pageName,
          accumulateUrlParams: data.accumulateUrlParams,
          additionalTokens: tokens.length > 0 ? tokens : undefined,
        },
      })

      toast.success('Offer saved.')
      onClose()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const noPage = !pageId || pageId === '0'
  const busy = savePage.isPending

  return (
    <>
      <Modal
        open={open}
        title="Edit offer"
        onCancel={onClose}
        destroyOnHidden
        maskClosable={false}
        width={640}
        scrollBody
        footer={
          <div className="flex w-full gap-2">
            <Button
              type="primary"
              htmlType="submit"
              form="offer-node-edit-form"
              disabled={busy || noPage || pageLoading || isError}
              loading={busy}
              className="min-w-0 flex-1"
            >
              Save
            </Button>
            <Button htmlType="button" disabled={busy} onClick={onClose} className="min-w-0 flex-1">
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
              ) : pageLoading ? (
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
                              size="md"
                              options={categorySmartOptions}
                              value={tagCategorySelectValue(tags)}
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
                            icon={<Icon name="plus" />}
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
                          icon={<Icon name="external-link" />}
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
                              size="md"
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
                                size="md"
                                options={REDIRECT_OPTIONS.map((opt) => ({
                                  label: opt.label,
                                  value: opt.value,
                                }))}
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
                                  size="md"
                                  value={field.value || '__pick__'}
                                  onChange={(v) => {
                                    field.onChange(v === '__pick__' ? '' : v)
                                  }}
                                  options={tokenSelectOptions}
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
                              icon={<Icon name="trash-2" />}
                              onClick={() => remove(index)}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        htmlType="button"
                        size="sm"
                        icon={<Icon name="plus" size="sm" />}
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

      <Modal
        title="New category"
        open={addCategoryOpen}
        okText="Create"
        cancelText="Cancel"
        confirmLoading={saveCategory.isPending}
        onOk={() => void handleConfirmAddCategory()}
        onCancel={() => {
          setAddCategoryOpen(false)
          setNewCategoryName('')
        }}
        destroyOnHidden
      >
        <p className="mb-2 text-sm text-muted-foreground">Letters, numbers, and spaces only.</p>
        <label htmlFor="offer-new-category-name" className="sr-only">
          Category name
        </label>
        <Input
          id="offer-new-category-name"
          size="md"
          className="h-control-md"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleConfirmAddCategory()
            }
          }}
        />
      </Modal>
    </>
  )
}
