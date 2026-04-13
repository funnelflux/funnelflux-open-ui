import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button, Input, Switch, Select, Modal } from 'antd'
import { trafficFilterSchema, type TrafficFilterFormData } from '@/schemas/trafficFilter'
import { FILTER_TYPES, FILTER_TYPE_LABELS } from '@/lib/trafficFilterConstants'
import type { TrafficFilter } from '@/types/entities'

export function TrafficFilterModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficFilter
  onSubmit: (data: TrafficFilterFormData) => void
  isSubmitting?: boolean
}) {
  const form = useForm<TrafficFilterFormData>({
    resolver: zodResolver(trafficFilterSchema),
    defaultValues: {
      idTrafficFilter: '',
      trafficFilterName: '',
      filterType: 'ipAddresses',
      filterEntries: [],
      redirectToURL: null,
      isEnabled: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          idTrafficFilter: initialData.idTrafficFilter,
          trafficFilterName: initialData.trafficFilterName,
          filterType: initialData.filterType,
          filterEntries: initialData.filterEntries ?? [],
          redirectToURL: initialData.redirectToURL,
          isEnabled: initialData.isEnabled,
        })
      } else {
        form.reset({
          idTrafficFilter: '',
          trafficFilterName: '',
          filterType: 'ipAddresses',
          filterEntries: [],
          redirectToURL: null,
          isEnabled: true,
        })
      }
    }
  }, [open, initialData, form])

  const entriesText = (form.watch('filterEntries') ?? []).join('\n')

  function handleEntriesChange(text: string) {
    const entries = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    form.setValue('filterEntries', entries, { shouldDirty: true })
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title={initialData ? 'Edit Traffic Filter' : 'New Traffic Filter'}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 pt-4"
      >
        <div className="space-y-2">
          <label htmlFor="trafficFilterName" className="block text-sm font-medium text-foreground">Name</label>
          <Input
            id="trafficFilterName"
            {...form.register('trafficFilterName')}
            placeholder="Filter name"
          />
          {form.formState.errors.trafficFilterName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.trafficFilterName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Filter Type</label>
          <Controller
            control={form.control}
            name="filterType"
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                className="w-full"
                placeholder="Select type"
                options={FILTER_TYPES.map((type) => ({
                  value: type,
                  label: FILTER_TYPE_LABELS[type],
                }))}
              />
            )}
          />
          {form.formState.errors.filterType && (
            <p className="text-xs text-destructive">
              {form.formState.errors.filterType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="filterEntries" className="block text-sm font-medium text-foreground">Entries (one per line)</label>
          <Input.TextArea
            id="filterEntries"
            value={entriesText}
            onChange={(e) => handleEntriesChange(e.target.value)}
            placeholder="Enter one entry per line"
            rows={8}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="redirectToURL" className="block text-sm font-medium text-foreground">Redirect URL (optional)</label>
          <Input
            id="redirectToURL"
            {...form.register('redirectToURL')}
            placeholder="https://example.com"
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="isEnabled" className="text-sm font-medium">Enabled</label>
          <Controller
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <Switch
                id="isEnabled"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="primary" htmlType="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    </Modal>
  )
}
