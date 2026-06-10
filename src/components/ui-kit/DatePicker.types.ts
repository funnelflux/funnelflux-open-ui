import type { DatePickerProps as AntDatePickerProps } from 'antd'
import type { Dayjs } from 'dayjs'
import type { ApiDate } from '@/types/stats'

/**
 * Calendar day derived by {@link DatePicker} for API payloads (`ApiDate`) and stable `YYYY-MM-DD` strings.
 * Passed as the third argument to `onChange` and accepted via `reportingValue` for controlled mode.
 */
export interface ReportingDayMeta {
  ymd: string
  apiDate: ApiDate
}

export type DatePickerProps = Omit<AntDatePickerProps, 'onChange'> & {
  /**
   * @param date - Ant Design / dayjs value (or null when cleared).
   * @param dateString - Formatted string(s) from the picker.
   * @param reporting - Wire-shaped day for stats/reporting APIs; null when cleared or invalid.
   */
  onChange?: (
    date: Dayjs | null,
    dateString: string | string[] | null,
    reporting: ReportingDayMeta | null,
  ) => void
  /** Controlled value when UI state is stored as `{ ymd, apiDate }` instead of dayjs. */
  reportingValue?: ReportingDayMeta | null
}
