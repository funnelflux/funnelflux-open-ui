import { useRef } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { DatePicker } from './DatePicker'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import { controlTierToAntdSize, normalizePickerControlTier } from '@/lib/controlSize'

const { RangePicker } = DatePicker

type DateRangeValue = [Date | null, Date | null]
type DateRangePresetValue = [Date, Date]
type DayjsRangeValue = [Dayjs | null, Dayjs | null]

interface DateTimeRangePickerProps {
  value?: DateRangeValue | null
  onChange?: (dates: DateRangeValue | null, dateStrings: [string, string]) => void
  /** Enable time selection (default: false = date-only) */
  showTime?: boolean
  /**
   * When `showTime` is true: auto-click the popup OK after each calendar cell pick to advance start→end.
   * Leave **true** for manual two-step picking (e.g. drilldown). Set **false** when using **presets** —
   * otherwise `onCalendarChange` + synthetic OK can race with preset application and collapse the range
   * (e.g. both ends at 00:00).
   */
  autoConfirmCalendarSteps?: boolean
  className?: string
  style?: React.CSSProperties
  variant?: 'outlined' | 'borderless' | 'filled' | 'underlined'
  /** md | lg (`sm`/`small` map to md) */
  size?: ControlSize | LegacyAntdControlSize
  allowClear?: boolean
  presets?: { label: string; value: DateRangePresetValue }[]
}

function toDayjsRange(value: DateRangeValue | null | undefined): DayjsRangeValue | null {
  if (!value) return null
  return [value[0] ? dayjs(value[0]) : null, value[1] ? dayjs(value[1]) : null]
}

function toDateRange(value: DayjsRangeValue | null): DateRangeValue | null {
  if (!value) return null
  return [value[0]?.toDate() ?? null, value[1]?.toDate() ?? null]
}

/**
 * Date/DateTime range picker with auto-advance behavior.
 *
 * Date-only: standard RangePicker behavior.
 *
 * DateTime (showTime) with `autoConfirmCalendarSteps` (default): clicking a date cell auto-clicks OK,
 * advancing start → end. Preset-heavy UIs should set `autoConfirmCalendarSteps={false}` and press OK
 * manually when changing dates. Time defaults to 00:00 (start) and 23:59 (end) for new cells.
 */
export function DateTimeRangePicker({
  value,
  onChange,
  showTime = false,
  autoConfirmCalendarSteps = true,
  className,
  style,
  variant,
  size = 'md',
  allowClear = false,
  presets,
}: DateTimeRangePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const antdSize = controlTierToAntdSize(normalizePickerControlTier(size))
  const pickerValue = toDayjsRange(value)
  const pickerPresets = presets?.map((preset) => ({
    ...preset,
    value: [dayjs(preset.value[0]), dayjs(preset.value[1])] as [Dayjs, Dayjs],
  }))

  const handleChange = (dates: DayjsRangeValue | null, dateStrings: [string, string]) => {
    onChange?.(toDateRange(dates), dateStrings)
  }

  if (!showTime) {
    return (
      <RangePicker
        value={pickerValue}
        onChange={handleChange}
        className={className}
        style={style}
        variant={variant}
        size={antdSize}
        allowClear={allowClear}
        presets={pickerPresets}
        format="YYYY-MM-DD"
      />
    )
  }

  // Presets + synthetic OK clicks can race; only wire auto-confirm when enabled.
  const autoConfirmCalendarProps = autoConfirmCalendarSteps
    ? {
        onCalendarChange: () => {
          setTimeout(() => {
            const popup = document.querySelector(
              '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)',
            )
            const okBtn = popup?.querySelector('.ant-picker-ok button') as
              | HTMLButtonElement
              | undefined
              | null
            okBtn?.click()
          }, 80)
        },
      }
    : {}

  return (
    <div ref={wrapRef}>
      <RangePicker
        value={pickerValue}
        onChange={handleChange}
        {...autoConfirmCalendarProps}
        showTime={{
          defaultValue: [
            dayjs().hour(0).minute(0).second(0),
            dayjs().hour(23).minute(59).second(59),
          ],
        }}
        className={className}
        style={style}
        variant={variant}
        size={antdSize}
        allowClear={allowClear}
        presets={pickerPresets}
        format="YYYY-MM-DD HH:mm"
      />
    </div>
  )
}
