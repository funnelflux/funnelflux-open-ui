import { DatePicker } from "@/components/ui-kit"
import dayjs from "dayjs"
import type { ControlSize } from "@/lib/controlSize"
import {
  CONTROL_SIZE_HEIGHT_PX,
  controlSizeToAntdSize,
} from "@/lib/controlSize"
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
  /** Default **md** (35px) — matches Select / Button in toolbars */
  controlSize?: ControlSize
  /** Ant Design `RangePicker` size; overrides `controlSize` when set */
  size?: 'small' | 'middle' | 'large'
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
  controlSize = 'md',
  size,
  'aria-label': ariaLabel,
}: DateRangePickerProps) {
  const antdSize = size ?? controlSizeToAntdSize(controlSize)
  const heightPx =
    antdSize === 'small'
      ? CONTROL_SIZE_HEIGHT_PX.sm
      : antdSize === 'large'
        ? CONTROL_SIZE_HEIGHT_PX.lg
        : CONTROL_SIZE_HEIGHT_PX.md

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
      size={antdSize}
      allowClear={false}
      variant="outlined"
      aria-label={ariaLabel ?? 'Date range'}
      // Explicit height: removed !py-0 which collapsed the picker below Select/Button; matches CONTROL_SIZE_HEIGHT_PX
      style={{ height: heightPx, minHeight: heightPx }}
      className={cn(
        'ff-date-range-picker box-border !rounded-md !border-input !bg-background !px-2.5 !text-sm !shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        '[&_.ant-picker-input>input]:text-foreground [&_.ant-picker-input>input]:placeholder:text-muted-foreground',
        '[&_.ant-picker-separator]:text-muted-foreground [&_.ant-picker-suffix]:text-muted-foreground',
        '[&_.ant-picker-active-bar]:bg-primary',
        'flex items-center',
        className,
      )}
    />
  )
}
