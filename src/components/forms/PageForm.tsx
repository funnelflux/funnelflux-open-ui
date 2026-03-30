import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialData ? `Edit ${entityLabel}` : `New ${entityLabel}`}
          </SheetTitle>
        </SheetHeader>
        <form
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-6 mt-6"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="pageName">Name</Label>
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
            <Label htmlFor="url">URL</Label>
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
            <Label>Redirect Type</Label>
            <Select
              value={form.watch('redirectType')}
              onValueChange={(v) =>
                form.setValue('redirectType', v as PageFormData['redirectType'], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select redirect type" />
              </SelectTrigger>
              <SelectContent>
                {REDIRECT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
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
                <Label>Offer Source</Label>
                <Select
                  value={form.watch('offerParams.idOfferSource') ?? ''}
                  onValueChange={(v) =>
                    form.setValue('offerParams.idOfferSource', v, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select offer source" />
                  </SelectTrigger>
                  <SelectContent>
                    {offerSources?.map((os) => (
                      <SelectItem
                        key={os.idOfferSource}
                        value={os.idOfferSource}
                      >
                        {os.offerSourceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payout */}
              <div className="space-y-2">
                <Label htmlFor="payout">Payout</Label>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? 'Save' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
