import { Icon } from '@/components/ui-kit/icons'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Input,
  Select,
  Switch,
  Modal,
  useToastApi,
  type SelectOption,
} from '@/components/ui-kit'
import { useCategories, usePage, useSaveCategory, useSavePage } from '@/api/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { landerNodeEditSchema, type LanderNodeEditFormData } from '@/schemas/landerNode'
import type { Page } from '@/types/entities'
import { NODE_TYPES, type LanderNodeParams } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { FUNNEL_URL_TOKEN_OPTIONS } from '@/lib/urlTokens'
import { cn, getErrorMessage } from '@/lib/utils'

const REDIRECT_OPTIONS = [
  { value: '307', label: '307 Temporary Redirect' },
  { value: '301', label: '301 Permanent Redirect' },
  { value: 'umr', label: 'Ultimate Meta Refresh (UMR)' },
  { value: 'fluxify', label: 'Fluxify (reverse proxy)' },
] as const

/** Matches PHP `PageCategory::DEFAULT_CATEGORY_NAME` — treat as no category in the form. */
const UNCATEGORIZED = 'Uncategorized'

const REDIRECT_NOTES: Partial<Record<LanderNodeEditFormData['redirectType'], string>> = {
  umr:
    "FunnelFlux's Ultimate Meta Refresh does not leak the referrer the way a double meta refresh can. " +
    'It is faster than a typical double meta refresh, but still slower than a 301 or 307 redirect.',
  '301': 'Permanent redirect. Search engines treat the destination URL as the canonical URL.',
  '307': 'Temporary redirect. Preserves the request method; good default for most tracking flows.',
  fluxify:
    'Advanced cloaking with Fluxify. Use when you need on-page rewriting, referrers/UA spoofing, or other Fluxify features.',
}

interface LanderNodeEditModalProps {
  nodeId: string | null
  open: boolean
  onClose: () => void
}

