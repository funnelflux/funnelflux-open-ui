import { DATE_PRESETS, getPresetRange } from '@/lib/date-presets'
import { DateTimeRangePicker, Select, TimezoneSelect } from '@/components/ui-kit'
import { useDrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'
import { TIME_ATTRIBUTION_OPTIONS } from '@/components/drilldown/DrilldownToolbar/types'

function presetRanges(tz: string): { label: string; value: [Date, Date] }[] {
  return DATE_PRESETS.map((p) => {
    const range = getPresetRange(p.value, tz)
    return {
      label: p.label,
      value: [range.from, range.to],
    }
  })
}

/** Date/time range + timezone — for `PageShell` `actions` (top row, right). */
export function DrilldownToolbarHeaderFilters() {
  const {
    dateTimeRangeValue,
    onDateTimeRangeChange,
    timezone,
    setTimezone,
    timeAttribution,
    setTimeAttribution,
  } = useDrilldownToolbarContext()

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      <DateTimeRangePicker
        showTime
        value={dateTimeRangeValue}
        onChange={(dates) => {
          const a = dates?.[0]
          const b = dates?.[1]
          if (a && b) {
            onDateTimeRangeChange([a, b])
          }
        }}
        presets={presetRanges(timezone)}
        allowClear={false}
        className="ff-drilldown-datetime-range [&_.ant-picker-input>input]:text-xs"
      />
      <TimezoneSelect value={timezone} onChange={setTimezone} />
      <Select
        value={timeAttribution}
        onChange={(value) => setTimeAttribution(value === 'event' ? 'event' : 'entrance')}
        className="min-w-[140px] text-xs"
        options={[...TIME_ATTRIBUTION_OPTIONS]}
      />
    </div>
  )
}
