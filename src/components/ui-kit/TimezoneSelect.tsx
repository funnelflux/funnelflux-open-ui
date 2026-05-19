import { Select } from './Select'
import type { SelectOption } from './Select'
import { getStoredTimezone, storeTimezonePreference } from './timezoneStorage'
import type { ControlSize, LegacyAntdControlSize } from '@/lib/controlSize'
import type { CSSProperties } from 'react'

const UTC_OFFSETS: { value: string; offset: number; label: string; city?: string }[] = [
  { value: 'Etc/GMT+12', offset: -12, label: 'UTC-12', city: 'Baker Island (US)' },
  { value: 'Etc/GMT+11', offset: -11, label: 'UTC-11', city: 'American Samoa' },
  { value: 'Etc/GMT+10', offset: -10, label: 'UTC-10', city: 'Honolulu' },
  { value: 'Etc/GMT+9', offset: -9, label: 'UTC-9', city: 'Anchorage' },
  { value: 'Etc/GMT+8', offset: -8, label: 'UTC-8', city: 'Los Angeles' },
  { value: 'Etc/GMT+7', offset: -7, label: 'UTC-7', city: 'Denver' },
  { value: 'Etc/GMT+6', offset: -6, label: 'UTC-6', city: 'Chicago' },
  { value: 'Etc/GMT+5', offset: -5, label: 'UTC-5', city: 'New York' },
  { value: 'Etc/GMT+4', offset: -4, label: 'UTC-4', city: 'Santiago' },
  { value: 'Etc/GMT+3', offset: -3, label: 'UTC-3', city: 'São Paulo' },
  { value: 'Etc/GMT+2', offset: -2, label: 'UTC-2', city: 'South Georgia' },
  { value: 'Etc/GMT+1', offset: -1, label: 'UTC-1', city: 'Azores (Portugal)' },
  { value: 'UTC', offset: 0, label: 'UTC+0', city: 'London' },
  { value: 'Etc/GMT-1', offset: 1, label: 'UTC+1', city: 'Berlin' },
  { value: 'Etc/GMT-2', offset: 2, label: 'UTC+2', city: 'Athens' },
  { value: 'Etc/GMT-3', offset: 3, label: 'UTC+3', city: 'Moscow' },
  { value: 'Etc/GMT-4', offset: 4, label: 'UTC+4', city: 'Dubai' },
  { value: 'Etc/GMT-5', offset: 5, label: 'UTC+5', city: 'Karachi' },
  { value: 'Asia/Kolkata', offset: 5.5, label: 'UTC+5:30', city: 'Mumbai' },
  { value: 'Etc/GMT-6', offset: 6, label: 'UTC+6', city: 'Dhaka' },
  { value: 'Etc/GMT-7', offset: 7, label: 'UTC+7', city: 'Bangkok' },
  { value: 'Etc/GMT-8', offset: 8, label: 'UTC+8', city: 'Singapore' },
  { value: 'Etc/GMT-9', offset: 9, label: 'UTC+9', city: 'Tokyo' },
  { value: 'Etc/GMT-10', offset: 10, label: 'UTC+10', city: 'Sydney' },
  { value: 'Etc/GMT-11', offset: 11, label: 'UTC+11', city: 'Solomon Islands' },
  { value: 'Etc/GMT-12', offset: 12, label: 'UTC+12', city: 'Auckland' },
  { value: 'Etc/GMT-13', offset: 13, label: 'UTC+13', city: 'Samoa' },
  { value: 'Etc/GMT-14', offset: 14, label: 'UTC+14', city: 'Kiribati (Line Islands)' },
]

const TZ_OPTIONS: SelectOption[] = UTC_OFFSETS.map((tz) => ({
  value: tz.value,
  label: tz.city ? `${tz.label} (${tz.city})` : tz.label,
  searchId: tz.city,
}))

function normalizeTimezone(tz: string): string {
  if (UTC_OFFSETS.some((o) => o.value === tz)) return tz
  try {
    const now = new Date()
    const offset = -new Date(now.toLocaleString('en-US', { timeZone: tz })).getTimezoneOffset() / 60
    return UTC_OFFSETS.find((o) => o.offset === offset)?.value ?? tz
  } catch {
    return tz
  }
}

interface TimezoneSelectProps {
  id?: string
  value?: string
  onChange?: (timezone: string) => void
  className?: string
  style?: CSSProperties
  disabled?: boolean
  /** Default **md** — aligns with other toolbar selects */
  size?: ControlSize | LegacyAntdControlSize
  'aria-label'?: string
}

export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
  style,
  disabled,
  size = 'md',
  'aria-label': ariaLabel,
}: TimezoneSelectProps) {
  const currentTz = value || getStoredTimezone()
  const normalized = normalizeTimezone(currentTz)

  return (
    <Select
      id={id}
      value={normalized}
      onChange={(tz) => {
        storeTimezonePreference(tz)
        onChange?.(tz)
      }}
      options={TZ_OPTIONS}
      alphabetical={false}
      placeholder="Select timezone"
      aria-label={ariaLabel ?? 'Select timezone'}
      size={size}
      className={className}
      style={{ minWidth: 180, ...style }}
      disabled={disabled}
    />
  )
}
