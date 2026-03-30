import { DatePicker } from "antd"
import dayjs from "dayjs"
import {
  DATE_PRESETS,
  getPresetRange,
  type DateRange,
} from "@/lib/date-presets"

const { RangePicker } = DatePicker

interface DateRangePickerProps {
  value: DateRange & { preset: string | null }
  timezone: string
  onChange: (range: DateRange & { preset: string | null }) => void
  className?: string
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
      size="small"
      className={className}
      allowClear={false}
    />
  )
}
