/** PHP 8.4+ no longer lists Etc/GMT* identifiers; map legacy UI values to IANA names. */
const LEGACY_TIMEZONE_ALIASES: Record<string, string> = {
  'Etc/GMT+12': 'Pacific/Pago_Pago',
  'Etc/GMT+11': 'Pacific/Pago_Pago',
  'Etc/GMT+10': 'Pacific/Honolulu',
  'Etc/GMT+9': 'America/Anchorage',
  'Etc/GMT+8': 'America/Los_Angeles',
  'Etc/GMT+7': 'America/Denver',
  'Etc/GMT+6': 'America/Chicago',
  'Etc/GMT+5': 'America/New_York',
  'Etc/GMT+4': 'America/Santiago',
  'Etc/GMT+3': 'America/Sao_Paulo',
  'Etc/GMT+2': 'Atlantic/South_Georgia',
  'Etc/GMT+1': 'Atlantic/Azores',
  'Etc/GMT-1': 'Europe/Berlin',
  'Etc/GMT-2': 'Europe/Athens',
  'Etc/GMT-3': 'Europe/Moscow',
  'Etc/GMT-4': 'Asia/Dubai',
  'Etc/GMT-5': 'Asia/Karachi',
  'Etc/GMT-6': 'Asia/Dhaka',
  'Etc/GMT-7': 'Asia/Bangkok',
  'Etc/GMT-8': 'Asia/Singapore',
  'Etc/GMT-9': 'Asia/Tokyo',
  'Etc/GMT-10': 'Australia/Sydney',
  'Etc/GMT-11': 'Pacific/Guadalcanal',
  'Etc/GMT-12': 'Pacific/Auckland',
  'Etc/GMT-13': 'Pacific/Apia',
  'Etc/GMT-14': 'Pacific/Kiritimati',
}

export function resolveReportingTimezone(timezone: string): string {
  return LEGACY_TIMEZONE_ALIASES[timezone] ?? timezone
}
