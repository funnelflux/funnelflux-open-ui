import { useEffect, useId, useMemo, useRef } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Switch, Select, SmartMultiSelect, FormField, FormModal, FormModalBody, FormModalFooterSubmit, FormModalHeader, type SelectOption } from '@/components/ui-kit'
import { trafficFilterSchema, type TrafficFilterFormData } from '@/schemas/trafficFilter'
import { FILTER_TYPES, FILTER_TYPE_LABELS } from '@/lib/trafficFilterConstants'
import { generateEntityId } from '@/lib/id-generator'
import type { TrafficFilter } from '@/types/entities'

const FILTER_TYPE_OPTIONS = FILTER_TYPES.map((type) => ({
  value: type,
  label: FILTER_TYPE_LABELS[type],
}))

type TrafficFilterActionMode = 'hide' | 'hideAndRedirect'

const ACTION_MODE_OPTIONS: SelectOption[] = [
  { value: 'hide', label: 'Hide from statistics' },
  { value: 'hideAndRedirect', label: 'Hide & Redirect' },
]

function actionModeFromRedirect(redirectToURL: string | null): TrafficFilterActionMode {
  return redirectToURL ? 'hideAndRedirect' : 'hide'
}

function parseIpRangeEntries(entries: string[]): { fromText: string; toText: string } {
  const fromLines: string[] = []
  const toLines: string[] = []

  for (const entry of entries) {
    const parts = entry.split(',')
    fromLines.push(parts[0]?.trim() ?? '')
    toLines.push(parts[1]?.trim() ?? '')
  }

  return {
    fromText: fromLines.join('\n'),
    toText: toLines.join('\n'),
  }
}

function combineIpRangeEntries(fromText: string, toText: string): string[] {
  const fromLines = fromText.split('\n').map((line) => line.trim())
  const toLines = toText.split('\n').map((line) => line.trim())
  const lineCount = Math.max(fromLines.length, toLines.length)
  const entries: string[] = []

  for (let index = 0; index < lineCount; index += 1) {
    const from = fromLines[index] ?? ''
    const to = toLines[index] ?? ''
    if (!from && !to) continue
    entries.push(`${from}, ${to}`)
  }

  return entries
}

export interface TrafficFilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: TrafficFilter
  onSubmit: (data: TrafficFilterFormData) => void
  isSubmitting?: boolean
  countryOptions?: SelectOption[]
}

export function TrafficFilterModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
  countryOptions,
}: TrafficFilterModalProps) {
  const { control, handleSubmit, reset, setValue } = useForm<TrafficFilterFormData>({
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
  const selectedFilterType = useWatch({ control, name: 'filterType' })
  const redirectToURLValue = useWatch({ control, name: 'redirectToURL' })
  const selectedActionMode = useMemo(
    () => actionModeFromRedirect(redirectToURLValue),
    [redirectToURLValue],
  )
  const previousRedirectURLRef = useRef('')
  const formId = useId()

  useEffect(() => {
    if (typeof redirectToURLValue === 'string' && redirectToURLValue.trim().length > 0) {
      previousRedirectURLRef.current = redirectToURLValue
    }
  }, [redirectToURLValue])

  useEffect(() => {
    if (selectedFilterType === 'knownBotsAndSpiders') {
      setValue('filterEntries', [], { shouldDirty: true, shouldValidate: true })
    }
  }, [selectedFilterType, setValue])

  const normalizedCountryOptions = useMemo(
    () => countryOptions ?? [],
    [countryOptions],
  )

  const handleActionModeChange = (value: unknown) => {
    const nextMode = value === 'hideAndRedirect' ? 'hideAndRedirect' : 'hide'
    if (nextMode === 'hide') {
      setValue('redirectToURL', null, { shouldDirty: true, shouldValidate: true })
      return
    }
    const fallbackURL = previousRedirectURLRef.current || ''
    setValue('redirectToURL', fallbackURL, { shouldDirty: true, shouldValidate: true })
  }

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

  const handleClose = () => onOpenChange(false)

  return (
    <FormModal open={open} onCancel={handleClose} destroyOnHidden>
      <FormModalHeader title={initialData ? 'Edit Traffic Filter' : 'New Traffic Filter'} />
      <FormModalBody>
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                options={FILTER_TYPE_OPTIONS}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="filterEntries"
          render={({ field, fieldState }) => {
            if (selectedFilterType === 'countries') {
              return (
                <FormField label="Countries" error={fieldState.error?.message}>
                  <SmartMultiSelect
                    value={field.value ?? []}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={normalizedCountryOptions}
                    className="w-full"
                    placeholder="Select countries"
                  />
                </FormField>
              )
            }
            if (selectedFilterType === 'knownBotsAndSpiders') {
              return (
                <FormField label="Entries">
                  <p className="text-sm text-muted-foreground">
                    Known bots and spiders uses the built-in bot list. No entries required.
                  </p>
                </FormField>
              )
            }
            if (selectedFilterType === 'ipRanges') {
              const { fromText, toText } = parseIpRangeEntries(field.value ?? [])
              return (
                <FormField label="IP Ranges" error={fieldState.error?.message}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label htmlFor="filterEntriesIpFrom" className="mb-1 block text-sm font-medium">
                        From IPs (one per line)
                      </label>
                      <Input.TextArea
                        id="filterEntriesIpFrom"
                        value={fromText}
                        onChange={(e) => {
                          field.onChange(combineIpRangeEntries(e.target.value, toText))
                        }}
                        onBlur={field.onBlur}
                        placeholder="192.168.0.1"
                        rows={6}
                      />
                    </div>
                    <div>
                      <label htmlFor="filterEntriesIpTo" className="mb-1 block text-sm font-medium">
                        To IPs (one per line)
                      </label>
                      <Input.TextArea
                        id="filterEntriesIpTo"
                        value={toText}
                        onChange={(e) => {
                          field.onChange(combineIpRangeEntries(fromText, e.target.value))
                        }}
                        onBlur={field.onBlur}
                        placeholder="192.168.0.255"
                        rows={6}
                      />
                    </div>
                  </div>
                </FormField>
              )
            }
            return (
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
            )
          }}
        />

        <FormField label="Action">
          <Select
            value={selectedActionMode}
            onChange={handleActionModeChange}
            options={ACTION_MODE_OPTIONS}
            alphabetical={false}
            className="w-full"
            aria-label="Traffic filter action"
          />
        </FormField>

        {selectedActionMode === 'hideAndRedirect' ? (
          <Controller
            control={control}
            name="redirectToURL"
            render={({ field, fieldState }) => (
              <FormField
                label="Redirect URL"
                htmlFor="redirectToURL"
                required
                error={fieldState.error?.message}
              >
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
        ) : null}

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

        </form>
      </FormModalBody>
      <FormModalFooterSubmit
        onCancel={handleClose}
        formId={formId}
        submitLabel={initialData ? 'Save' : 'Create'}
        loading={isSubmitting}
      />
    </FormModal>
  )
}
