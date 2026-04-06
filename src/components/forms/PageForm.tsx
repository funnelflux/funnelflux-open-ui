import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select, Drawer } from 'antd'
import { useOfferSources } from '@/api/hooks'
import { pageSchema, type PageFormData } from '@/schemas/page'
import type { Page, PageType } from '@/types/entities'

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

  const { data: offerSources } = useOfferSources()

  const form = useForm<PageFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageSchema) as any,
    defaultValues: {
      pageType,
      pageName: '',
      url: '',
      redirectType: '307',
      tags: [],
      notes: '',
      offerParams: isOffer ? { idOfferSource: '', payout: 0 } : undefined,
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idPage: initialData.idPage,
          pageType: initialData.pageType,
          pageName: initialData.pageName,
          url: initialData.url,
          redirectType: initialData.redirectType,
          tags: initialData.tags ?? [],
          notes: initialData.notes ?? '',
          offerParams: isOffer
            ? initialData.offerParams ?? { idOfferSource: '', payout: 0 }
            : undefined,
        })
      } else {
        form.reset({
          pageType,
          pageName: '',
          url: '',
          redirectType: '307',
          tags: [],
          notes: '',
          offerParams: isOffer ? { idOfferSource: '', payout: 0 } : undefined,
        })
      }
    }
  }, [open, initialData, form, pageType, isOffer])

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    form.setValue('tags', tags, { shouldDirty: true })
  }

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title={initialData ? `Edit ${entityLabel}` : `New ${entityLabel}`} width={440} destroyOnHidden>
      <form
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit={form.handleSubmit(onSubmit as any)}
        className="space-y-6"
      >
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="pageName" className="text-sm font-medium">Name</label>
          <Input
            id="pageName"
            {...form.register('pageName')}
            placeholder={`${entityLabel} name`}
          />
          {form.formState.errors.pageName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.pageName.message}
            </p>
          )}
        </div>

        {/* URL */}
        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-medium">URL</label>
          <Input
            id="url"
            {...form.register('url')}
            placeholder="https://example.com/page"
          />
          {form.formState.errors.url && (
            <p className="text-xs text-destructive">
              {form.formState.errors.url.message}
            </p>
          )}
        </div>

        {/* Redirect Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Redirect Type</label>
          <Select
            value={form.watch('redirectType') || undefined}
            onChange={(v) =>
              form.setValue('redirectType', v as PageFormData['redirectType'], {
                shouldDirty: true,
              })
            }
            placeholder="Select redirect type"
            className="w-full"
            options={REDIRECT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label htmlFor="tags" className="text-sm font-medium">Tags</label>
          <Input
            id="tags"
            value={form.watch('tags').join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="tag1, tag2, tag3"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of tags
          </p>
        </div>

        {/* Offer-specific fields */}
        {isOffer && (
          <>
            {/* Offer Source */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Offer Source</label>
              <Select
                value={form.watch('offerParams.idOfferSource') || undefined}
                onChange={(v) =>
                  form.setValue('offerParams.idOfferSource', v, {
                    shouldDirty: true,
                  })
                }
                placeholder="Select offer source"
                className="w-full"
                options={(offerSources ?? []).map((os) => ({
                  value: os.idOfferSource,
                  label: os.offerSourceName,
                }))}
              />
            </div>

            {/* Payout */}
            <div className="space-y-2">
              <label htmlFor="payout" className="text-sm font-medium">Payout</label>
              <Input
                id="payout"
                type="number"
                step="0.01"
                min="0"
                {...form.register('offerParams.payout', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.offerParams?.payout && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.offerParams.payout.message}
                </p>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">Notes</label>
          <Input.TextArea
            id="notes"
            {...form.register('notes')}
            placeholder="Optional notes..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {initialData ? 'Save' : 'Create'}
          </Button>
          <Button
            htmlType="button"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
