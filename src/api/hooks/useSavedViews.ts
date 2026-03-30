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

interface RawSavedView {
  idView?: string
  id?: string
  name?: string
  groupings?: string[]
  groupBys?: string[]
  timezone?: string
  timeZone?: string
  dateRange?: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist?: string[]; blacklist?: string[] }>
}

interface SaveViewRequest {
  idView?: string
  name: string
  groupings: string[]
  timezone: string
  dateRange: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist: string[]; blacklist: string[] }>
}

function normalizeSavedView(view: RawSavedView): SavedView {
  const groupingFilters = Object.fromEntries(
    Object.entries(view.groupingFilters ?? {}).map(([level, filters]) => [
      Number(level),
      {
        whitelist: filters.whitelist ?? [],
        blacklist: filters.blacklist ?? [],
      },
    ]),
  ) as SavedView['groupingFilters']

  return {
    idView: String(view.idView ?? view.id ?? ''),
    name: view.name ?? 'Untitled view',
    groupings: view.groupings ?? view.groupBys ?? [],
    timezone: view.timezone ?? view.timeZone,
    dateRange: view.dateRange ?? null,
    groupingFilters,
  }
}

export function useSavedViews() {
  return useQuery({
    queryKey: queryKeys.savedViews.list(),
    queryFn: async () => {
      const response = await api.get<RawSavedView[] | { views?: RawSavedView[] }>('/data/reporting/views/list/')
      const views = Array.isArray(response) ? response : response.views ?? []
      return views.map(normalizeSavedView)
    },
  })
}

export function useSaveView() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (view: SaveViewRequest) =>
      api.post<{ idView?: string }>('/data/reporting/views/save/', view),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savedViews.all })
    },
  })
}

export function useDeleteView() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (idView: string) => api.delete('/data/reporting/views/delete/', { idView }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savedViews.all })
    },
  })
}
