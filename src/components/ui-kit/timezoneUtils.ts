import { TZDate } from '@date-fns/tz'
import { resolveReportingTimezone } from './timezoneStorage'

const UTC_OFFSETS: { value: string; offset: number }[] = [
  { value: 'Pacific/Pago_Pago', offset: -11 },
  { value: 'Pacific/Honolulu', offset: -10 },
  { value: 'America/Anchorage', offset: -9 },
  { value: 'America/Los_Angeles', offset: -8 },
  { value: 'America/Denver', offset: -7 },
  { value: 'America/Chicago', offset: -6 },
  { value: 'America/New_York', offset: -5 },
  { value: 'America/Santiago', offset: -4 },
  { value: 'America/Sao_Paulo', offset: -3 },
  { value: 'Atlantic/South_Georgia', offset: -2 },
  { value: 'Atlantic/Azores', offset: -1 },
  { value: 'UTC', offset: 0 },
  { value: 'Europe/Berlin', offset: 1 },
  { value: 'Europe/Athens', offset: 2 },
  { value: 'Europe/Moscow', offset: 3 },
  { value: 'Asia/Dubai', offset: 4 },
  { value: 'Asia/Karachi', offset: 5 },
  { value: 'Asia/Kolkata', offset: 5.5 },
  { value: 'Asia/Dhaka', offset: 6 },
  { value: 'Asia/Bangkok', offset: 7 },
  { value: 'Asia/Singapore', offset: 8 },
  { value: 'Asia/Tokyo', offset: 9 },
  { value: 'Australia/Sydney', offset: 10 },
  { value: 'Pacific/Guadalcanal', offset: 11 },
  { value: 'Pacific/Auckland', offset: 12 },
  { value: 'Pacific/Apia', offset: 13 },
  { value: 'Pacific/Kiritimati', offset: 14 },
]

function getOffsetHours(timezone: string): number {
  const zoned = new TZDate(Date.now(), timezone)
  return -zoned.getTimezoneOffset() / 60
}

export function normalizeTimezone(timezone: string): string {
  const resolved = resolveReportingTimezone(timezone)
  if (UTC_OFFSETS.some((option) => option.value === resolved)) return resolved
  try {
    const offset = getOffsetHours(resolved)
    return UTC_OFFSETS.find((option) => option.offset === offset)?.value ?? resolved
  } catch {
    return resolved
  }
}
