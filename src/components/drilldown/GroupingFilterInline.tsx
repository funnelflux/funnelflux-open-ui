import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGroupingFilterAssetOptions } from '@/api/hooks'
import { Input, VirtualizedMultiSelect } from '@/components/ui-kit'
import { drilldownGroupingShortLabel } from '@/lib/drilldownGroupings'

interface GroupingFilterInlineProps {
  grouping: string
  filters: { whitelist: string[]; blacklist: string[] }
  onApply: (next: { whitelist: string[]; blacklist: string[] }) => void
  disabled?: boolean
}

function parseValues(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function stringifyValues(values: string[]): string {
  return values.join('\n')
}

/** Inline whitelist control for the drilldown filters strip (legacy-style). */
export function GroupingFilterInline({
  grouping,
  filters,
  onApply,
  disabled = false,
}: GroupingFilterInlineProps) {
  const active = Boolean(grouping.trim()) && !disabled
  const { options, isLoading, isAsset } = useGroupingFilterAssetOptions(grouping, active)
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (!active || isAsset) return
    queueMicrotask(() => setManualInput(stringifyValues(filters.whitelist)))
  }, [active, filters.whitelist, isAsset])

  const label = useMemo(
    () => drilldownGroupingShortLabel(grouping) || 'Grouping',
    [grouping],
  )

  const handleAssetChange = useCallback(
    (next: string[]) => {
      onApply({ whitelist: next, blacklist: filters.blacklist })
    },
    [filters.blacklist, onApply],
  )

  const handleManualBlur = useCallback(() => {
    onApply({ whitelist: parseValues(manualInput), blacklist: filters.blacklist })
  }, [filters.blacklist, manualInput, onApply])

  if (!active) {
    return (
      <Input
        disabled
        placeholder={`Select ${label}…`}
        className="text-xs"
      />
    )
  }

  if (isAsset) {
    return (
      <VirtualizedMultiSelect
        allowClear
        loading={isLoading}
        options={options}
        placeholder={isLoading ? 'Loading…' : `Select ${label}…`}
        value={filters.whitelist}
        onChange={handleAssetChange}
        maxTagCount={2}
        listHeight={240}
        className="w-full text-xs"
      />
    )
  }

  return (
    <Input.TextArea
      value={manualInput}
      onChange={(e) => setManualInput(e.target.value)}
      onBlur={handleManualBlur}
      placeholder="Whitelist values (one per line)"
      rows={2}
      className="resize-none text-xs"
    />
  )
}
