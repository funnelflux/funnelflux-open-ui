import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal as AntModal } from 'antd'
import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/shared/Toaster'
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
  const toast = useToast()
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

  const redirectType = form.watch('redirectType')
  const urlValue = form.watch('url')
  const tags = form.watch('tags')

  const categoryNamesFromApi = new Set((categories ?? []).map((c) => c.name).filter(Boolean))
  const rawTag = tags?.[0]
  const categorySelectValue = (() => {
    if (!rawTag || rawTag === UNCATEGORIZED) return '__none__'
    return rawTag
  })()
  const orphanCategory =
    rawTag && rawTag !== UNCATEGORIZED && !categoryNamesFromApi.has(rawTag) ? rawTag : null

  const openAddCategoryModal = () => {
    setNewCategoryName('')
    setAddCategoryOpen(true)
  }

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

  const openOfferUrl = () => {
    const u = urlValue?.trim()
    if (!u || !/^https?:\/\//i.test(u)) {
      toast.error('Enter a valid http(s) URL first')
      return
    }
    window.open(u, '_blank', 'noopener,noreferrer')
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
      await savePage.mutateAsync(payload)
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
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          width="min(1200px, 96vw)"
          styles={{
            body: {
              padding: 0,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          className="[&_.ant-modal-content]:flex [&_.ant-modal-content]:max-h-[90vh] [&_.ant-modal-content]:flex-col [&_.ant-modal-content]:overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4">
              <DialogTitle className="text-lg">Offer identification</DialogTitle>
              <DialogDescription>
                Edit the offer page record and how this funnel node passes traffic to it.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {noPage ? (
                <p className="text-sm text-muted-foreground">
                  This node has no offer page assigned. Set a page ID from the funnel context or pick an offer when
                  creating the node.
                </p>
              ) : pageLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading offer…
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive">
                  {error ? getErrorMessage(error) : 'Could not load offer.'}
                </p>
              ) : (
                <form id="offer-node-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Page</h3>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
                      <div className="space-y-2 lg:col-span-5">
                        <Label htmlFor="offer-name">Name</Label>
                        <Input
                          id="offer-name"
                          className="h-10"
                          {...form.register('pageName')}
                          autoComplete="off"
                        />
                        {form.formState.errors.pageName && (
                          <p className="text-xs text-destructive">{form.formState.errors.pageName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2 lg:col-span-4">
                        <Label>Category</Label>
                        <div className="flex gap-2">
                          <Select
                            value={categorySelectValue}
                            onValueChange={(v) => {
                              if (v === '__none__' || v === UNCATEGORIZED) {
                                form.setValue('tags', [], { shouldDirty: true })
                              } else {
                                form.setValue('tags', [v], { shouldDirty: true })
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 min-h-10 flex-1">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {orphanCategory ? (
                                <SelectItem value={orphanCategory}>{orphanCategory}</SelectItem>
                              ) : null}
                              {categories
                                ?.filter((c) => c.name && c.name !== UNCATEGORIZED)
                                .map((c) => (
                                  <SelectItem key={c.idCategory || c.name} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 w-10 shrink-0 p-0"
                            title="Add category"
                            onClick={openAddCategoryModal}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 lg:col-span-3">
                        <Label>ID</Label>
                        <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
                          {form.watch('idPage') || page?.idPage || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="offer-url">Offer URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="offer-url"
                          className="h-10 flex-1"
                          {...form.register('url')}
                          placeholder="https://…"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-10 w-10 shrink-0 p-0"
                          title="Open URL"
                          onClick={openOfferUrl}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.formState.errors.url && (
                        <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Offer source</Label>
                        <Controller
                          control={form.control}
                          name="offerParams.idOfferSource"
                          render={({ field }) => (
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 min-h-10 w-full">
                                <SelectValue placeholder="Select offer source" />
                              </SelectTrigger>
                              <SelectContent>
                                {offerSources?.map((os) => (
                                  <SelectItem key={os.idOfferSource} value={os.idOfferSource}>
                                    {os.offerSourceName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offer-payout">Payout</Label>
                        <Input
                          id="offer-payout"
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-10"
                          {...form.register('offerParams.payout', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                        {form.formState.errors.offerParams?.payout && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.offerParams.payout.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t pt-4 lg:grid-cols-2 lg:items-start">
                      <div className="space-y-2">
                        <Label>Redirect type</Label>
                        <Select
                          value={redirectType}
                          onValueChange={(v) =>
                            form.setValue('redirectType', v as OfferNodeEditFormData['redirectType'], {
                              shouldDirty: true,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 min-h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REDIRECT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {REDIRECT_NOTES[redirectType] && (
                          <p className="text-xs leading-relaxed text-muted-foreground">{REDIRECT_NOTES[redirectType]}</p>
                        )}
                      </div>
                      <div className="flex min-h-[11rem] flex-col space-y-2">
                        <Label htmlFor="offer-notes">Notes</Label>
                        <Textarea
                          id="offer-notes"
                          className="min-h-[9.5rem] flex-1 resize-y text-sm"
                          {...form.register('notes')}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 border-t pt-6">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">URL tokens (funnel node)</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional query parameters appended when visitors reach this page from this funnel. Field names
                        must be alphanumeric, dash, or underscore.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="offer-acc-url" className="text-sm font-normal">
                          Pass accumulated URL parameters
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Include all accumulated query parameters from the visitor journey on the redirect URL.
                        </p>
                      </div>
                      <Switch
                        id="offer-acc-url"
                        checked={form.watch('accumulateUrlParams')}
                        onCheckedChange={(c) => form.setValue('accumulateUrlParams', c, { shouldDirty: true })}
                      />
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="space-y-1.5">
                            <Label className={cn(index > 0 && 'sr-only')}>Query field</Label>
                            <Input
                              placeholder="field_name"
                              {...form.register(`additionalTokens.${index}.field` as const)}
                              className="h-10 font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className={cn(index > 0 && 'sr-only')}>Token</Label>
                            <Controller
                              control={form.control}
                              name={`additionalTokens.${index}.token`}
                              render={({ field }) => (
                                <Select
                                  value={field.value || '__pick__'}
                                  onValueChange={(v) => {
                                    field.onChange(v === '__pick__' ? '' : v)
                                  }}
                                >
                                  <SelectTrigger className="h-10 min-h-10 w-full">
                                    <SelectValue placeholder="Insert…" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    <SelectItem value="__pick__">—</SelectItem>
                                    {FUNNEL_URL_TOKEN_OPTIONS.map((t) => (
                                      <SelectItem key={t} value={t} className="font-mono text-xs">
                                        {t}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="flex justify-end sm:justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 w-10 text-muted-foreground"
                              title="Remove row"
                              disabled={fields.length <= 1}
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ field: '', token: '' })}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Pass another token
                      </Button>
                    </div>
                  </section>
                </form>
              )}
            </div>

            <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-between">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="offer-node-edit-form"
                disabled={busy || noPage || pageLoading || isError}
                className="min-w-[100px] bg-orange-600 text-white hover:bg-orange-600/90"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                OK
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AntModal
        title="Add category"
        open={addCategoryOpen}
        zIndex={1100}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={saveCategory.isPending}
        onOk={() => void handleConfirmAddCategory()}
        onCancel={() => {
          setAddCategoryOpen(false)
          setNewCategoryName('')
        }}
        destroyOnClose
      >
        <p className="mb-2 text-sm text-muted-foreground">Letters, numbers, and spaces only.</p>
        <Label htmlFor="offer-new-category-name" className="sr-only">
          Category name
        </Label>
        <Input
          id="offer-new-category-name"
          className="h-10"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleConfirmAddCategory()
            }
          }}
          autoFocus
        />
      </AntModal>
    </>
  )
}
