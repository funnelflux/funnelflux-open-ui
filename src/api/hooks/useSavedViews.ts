import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'

export interface SavedView {
  idView: string
  name: string
  groupings: string[]
  timezone?: string
  dateRange?: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist: string[]; blacklist: string[] }>
}

/** One level in `stats_grouping_views.settings` (PHP). Only a single whitelist id per level is stored. */
interface LegacyViewSetting {
  by: string
  id?: string
}

interface SaveViewRequest {
  idView?: string
  name: string
  groupings: string[]
  timezone: string
  dateRange: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist: string[]; blacklist: string[] }>
}

/** Row shape from `POST /ui/drilldowns/load/` when `elements` includes `availableViews`. */
interface DrilldownViewRow {
  id: string
  name: string
  groupings?: Array<{ groupBy: string; whitelistFilters?: string[] }>
}

interface DrilldownLoadResponse {
  availableViews?: DrilldownViewRow[]
}

function buildLegacySettings(view: SaveViewRequest): LegacyViewSetting[] {
  return view.groupings.map((by, level) => {
    const whitelist = view.groupingFilters?.[level]?.whitelist ?? []
    const first = whitelist.find((x) => x.trim() !== '')
    if (first) {
      return { by, id: first }
    }
    return { by }
  })
}

function drilldownViewRowToSavedView(row: DrilldownViewRow): SavedView {
  const levels = row.groupings ?? []
  const groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }> = {}
  levels.forEach((g, i) => {
    groupingFilters[i] = {
      whitelist: g.whitelistFilters ?? [],
      blacklist: [],
    }
  })
  return {
    idView: String(row.id),
    name: row.name,
    groupings: levels.map((g) => g.groupBy),
    /** Backend `stats_grouping_views` stores groupings only; date/time are not persisted. */
    dateRange: null,
    timezone: undefined,
    groupingFilters,
  }
}

export function useSavedViews() {
  return useQuery({
    queryKey: queryKeys.savedViews.list(),
    queryFn: async () => {
      const data = await api.post<DrilldownLoadResponse>('/ui/drilldowns/load/', {
        elements: ['availableViews'],
      })
      const views = data.availableViews ?? []
      return views.map(drilldownViewRowToSavedView)
    },
  })
}

export function useSaveView() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (view: SaveViewRequest) => {
      const idView = view.idView?.trim() ? view.idView.trim() : undefined
      const body = {
        name: view.name.trim(),
        ...(idView ? { idView } : {}),
        settings: buildLegacySettings(view),
        columns: [] as unknown[],
      }
      return api.post<{ idView?: string }>('/ui/drilldowns/view/save/', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savedViews.all })
    },
  })
}

export function useDeleteView() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (idView: string) =>
      api.delete('/ui/drilldowns/view/delete/', { idView }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savedViews.all })
    },
  })
}
