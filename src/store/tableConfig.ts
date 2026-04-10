import { create } from 'zustand'
import type { VisibilityState } from '@tanstack/react-table'

interface TablePageConfig {
  columnSizing: Record<string, number>
  columnVisibility: VisibilityState
  pageSize: number
}

const DEFAULTS: TablePageConfig = {
  columnSizing: {},
  columnVisibility: {},
  pageSize: 50,
}

interface TableConfigState {
  configs: Record<string, TablePageConfig>
  setColumnSizing: (pageKey: string, sizing: Record<string, number>) => void
  setColumnVisibility: (pageKey: string, visibility: VisibilityState) => void
  setPageSize: (pageKey: string, size: number) => void
}

const STORAGE_KEY = 'ff-table-configs'

function loadFromStorage(): Record<string, TablePageConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, TablePageConfig>
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
}))

/** Selector that returns a stable config object for a given page key. */
export function selectTableConfig(pageKey: string) {
  return (state: TableConfigState): TablePageConfig => state.configs[pageKey] ?? DEFAULTS
}
