import { forwardRef, type ComponentRef } from 'react'
import { DatePicker as AntDatePicker } from 'antd'
import type { DatePickerProps as AntDatePickerProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import type { DatePickerProps, ReportingDayMeta } from './DatePicker.types'

dayjs.extend(customParseFormat)

type PickerRef = ComponentRef<typeof AntDatePicker>

function dayjsToReportingDayMeta(d: Dayjs): ReportingDayMeta {
  return {
    ymd: d.format('YYYY-MM-DD'),
    apiDate: { year: d.year(), month: d.month() + 1, day: d.date() },
  }
}

const DatePickerInner = forwardRef<PickerRef, DatePickerProps>(function DatePicker(
  { onChange, reportingValue, value, ...rest },
  ref,
) {
  const resolvedValue = Array.isArray(value) ? value[0] : value
  const pickerValue =
    reportingValue != null ? dayjs(reportingValue.ymd, 'YYYY-MM-DD', true) : resolvedValue

  const handleChange: AntDatePickerProps['onChange'] = (date, dateString) => {
    const d = Array.isArray(date) ? null : date
    const reporting =
      d != null && d.isValid() ? dayjsToReportingDayMeta(d) : null
    onChange?.(d, dateString, reporting)
  }

  return <AntDatePicker ref={ref} {...rest} value={pickerValue} onChange={handleChange} />
})

DatePickerInner.displayName = 'DatePicker'

export const DatePicker = Object.assign(DatePickerInner, {
  RangePicker: AntDatePicker.RangePicker,
})
