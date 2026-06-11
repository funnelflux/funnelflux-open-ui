import { Select } from './Select'
import type { SelectOption } from './Select'
import { getStoredTimezone, storeTimezonePreference } from './timezoneStorage'
import { normalizeTimezone } from './timezoneUtils'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import type { CSSProperties } from 'react'

const UTC_OFFSETS: { value: string; offset: number; label: string; city?: string }[] = [
  { value: 'Pacific/Pago_Pago', offset: -11, label: 'UTC-11', city: 'American Samoa' },
  { value: 'Pacific/Honolulu', offset: -10, label: 'UTC-10', city: 'Honolulu' },
  { value: 'America/Anchorage', offset: -9, label: 'UTC-9', city: 'Anchorage' },
  { value: 'America/Los_Angeles', offset: -8, label: 'UTC-8', city: 'Los Angeles' },
  { value: 'America/Denver', offset: -7, label: 'UTC-7', city: 'Denver' },
  { value: 'America/Chicago', offset: -6, label: 'UTC-6', city: 'Chicago' },
  { value: 'America/New_York', offset: -5, label: 'UTC-5', city: 'New York' },
  { value: 'America/Santiago', offset: -4, label: 'UTC-4', city: 'Santiago' },
  { value: 'America/Sao_Paulo', offset: -3, label: 'UTC-3', city: 'São Paulo' },
  { value: 'Atlantic/South_Georgia', offset: -2, label: 'UTC-2', city: 'South Georgia' },
  { value: 'Atlantic/Azores', offset: -1, label: 'UTC-1', city: 'Azores (Portugal)' },
  { value: 'UTC', offset: 0, label: 'UTC+0', city: 'London' },
  { value: 'Europe/Berlin', offset: 1, label: 'UTC+1', city: 'Berlin' },
  { value: 'Europe/Athens', offset: 2, label: 'UTC+2', city: 'Athens' },
  { value: 'Europe/Moscow', offset: 3, label: 'UTC+3', city: 'Moscow' },
  { value: 'Asia/Dubai', offset: 4, label: 'UTC+4', city: 'Dubai' },
  { value: 'Asia/Karachi', offset: 5, label: 'UTC+5', city: 'Karachi' },
  { value: 'Asia/Kolkata', offset: 5.5, label: 'UTC+5:30', city: 'Mumbai' },
  { value: 'Asia/Dhaka', offset: 6, label: 'UTC+6', city: 'Dhaka' },
  { value: 'Asia/Bangkok', offset: 7, label: 'UTC+7', city: 'Bangkok' },
  { value: 'Asia/Singapore', offset: 8, label: 'UTC+8', city: 'Singapore' },
  { value: 'Asia/Tokyo', offset: 9, label: 'UTC+9', city: 'Tokyo' },
  { value: 'Australia/Sydney', offset: 10, label: 'UTC+10', city: 'Sydney' },
  { value: 'Pacific/Guadalcanal', offset: 11, label: 'UTC+11', city: 'Solomon Islands' },
  { value: 'Pacific/Auckland', offset: 12, label: 'UTC+12', city: 'Auckland' },
  { value: 'Pacific/Apia', offset: 13, label: 'UTC+13', city: 'Samoa' },
  { value: 'Pacific/Kiritimati', offset: 14, label: 'UTC+14', city: 'Kiribati (Line Islands)' },
]

function timezoneOptions(compactLabels: boolean): SelectOption[] {
  return UTC_OFFSETS.map((tz) => ({
    value: tz.value,
    label: compactLabels ? tz.label : tz.city ? `${tz.label} (${tz.city})` : tz.label,
    displayLabel: tz.city ? `${tz.label} (${tz.city})` : tz.label,
    searchId: tz.city,
  }))
}

interface TimezoneSelectProps {
  id?: string
  value?: string
  onChange?: (timezone: string) => void
  className?: string
  style?: CSSProperties
  dropdownStyle?: CSSProperties
  popupMatchSelectWidth?: boolean | number
  disabled?: boolean
  /** Default **md** — aligns with other toolbar selects */
  size?: ControlSize | LegacyAntdControlSize
  compactLabels?: boolean
  'aria-label'?: string
}

export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
  style,
  dropdownStyle,
  popupMatchSelectWidth,
  disabled,
  size = 'md',
  compactLabels = false,
  'aria-label': ariaLabel,
}: TimezoneSelectProps) {
  const currentTz = value || getStoredTimezone()
  const normalized = normalizeTimezone(currentTz)

  return (
    <Select
      id={id}
      value={normalized}
      onChange={(timezone) => {
        storeTimezonePreference(timezone)
        onChange?.(timezone)
      }}
      options={timezoneOptions(compactLabels)}
      alphabetical={false}
      placeholder="Select timezone"
      aria-label={ariaLabel ?? 'Select timezone'}
      size={size}
      className={className}
      dropdownStyle={dropdownStyle}
      popupMatchSelectWidth={popupMatchSelectWidth}
      style={{ minWidth: 180, ...style }}
      disabled={disabled}
    />
  )
}
