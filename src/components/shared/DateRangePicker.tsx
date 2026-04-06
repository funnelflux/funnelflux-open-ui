import { DatePicker } from "antd"
import dayjs from "dayjs"
import {
  DATE_PRESETS,
  getPresetRange,
  type DateRange,
} from "@/lib/date-presets"
import { cn } from "@/lib/utils"

const { RangePicker } = DatePicker

interface DateRangePickerProps {
  value: DateRange & { preset: string | null }
  timezone: string
  onChange: (range: DateRange & { preset: string | null }) => void
  className?: string
  /** Accessible name for the range control (toolbar layouts often omit a visible label). */
  'aria-label'?: string
}

const presetRanges = (tz: string) =>
  DATE_PRESETS.map((p) => {
    const range = getPresetRange(p.value, tz)
    return {
      label: p.label,
      value: [dayjs(range.from), dayjs(range.to)] as [dayjs.Dayjs, dayjs.Dayjs],
    }
  })

export function DateRangePicker({
  value,
  timezone,
  onChange,
  className,
  'aria-label': ariaLabel,
}: DateRangePickerProps) {
  return (
    <RangePicker
      value={[dayjs(value.from), dayjs(value.to)]}
      onChange={(dates) => {
        if (dates && dates[0] && dates[1]) {
          onChange({
            from: dates[0].toDate(),
            to: dates[1].toDate(),
            preset: null,
          })
        }
      }}
      presets={presetRanges(timezone)}
      allowClear={false}
      variant="outlined"
      aria-label={ariaLabel ?? 'Date range'}
      className={cn(
        'ff-date-range-picker !h-9 !min-h-9 !max-h-9 !rounded-md !border-input !bg-background !px-2.5 !py-0 !text-sm !shadow-sm',
        '[&_.ant-picker-input>input]:text-foreground [&_.ant-picker-input>input]:placeholder:text-muted-foreground',
        '[&_.ant-picker-separator]:text-muted-foreground [&_.ant-picker-suffix]:text-muted-foreground',
        '[&_.ant-picker-active-bar]:bg-primary',
        className,
      )}
    />
  )
}
