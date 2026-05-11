const COLUMN_STORAGE_PREFIX = 'ff_columns_'

export function columnVisibilityStorageKey(storageKey: string): string {
  return `${COLUMN_STORAGE_PREFIX}${storageKey}`
}

export function readHiddenColumnIds(storageKey: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(columnVisibilityStorageKey(storageKey))
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.map(String))
  } catch {
    return null
  }
}

export function writeHiddenColumnIds(storageKey: string, hiddenIds: Iterable<string>): void {
  try {
    localStorage.setItem(columnVisibilityStorageKey(storageKey), JSON.stringify([...hiddenIds]))
  } catch {
    /* ignore */
  }
}
