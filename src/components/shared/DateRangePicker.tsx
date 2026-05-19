import { useMemo } from 'react'
import { DateTimeRangePicker } from '@/components/ui-kit'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import { normalizePickerControlTier } from '@/lib/controlSize'
import { controlSizeToAntdSize } from '@/lib/controlSize'
import {
  DATE_PRESETS,
  getPresetRange,
  type DateRange,
} from '@/lib/date-presets'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  value: DateRange & { preset: string | null }
  timezone: string
  onChange: (range: DateRange & { preset: string | null }) => void
  className?: string
  /** md | lg (`sm`/`small` map to md). */
  size?: ControlSize | LegacyAntdControlSize
  /**
   * `compact` limits width for entity list toolbars; `comfortable` for dashboard/reports.
   * @default 'comfortable'
   */
  density?: 'compact' | 'comfortable'
  /** Accessible name for the range control (toolbar layouts often omit a visible label). */
  'aria-label'?: string
}

const presetRanges = (tz: string) =>
  DATE_PRESETS.map((p) => {
    const range = getPresetRange(p.value, tz)
    return {
      label: p.label,
      value: [range.from, range.to] as [Date, Date],
    }
  })

export function DateRangePicker({
  value,
  timezone,
  onChange,
  className,
  size = 'md',
  density = 'comfortable',
  'aria-label': ariaLabel,
}: DateRangePickerProps) {
  const tier = normalizePickerControlTier(size)
  const antdSize = controlSizeToAntdSize(tier)
  const heightClass = tier === 'lg' ? 'h-control-lg' : 'h-control-md'

  const densityClass =
    density === 'compact'
      ? 'max-w-[min(100%,var(--ff-date-range-compact-max,280px))] w-[min(100%,var(--ff-date-range-compact-max,280px))] shrink-0'
      : 'max-w-full'
  const presets = useMemo(() => presetRanges(timezone), [timezone])

  return (
    <DateTimeRangePicker
      value={[value.from, value.to]}
      onChange={(dates) => {
        if (dates && dates[0] && dates[1]) {
          onChange({
            from: dates[0],
            to: dates[1],
            preset: null,
          })
        }
      }}
      presets={presets}
      size={antdSize}
      allowClear={false}
      variant="outlined"
      aria-label={ariaLabel ?? 'Date range'}
      className={cn(
        heightClass,
        densityClass,
        'ff-date-range-picker box-border !rounded-md !border-input !bg-surface !px-2.5 !text-sm !shadow-none',
        '[&_.ant-picker-input>input]:text-foreground [&_.ant-picker-input>input]:placeholder:text-muted-foreground',
        '[&_.ant-picker-separator]:text-muted-foreground [&_.ant-picker-suffix]:text-muted-foreground',
        '[&_.ant-picker-active-bar]:bg-primary',
        'flex items-center',
        className,
      )}
    />
  )
}
