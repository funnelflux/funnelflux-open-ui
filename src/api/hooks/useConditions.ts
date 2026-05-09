import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { FunnelCondition } from '@/types/entities'

/**
 * List row for global conditions — only fields returned by
 * `GET /data/campaign/funnel/condition/list/` (OpenAPI `IdNamePair`: `id`, `name`).
 */
export type ConditionListItem = {
  idCondition: string
  conditionName: string
}

/**
 * Normalizes condition list payloads: raw `IdNamePair[]`, `{ rows: [...] }`, or alternate keys (`idCondition` / `conditionName`).
 */
export function normalizeConditionListResponse(raw: unknown): ConditionListItem[] {
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)
      ? (raw as { rows: unknown[] }).rows
      : []

  return rows
    .map((row): ConditionListItem | null => {
      if (!row || typeof row !== 'object') return null
      const r = row as Record<string, unknown>
      const idRaw = r.id ?? r.idCondition
      const id = idRaw !== undefined && idRaw !== null ? String(idRaw) : ''
      const nameRaw = r.name ?? r.conditionName
      const conditionName = nameRaw !== undefined && nameRaw !== null ? String(nameRaw) : ''
      if (!id) return null
      return { idCondition: id, conditionName }
    })
    .filter((x): x is ConditionListItem => x !== null)
}

async function fetchConditionList(): Promise<ConditionListItem[]> {
  const raw = await api.get<unknown>('/data/campaign/funnel/condition/list/')
  return normalizeConditionListResponse(raw)
}

export function useConditions() {
  return useQuery({
    queryKey: queryKeys.conditions.list(),
    queryFn: fetchConditionList,
  })
}

export function useCondition(
  id: string,
  options?: {
    /** When false, the query does not run (for example, while an edit modal is closed). */
    enabled?: boolean
    /** Override global staleTime; use `0` when the UI must refetch whenever it becomes active. */
    staleTime?: number
    refetchOnMount?: boolean | 'always'
  },
) {
  const hasId = !!id
  const enabled = options?.enabled !== undefined ? options.enabled && hasId : hasId
  return useQuery({
    queryKey: queryKeys.conditions.detail(id),
    queryFn: () =>
      api.get<FunnelCondition>('/data/campaign/funnel/condition/find/byId/', { idCondition: id }),
    enabled,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
  })
}

export function useSaveCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (condition: FunnelCondition & { __isNew?: boolean }) => {
      const isNew = condition.__isNew === true || !condition.idCondition || condition.idCondition === '0'
      return isNew
        ? api.post<void>('/data/campaign/funnel/condition/save/', condition)
        : api.put<void>('/data/campaign/funnel/condition/save/', condition)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conditions.all })
    },
  })
}

export function useDeleteCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete('/data/campaign/funnel/condition/delete/', { idCondition: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conditions.all })
    },
  })
}
