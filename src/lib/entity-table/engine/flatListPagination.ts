/** 0-based page index for a row in a flat list (no category headers). */
export function pageIndexForRowInFlatList<T extends { id: string }>(
  rows: T[],
  entityId: string,
  pageSize: number,
): number | null {
  if (pageSize <= 0) return null
  const index = rows.findIndex((row) => row.id === entityId)
  if (index < 0) return null
  return Math.floor(index / pageSize)
}
