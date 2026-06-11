import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { UrlTrackingFieldLevelMeta } from '@/lib/urlTrackingFieldGrouping'
import {
  isUrlTrackingFieldGroupingToken,
  urlTrackingFieldSlotFromGrouping,
} from '@/lib/urlTrackingFieldGrouping'

export interface SavedView {
  idView: string
  name: string
  groupings: string[]
  timezone?: string
  dateRange?: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist: string[]; blacklist: string[] }>
  urlTrackingFieldByLevel?: Record<number, UrlTrackingFieldLevelMeta>
}

/** One level in `stats_grouping_views.settings` (PHP). Only a single whitelist id per level is stored. */
interface LegacyViewSetting {
  by: string
  id?: string
  urlTrackingField?: UrlTrackingFieldLevelMeta
}

export interface SaveViewRequest {
  idView?: string
  name: string
  groupings: string[]
  timezone: string
  dateRange: { start: string; end: string } | null
  groupingFilters?: Record<number, { whitelist: string[]; blacklist: string[] }>
  urlTrackingFieldByLevel?: Record<number, UrlTrackingFieldLevelMeta>
}

/** Row shape from `POST /ui/drilldowns/load/` when `elements` includes `availableViews`. */
export interface DrilldownViewRow {
  id: string
  name: string
  groupings?: Array<{
    groupBy: string
    whitelistFilters?: string[]
    urlTrackingField?: Partial<UrlTrackingFieldLevelMeta>
  }>
}

interface DrilldownLoadResponse {
  availableViews?: DrilldownViewRow[]
}

function normalizeUrlTrackingFieldMeta(value: unknown): UrlTrackingFieldLevelMeta | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const fieldId = String(raw.fieldId ?? '').trim()
  const trafficSourceId = String(raw.trafficSourceId ?? '').trim()
  const trafficSourceName = String(raw.trafficSourceName ?? '')
  const index1BasedRaw = Number(raw.index1Based ?? raw.fieldIndex ?? raw.index ?? 0)
  const index1Based = Number.isFinite(index1BasedRaw) && index1BasedRaw > 0 ? index1BasedRaw : 1
  if (!fieldId || !trafficSourceId) return null
  return { fieldId, trafficSourceId, trafficSourceName, index1Based }
}

export function buildLegacySettings(view: SaveViewRequest): LegacyViewSetting[] {
  return view.groupings.map((by, level) => {
    const whitelist = view.groupingFilters?.[level]?.whitelist ?? []
    const first = whitelist.find((x) => x.trim() !== '')
    const urlTrackingField = isUrlTrackingFieldGroupingToken(by)
      ? view.urlTrackingFieldByLevel?.[level]
      : undefined
    const urlTrackingPayload = urlTrackingField ? { urlTrackingField } : {}
    if (first) {
      return { by, id: first, ...urlTrackingPayload }
    }
    return { by, ...urlTrackingPayload }
  })
}

export function drilldownViewRowToSavedView(row: DrilldownViewRow): SavedView {
  const levels = row.groupings ?? []
  const groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }> = {}
  const urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta> = {}
  levels.forEach((g, i) => {
    groupingFilters[i] = {
      whitelist: g.whitelistFilters ?? [],
      blacklist: [],
    }
    const meta = normalizeUrlTrackingFieldMeta(g.urlTrackingField)
    if (meta && isUrlTrackingFieldGroupingToken(g.groupBy)) {
      urlTrackingFieldByLevel[i] = meta
    } else if (meta && urlTrackingFieldSlotFromGrouping(g.groupBy) != null) {
      urlTrackingFieldByLevel[i] = meta
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
    urlTrackingFieldByLevel,
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
