import { create } from 'zustand'
import type { SortingState, VisibilityState } from '@tanstack/react-table'

interface TablePageConfig {
  columnSizing: Record<string, number>
  columnOrder: string[]
  columnVisibility: VisibilityState
  pageSize: number
  sorting: SortingState
}

/** Default client / drilldown table sort: visits descending (column id from report column defs). */
export const DEFAULT_TABLE_SORTING: SortingState = [{ id: 'visits', desc: true }]

const DEFAULTS: TablePageConfig = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  pageSize: 50,
  /** Empty = not persisted yet; DataTable applies defaultSorting ?? DEFAULT_TABLE_SORTING */
  sorting: [],
}

interface TableConfigState {
  configs: Record<string, TablePageConfig>
  setColumnSizing: (pageKey: string, sizing: Record<string, number>) => void
  setColumnOrder: (pageKey: string, order: string[]) => void
  setColumnVisibility: (pageKey: string, visibility: VisibilityState) => void
  setPageSize: (pageKey: string, size: number) => void
  setSorting: (pageKey: string, sorting: SortingState) => void
}

const STORAGE_KEY = 'ff-table-configs'

/**
 * Stable object when no config is stored for a key. `selectTableConfig` must not call
 * `mergeTablePageConfig` on every read — a fresh object each subscribe triggers
 * useSyncExternalStore / getSnapshot warnings and update loops (e.g. with antd Drawer open).
 */
const EMPTY_TABLE_PAGE_CONFIG: TablePageConfig = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  pageSize: 50,
  sorting: [],
}

function mergeTablePageConfig(raw?: Partial<TablePageConfig>): TablePageConfig {
  return {
    ...DEFAULTS,
    ...raw,
    sorting: raw?.sorting !== undefined ? raw.sorting : [],
  }
}

function loadFromStorage(): Record<string, TablePageConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<TablePageConfig>>
    const out: Record<string, TablePageConfig> = {}
    for (const key of Object.keys(parsed)) {
      out[key] = mergeTablePageConfig(parsed[key])
    }
    return out
  } catch {
    return {}
  }
}

function saveToStorage(configs: Record<string, TablePageConfig>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  } catch { /* quota exceeded */ }
}

export const useTableConfigStore = create<TableConfigState>((set) => ({
  configs: loadFromStorage(),

  setColumnSizing: (pageKey, sizing) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [pageKey]: { ...DEFAULTS, ...state.configs[pageKey], columnSizing: sizing },
      }
      saveToStorage(configs)
      return { configs }
    }),

  setColumnOrder: (pageKey, order) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [pageKey]: { ...DEFAULTS, ...state.configs[pageKey], columnOrder: order },
      }
      saveToStorage(configs)
      return { configs }
    }),

  setColumnVisibility: (pageKey, visibility) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [pageKey]: { ...DEFAULTS, ...state.configs[pageKey], columnVisibility: visibility },
      }
      saveToStorage(configs)
      return { configs }
    }),

  setPageSize: (pageKey, size) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [pageKey]: { ...DEFAULTS, ...state.configs[pageKey], pageSize: size },
      }
      saveToStorage(configs)
      return { configs }
    }),

  setSorting: (pageKey, sorting) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [pageKey]: { ...DEFAULTS, ...state.configs[pageKey], sorting },
      }
      saveToStorage(configs)
      return { configs }
    }),
}))

/** Selector that returns a stable config reference for a given page key. */
export function selectTableConfig(pageKey: string) {
  return (state: TableConfigState): TablePageConfig =>
    state.configs[pageKey] ?? EMPTY_TABLE_PAGE_CONFIG
}
