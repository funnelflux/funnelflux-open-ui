const STORAGE_KEY = 'ff_timezone'

export function getStoredTimezone(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function storeTimezone(tz: string) {
  try { localStorage.setItem(STORAGE_KEY, tz) } catch { /* noop */ }
}
