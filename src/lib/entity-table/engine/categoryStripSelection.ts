import type { RowSelectionState } from '@tanstack/react-table'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

/** Prefix for synthetic category strip row ids (see `buildCategorySegmentsFromRows`). */
export const CATEGORY_STRIP_ROW_ID_PREFIX = 'cat:'

export function isCategoryStripRowId(id: string): boolean {
  return id.startsWith(CATEGORY_STRIP_ROW_ID_PREFIX)
}

/** Map strip row id to `categoryId` key (`''` = uncategorized). Returns null if `id` is not a strip row. */
export function categoryKeyFromStripRowId(stripRowId: string): string | null {
  if (!stripRowId.startsWith(CATEGORY_STRIP_ROW_ID_PREFIX)) return null
  const rest = stripRowId.slice(CATEGORY_STRIP_ROW_ID_PREFIX.length)
  if (rest === 'uncat') return ''
  return rest
}

export function collectEntityIdsInCategory(categoryKey: string, rows: EntityGridRow[]): string[] {
  const out: string[] = []
  for (const row of rows) {
    if ((row as { _isCategoryHeader?: boolean })._isCategoryHeader) continue
    const cid = (row.categoryId as string) ?? ''
    if (cid === categoryKey) out.push(row.id)
  }
  return out
}

function categoryKeyForSelectedRow(id: string, rows: EntityGridRow[]): string | null {
  const stripKey = categoryKeyFromStripRowId(id)
  if (stripKey !== null) return stripKey

  const row = rows.find((candidate) => candidate.id === id) as
    | (EntityGridRow & {
      _isCategoryHeader?: boolean
      _categoryId?: string
      campaignId?: string
    })
    | undefined
  if (!row?._isCategoryHeader) return null
  return row._categoryId ?? (row.categoryId as string | undefined) ?? row.campaignId ?? ''
}

/** Strip row ids that represent a real category (not uncategorized). */
export function deletableCategoryStripRowIds(selectedIds: string[]): string[] {
  return selectedIds.filter((id) => id !== `${CATEGORY_STRIP_ROW_ID_PREFIX}uncat` && isCategoryStripRowId(id))
}

export function entityRowIdsFromSelection(selectedIds: string[]): string[] {
  return selectedIds.filter((id) => id !== '__totals__' && !isCategoryStripRowId(id))
}

function selectedKeys(state: RowSelectionState): string[] {
  return Object.entries(state)
    .filter(([, v]) => v)
    .map(([k]) => k)
}

/**
 * When a category strip row is selected/deselected, add/remove all entity rows in that category
 * (from the full filtered list, not only the current page).
 */
export function syncCategoryStripRowSelection(
  prev: RowSelectionState,
  next: RowSelectionState,
  listFiltered: EntityGridRow[],
): RowSelectionState {
  const prevSet = new Set(selectedKeys(prev))
  const nextSet = new Set(selectedKeys(next))

  const added = [...nextSet].filter((k) => !prevSet.has(k))
  const removed = [...prevSet].filter((k) => !nextSet.has(k))

  const result: RowSelectionState = { ...next }

  for (const id of added) {
    const catKey = categoryKeyForSelectedRow(id, listFiltered)
    if (catKey === null) continue
    for (const childId of collectEntityIdsInCategory(catKey, listFiltered)) {
      result[childId] = true
    }
    result[id] = true
  }

  for (const id of removed) {
    const catKey = categoryKeyForSelectedRow(id, listFiltered)
    if (catKey === null) continue
    for (const childId of collectEntityIdsInCategory(catKey, listFiltered)) {
      delete result[childId]
    }
    delete result[id]
  }

  return result
}
