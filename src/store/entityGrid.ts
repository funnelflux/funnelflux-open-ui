import { create } from 'zustand'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell, ReportColumn } from '@/types/stats'

// ---- Types ----

export interface ListEntity {
  id: string
  name: string
  [key: string]: unknown
}

export interface EntityGridRow {
  id: string
  name: string
  cells: ReportCell[]
  [key: string]: unknown
}

export interface EntityGridConfig {
  listEndpoint: string
  listParams?: Record<string, string>
  groupBy: string
}

interface FetchParams {
  dateFrom: Date
  dateTo: Date
  timezone: string
}

export interface EntityGridState {
  entities: ListEntity[]
  statsById: Record<string, ReportCell[]>
  reportColumns: ReportColumn[]
  totalsCells: ReportCell[] | null
  isLoading: boolean
  lastFetchParams: FetchParams | null

  fetchAll: (params: FetchParams) => Promise<void>
  reload: () => void
  upsertEntity: (entity: ListEntity) => void
  removeEntity: (id: string) => void
}

// ---- Merge helpers ----

/**
 * Derive merged rows from entity list + drilldown stats.
 * Entities without stats get zero-filled cells; orphan drilldown rows are
 * already filtered out in fetchAll so they never appear here.
 */
export function buildMergedRows(
  entities: ListEntity[],
  statsById: Record<string, ReportCell[]>,
  reportColumns: ReportColumn[],
): EntityGridRow[] {
  const colCount = reportColumns.length
  return entities.map((entity) => {
    const stats = statsById[entity.id]
    if (stats) {
      return { ...entity, cells: stats }
    }
    const cells: ReportCell[] = [{ raw: entity.id, formatted: entity.name }]
    for (let i = 1; i < colCount; i++) {
      cells.push({ raw: 0, formatted: '0' })
    }
    return { ...entity, cells }
  })
}

/** Build a totals row from drilldown totals for DataTable's pinnedBottomRows. */
export function buildTotalsRow(totalsCells: ReportCell[] | null): EntityGridRow | null {
  if (!totalsCells) return null
  return { id: '__totals__', name: 'Totals', cells: totalsCells }
}

// ---- Factory ----

export function createEntityGridStore(config: EntityGridConfig) {
  return create<EntityGridState>((set, get) => ({
    entities: [],
    statsById: {},
    reportColumns: [],
    totalsCells: null,
    isLoading: false,
    lastFetchParams: null,

    fetchAll: async (params) => {
      set({ isLoading: true, lastFetchParams: params })

      try {
        const [listData, report] = await Promise.all([
          api.get<ListEntity[]>(config.listEndpoint, config.listParams),
          api.post<Report>('/stats/reporting/drilldown/', {
            timeRange: toApiDateTimeRange(params.dateFrom, params.dateTo),
            timeZone: { name: params.timezone },
            groupings: [
              { groupBy: config.groupBy, whitelistFilters: [], blacklistFilters: [] },
            ],
            paging: { start: 0, length: 5000 },
            options: { viewType: 'flat' },
          }),
        ])

        const entityIds = new Set(listData.map((e) => String(e.id)))
        const statsById: Record<string, ReportCell[]> = {}
        for (const row of report.rows ?? []) {
          const cells = row.cells ?? []
          const id = String(cells[0]?.raw ?? '')
          if (id && entityIds.has(id)) {
            statsById[id] = cells
          }
        }

        set({
          entities: listData,
          statsById,
          reportColumns: report.columns ?? [],
          totalsCells: report.totals?.cells ?? null,
          isLoading: false,
        })
      } catch {
        set({
          entities: [],
          statsById: {},
          reportColumns: [],
          totalsCells: null,
          isLoading: false,
        })
      }
    },

    reload: () => {
      const params = get().lastFetchParams
      if (params) get().fetchAll(params)
    },

    upsertEntity: (entity) => {
      set((state) => {
        const idx = state.entities.findIndex((e) => e.id === entity.id)
        const entities = [...state.entities]
        if (idx >= 0) {
          entities[idx] = entity
        } else {
          entities.unshift(entity)
        }
        return { entities }
      })
    },

    removeEntity: (id) => {
      set((state) => {
        const entities = state.entities.filter((e) => e.id !== id)
        const statsById = { ...state.statsById }
        delete statsById[id]
        return { entities, statsById }
      })
    },
  }))
}

// ---- Per-entity store instances ----

export const useTrafficSourceGridStore = createEntityGridStore({
  listEndpoint: '/data/trafficsource/list/',
  groupBy: 'Third Parties: Traffic Source',
})

export const useLanderGridStore = createEntityGridStore({
  listEndpoint: '/data/page/list/',
  listParams: { pageType: 'lander' },
  groupBy: 'Element: Lander',
})

export const useOfferGridStore = createEntityGridStore({
  listEndpoint: '/data/page/list/',
  listParams: { pageType: 'offer' },
  groupBy: 'Element: Offer',
})

export const useOfferSourceGridStore = createEntityGridStore({
  listEndpoint: '/data/offersource/list/',
  groupBy: 'Third Parties: Offer Source',
})