export function LanderNodeEditModal({ nodeId, open, onClose }: LanderNodeEditModalProps) {
  const toast = useToastApi()
  const qc = useQueryClient()
  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const updateNodeData = useFunnelEditorStore((s) => s.updateNodeData)

  const pageId =
    node?.data.nodeType === NODE_TYPES.lander
      ? String((node.data.params as LanderNodeParams).pageId ?? '')
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

  /** True while the first load or a refetch runs (avoids showing stale cached notes after save/reopen). */
  const pageLoading = isLoading || (open && isFetching)
  const { data: categories } = useCategories('page')
  const savePage = useSavePage()
  const saveCategory = useSaveCategory()

  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const form = useForm<LanderNodeEditFormData>({
    resolver: zodResolver(landerNodeEditSchema),
    defaultValues: {
      pageType: 'lander',
      pageName: '',
      url: '',
      redirectType: '307',
      tags: [],
      notes: '',
      accumulateUrlParams: false,
      additionalTokens: [{ field: '', token: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additionalTokens',
  })

  useEffect(() => {
    if (!open || !node || node.data.nodeType !== NODE_TYPES.lander) return
    if (!pageId || !page) return
    if (isFetching) return
    // Avoid clobbering in-progress edits when page refetches (e.g. after save) while modal is open.
    if (form.formState.isDirty) return

    const p = node.data.params as LanderNodeParams
    form.reset({
      idPage: page.idPage,
      pageType: 'lander',
      pageName: page.pageName,
      url: page.url,
      redirectType: page.redirectType,
      tags: page.tags ?? [],
      notes: page.notes ?? '',
      isArchived: page.isArchived,
      accumulateUrlParams: p.accumulateUrlParams ?? false,
      additionalTokens:
        p.additionalTokens && p.additionalTokens.length > 0
          ? p.additionalTokens.map((t) => ({ field: t.field, token: t.token }))
          : [{ field: '', token: '' }],
    })
  }, [open, node, page, pageId, form, isFetching])

  const redirectType = useWatch({
    control: form.control,
    name: 'redirectType',
    defaultValue: '307' as LanderNodeEditFormData['redirectType'],
  })
  const urlValue = useWatch({ control: form.control, name: 'url', defaultValue: '' })
  const tags = useWatch({ control: form.control, name: 'tags', defaultValue: [] as string[] })
  const idPageWatch = useWatch({ control: form.control, name: 'idPage' })
  const accumulateUrlParamsWatch = useWatch({
    control: form.control,
    name: 'accumulateUrlParams',
    defaultValue: false,
  })

  const categoryNamesFromApi = new Set((categories ?? []).map((c) => c.name).filter(Boolean))
  const rawTag = tags?.[0]
  const categorySelectValue = (() => {
    if (!rawTag || rawTag === UNCATEGORIZED) return '__none__'
    return rawTag
  })()
  /** Show current tag even if missing from API list (stale name). */
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

  const openLanderUrl = () => {
    const u = urlValue?.trim()
    if (!u || !/^https?:\/\//i.test(u)) {
      toast.error('Enter a valid http(s) URL first')
      return
    }
    window.open(u, '_blank', 'noopener,noreferrer')
  }

  const onSubmit = async (data: LanderNodeEditFormData) => {
    if (!nodeId || !node) return
    try {
      const payload: Partial<Page> = {
        idPage: data.idPage,
        pageType: 'lander',
        pageName: data.pageName,
        url: data.url,
        redirectType: data.redirectType,
        tags: data.tags ?? [],
        notes: data.notes ?? '',
        isArchived: data.isArchived,
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

      toast.success(
        'Lander saved.',
      )
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
        title="Edit lander"
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
              form="lander-node-edit-form"
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
              This node has no lander page assigned. Set a page ID from the funnel context or pick a
              lander when creating the node.
            </p>
          ) : pageLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Icon name="loader-2" size="lg" animation="spin" aria-label="Loading" />
              Loading lander…
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {error ? getErrorMessage(error) : 'Could not load lander.'}
            </p>
          ) : (
            <form id="lander-node-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Page</h3>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <label htmlFor="lander-name" className="block text-sm font-medium text-foreground">
                      Name
                    </label>
                    <Controller
                      control={form.control}
                      name="pageName"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="lander-name"
                            size="md"
                            className="min-w-0 max-w-full"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            autoComplete="off"
                          />
                          {fieldState.error && (
                            <p className="text-xs text-destructive">{fieldState.error.message}</p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-foreground">Category</span>
                    <div className="flex max-w-full min-w-0 items-center gap-2">
                      <Select
                        className="min-w-0 flex-1"
                        size="md"
                        value={categorySelectValue}
                        onChange={(v) => {
                          if (v === '__none__' || v === UNCATEGORIZED) {
                            form.setValue('tags', [], { shouldDirty: true })
                          } else {
                            form.setValue('tags', [v], { shouldDirty: true })
                          }
                        }}
                        options={categorySmartOptions}
                        placeholder="Category"
                      />
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
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-foreground">ID</span>
                    <div className="flex max-w-full min-h-control-md min-w-0 items-center rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
                      <span className="min-w-0 truncate">{idPageWatch || page?.idPage || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="lander-url" className="block text-sm font-medium text-foreground">
                    Lander URL
                  </label>
                  <div className="flex max-w-full min-w-0 items-center gap-2">
                    <Controller
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <Input
                          id="lander-url"
                          size="md"
                          className="h-control-md min-h-0 min-w-0 flex-1 max-w-full"
                          value={field.value}
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
                      onClick={openLanderUrl}
                    />
                  </div>
                  {form.formState.errors.url && (
                    <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 sm:items-start">
                  <div className="flex min-w-0 flex-col space-y-2 sm:h-full">
                    <span className="block text-sm font-medium text-foreground">Redirect type</span>
                    <Select
                      className="w-full min-w-0"
                      size="md"
                      value={redirectType}
                      onChange={(v) =>
                        form.setValue('redirectType', v as LanderNodeEditFormData['redirectType'], {
                          shouldDirty: true,
                        })
                      }
                      options={REDIRECT_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
                    />
                    {REDIRECT_NOTES[redirectType] && (
                      <p className="text-xs leading-relaxed text-muted-foreground">{REDIRECT_NOTES[redirectType]}</p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col space-y-2 sm:h-full">
                    <label htmlFor="lander-notes" className="block text-sm font-medium text-foreground">
                      Notes
                    </label>
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <Input.TextArea
                          id="lander-notes"
                          className="min-h-0 flex-1 resize-y text-sm sm:min-h-[9.5rem]"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          placeholder="Optional"
                          autoSize={{ minRows: 6 }}
                        />
                      )}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">URL tokens (funnel node)</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional query parameters appended when visitors reach this page from this funnel. Field names must
                    be alphanumeric, dash, or underscore.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                  <div className="space-y-0.5">
                    <label htmlFor="acc-url" className="text-sm font-normal text-foreground">
                      Pass accumulated URL parameters
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Include all accumulated query parameters from the visitor journey on the redirect URL.
                    </p>
                  </div>
                  <Switch
                    id="acc-url"
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
      <label htmlFor="lander-new-category-name" className="sr-only">
        Category name
      </label>
      <Input
        id="lander-new-category-name"
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
