import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { campaignSchema, type CampaignFormData } from '@/schemas/campaign'
import type { Campaign } from '@/types/entities'

interface CampaignEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Campaign
  onSubmit: (data: CampaignFormData) => void
  isSubmitting?: boolean
}

export function CampaignEditForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: CampaignEditFormProps) {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      idCampaign: '',
      campaignName: '',
      acculumatedUrlParams: [],
      customTokens: [],
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idCampaign: initialData.idCampaign,
          campaignName: initialData.campaignName,
          acculumatedUrlParams: initialData.acculumatedUrlParams ?? [],
          customTokens: initialData.customTokens ?? [],
        })
      } else {
        form.reset({
          idCampaign: '',
          campaignName: '',
          acculumatedUrlParams: [],
          customTokens: [],
        })
      }
    }
  }, [open, initialData, form])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initialData ? 'Edit Campaign' : 'New Campaign'}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 mt-6"
        >
          <div className="space-y-2">
            <Label htmlFor="campaignName">Name</Label>
            <Input
              id="campaignName"
              {...form.register('campaignName')}
              placeholder="Campaign name"
            />
            {form.formState.errors.campaignName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.campaignName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>URL Parameters</Label>
            <KeyValueListField
              value={form.watch('acculumatedUrlParams')}
              onChange={(v) => form.setValue('acculumatedUrlParams', v, { shouldDirty: true })}
              keyLabel="Parameter"
              valueLabel="Value"
              keyPlaceholder="param"
              valuePlaceholder="value"
            />
          </div>

          <div className="space-y-2">
            <Label>Custom Tokens</Label>
            <KeyValueListField
              value={form.watch('customTokens')}
              onChange={(v) => form.setValue('customTokens', v, { shouldDirty: true })}
              keyLabel="Token"
              valueLabel="Value"
              keyPlaceholder="token_name"
              valuePlaceholder="token_value"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
