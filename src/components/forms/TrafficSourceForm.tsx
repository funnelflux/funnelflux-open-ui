import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
  SheetDescription,
} from '@/components/ui/sheet'
import { KeyValueListField } from '@/components/forms/KeyValueListField'
import { trafficSourceSchema, type TrafficSourceFormData } from '@/schemas/trafficSource'
import { useTrafficSourceTemplates, useLoadTrafficSourceTemplate } from '@/api/hooks'
import type { TrafficSource } from '@/types/entities'

interface TrafficSourceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficSource | null
  onSubmit: (data: TrafficSourceFormData) => void
  isSubmitting?: boolean
}

const defaultValues: TrafficSourceFormData = {
  trafficSourceName: '',
  costType: 'cpe',
  defaultCost: 0,
  trackingFields: [],
  postback: {
    postbackType: 'none',
    postbackCode: '',
  },
}

export function TrafficSourceForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: TrafficSourceFormProps) {
  const { data: templates } = useTrafficSourceTemplates(open)
  const loadTemplate = useLoadTrafficSourceTemplate()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<TrafficSourceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(trafficSourceSchema) as any,
    defaultValues,
  })

  const postbackType = watch('postback.postbackType')
  const isEditing = !!initialData?.idTrafficSource

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          idTrafficSource: initialData.idTrafficSource,
          trafficSourceName: initialData.trafficSourceName,
          costType: initialData.costType,
          defaultCost: initialData.defaultCost,
          trackingFields: initialData.trackingFields ?? [],
          postback: {
            postbackType: initialData.postback?.postbackType ?? 'none',
            postbackCode: initialData.postback?.postbackCode ?? '',
          },
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
          trafficSourceName: data.trafficSourceName,
          costType: data.costType,
          defaultCost: data.defaultCost,
          trackingFields: data.trackingFields ?? [],
          postback: {
            postbackType: data.postback?.postbackType ?? 'none',
            postbackCode: data.postback?.postbackCode ?? '',
          },
        })
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Traffic Source' : 'Add Traffic Source'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the traffic source configuration.' : 'Create a new traffic source.'}
          </SheetDescription>
        </SheetHeader>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 mt-6">
          {/* Load Template */}
          {!isEditing && templates && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Copy from Template</Label>
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="trafficSourceName">Name</Label>
            <Input
              id="trafficSourceName"
              {...register('trafficSourceName')}
              placeholder="Traffic source name"
            />
            {errors.trafficSourceName && (
              <p className="text-xs text-destructive">{errors.trafficSourceName.message}</p>
            )}
          </div>

          {/* Cost Type */}
          <div className="space-y-1.5">
            <Label>Cost Type</Label>
            <Controller
              control={control}
              name="costType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpe">CPE (Cost Per Entrance)</SelectItem>
                    <SelectItem value="cpa">CPA (Cost Per Action)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Default Cost */}
          <div className="space-y-1.5">
            <Label htmlFor="defaultCost">Default Cost</Label>
            <Input
              id="defaultCost"
              type="number"
              step="any"
              min="0"
              {...register('defaultCost')}
            />
            {errors.defaultCost && (
              <p className="text-xs text-destructive">{errors.defaultCost.message}</p>
            )}
          </div>

          {/* Tracking Fields */}
          <div className="space-y-1.5">
            <Label>Tracking Fields</Label>
            <Controller
              control={control}
              name="trackingFields"
              render={({ field }) => (
                <KeyValueListField
                  value={field.value}
                  onChange={field.onChange}
                  keyLabel="Parameter"
                  valueLabel="Token"
                />
              )}
            />
          </div>

          {/* Postback Type */}
          <div className="space-y-1.5">
            <Label>Postback Type</Label>
            <Controller
              control={control}
              name="postback.postbackType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="postbackUrl">Postback URL</SelectItem>
                    <SelectItem value="pixelUrl">Pixel URL</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Postback Code */}
          {postbackType !== 'none' && (
            <div className="space-y-1.5">
              <Label htmlFor="postbackCode">
                {postbackType === 'javascript' ? 'JavaScript Code' : 'Postback URL'}
              </Label>
              <Textarea
                id="postbackCode"
                {...register('postback.postbackCode')}
                placeholder={
                  postbackType === 'javascript'
                    ? 'Enter JavaScript code...'
                    : 'Enter postback URL...'
                }
                rows={3}
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
