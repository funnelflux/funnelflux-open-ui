import { useRef } from 'react'
import { DatePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

type RangeValue = [Dayjs | null, Dayjs | null]

interface DateTimeRangePickerProps {
  value?: RangeValue | null
  onChange?: (dates: RangeValue | null, dateStrings: [string, string]) => void
  /** Enable time selection (default: false = date-only) */
  showTime?: boolean
  className?: string
  style?: React.CSSProperties
  allowClear?: boolean
  presets?: { label: string; value: RangeValue }[]
}

/**
 * Date/DateTime range picker with auto-advance behavior.
 *
 * Date-only: standard RangePicker behavior.
 *
 * DateTime (showTime): clicking a date cell auto-clicks the OK button,
 * advancing from start → end panel without manual confirmation.
 * Time defaults to 00:00 (start) and 23:59 (end).
 * To change time: reopen, adjust time, click OK.
 */
export function DateTimeRangePicker({
  value,
  onChange,
  showTime = false,
  className,
  style,
  allowClear = false,
  presets,
}: DateTimeRangePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  if (!showTime) {
    return (
      <RangePicker
        value={value}
        onChange={onChange}
        className={className}
        style={style}
        allowClear={allowClear}
        presets={presets}
        format="YYYY-MM-DD"
      />
    )
  }

  // When a date cell is clicked, auto-click the OK button to advance panels.
  // The OK button is inside the popup dropdown, not the picker wrapper,
  // so we search from document. Signature matches antd's onCalendarChange
  // but we only need the side effect, not the payload.
  const handleCalendarChange = () => {
    // Small delay to let antd render the OK button in the footer
    setTimeout(() => {
      // The popup is appended to document.body. Find the visible one.
      const popup = document.querySelector(
        '.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)',
      )
      const okBtn = popup?.querySelector('.ant-picker-ok button') as HTMLButtonElement | null
      okBtn?.click()
    }, 80)
  }

  return (
    <div ref={wrapRef}>
      <RangePicker
        value={value}
        onChange={onChange}
        onCalendarChange={handleCalendarChange}
        showTime={{
          defaultValue: [
            dayjs().hour(0).minute(0).second(0),
            dayjs().hour(23).minute(59).second(59),
          ],
        }}
        className={className}
        style={style}
        allowClear={allowClear}
        presets={presets}
        format="YYYY-MM-DD HH:mm"
      />
    </div>
  )
}
