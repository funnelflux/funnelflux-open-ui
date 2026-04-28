import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Switch, Select, Modal, FormField } from '@/components/ui-kit'
import { trafficFilterSchema, type TrafficFilterFormData } from '@/schemas/trafficFilter'
import { FILTER_TYPES, FILTER_TYPE_LABELS } from '@/lib/trafficFilterConstants'
import { generateEntityId } from '@/lib/id-generator'
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
  const { control, handleSubmit, reset } = useForm<TrafficFilterFormData>({
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
    if (!open) return
    if (initialData) {
      reset({
        idTrafficFilter: initialData.idTrafficFilter,
        trafficFilterName: initialData.trafficFilterName,
        filterType: initialData.filterType,
        filterEntries: initialData.filterEntries ?? [],
        redirectToURL: initialData.redirectToURL,
        isEnabled: initialData.isEnabled,
      })
    } else {
      reset({
        idTrafficFilter: generateEntityId(),
        trafficFilterName: '',
        filterType: 'ipAddresses',
        filterEntries: [],
        redirectToURL: null,
        isEnabled: true,
      })
    }
  }, [open, initialData, reset])

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
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 pt-4"
      >
        <Controller
          control={control}
          name="trafficFilterName"
          render={({ field, fieldState }) => (
            <FormField
              label="Name"
              htmlFor="trafficFilterName"
              required
              error={fieldState.error?.message}
            >
              <Input
                id="trafficFilterName"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                placeholder="Filter name"
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="filterType"
          render={({ field, fieldState }) => (
            <FormField label="Filter Type" error={fieldState.error?.message}>
              <Select
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="w-full"
                placeholder="Select type"
                options={FILTER_TYPES.map((type) => ({
                  value: type,
                  label: FILTER_TYPE_LABELS[type],
                }))}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="filterEntries"
          render={({ field, fieldState }) => (
            <FormField
              label="Entries (one per line)"
              htmlFor="filterEntries"
              error={fieldState.error?.message}
            >
              <Input.TextArea
                id="filterEntries"
                value={(field.value ?? []).join('\n')}
                onChange={(e) => {
                  // Keep empty lines while typing so Enter/newlines are visible; empties are stripped on submit (schema).
                  const entries = e.target.value.split('\n').map((line) => line.trim())
                  field.onChange(entries)
                }}
                onBlur={field.onBlur}
                placeholder="Enter one entry per line"
                rows={8}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="redirectToURL"
          render={({ field }) => (
            <FormField label="Redirect URL (optional)" htmlFor="redirectToURL">
              <Input
                id="redirectToURL"
                value={field.value ?? ''}
                onChange={(e) => {
                  const trimmed = e.target.value.trim()
                  field.onChange(trimmed === '' ? null : e.target.value)
                }}
                onBlur={field.onBlur}
                placeholder="https://example.com"
              />
            </FormField>
          )}
        />

        <div className="flex items-center justify-between">
          <label htmlFor="isEnabled" className="text-sm font-medium">Enabled</label>
          <Controller
            control={control}
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
          <Button
            type="primary"
            htmlType="submit"
            disabled={isSubmitting}
            className="flex-1"
            iconName={isSubmitting ? 'loader-2' : undefined}
            iconAnimation={isSubmitting ? 'spin' : 'none'}
            iconSize="sm"
          >
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
