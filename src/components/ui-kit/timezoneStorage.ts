import { resolveReportingTimezone } from '@/lib/reportingTimezone'

const STORAGE_KEY = 'ff_timezone'

export { resolveReportingTimezone }

export function getStoredTimezone(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return resolveReportingTimezone(stored)
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function storeTimezonePreference(tz: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, tz)
  } catch {
    /* noop */
  }
}
