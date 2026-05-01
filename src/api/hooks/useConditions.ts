import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { FunnelCondition } from '@/types/entities'

/** API returns id/name pairs; optional fields if the backend adds full `FunnelCondition` later. */
export type ConditionListItem = Pick<FunnelCondition, 'idCondition' | 'conditionName'> &
  Partial<Pick<FunnelCondition, 'restrictToFunnelId' | 'orTests'>>

type ApiConditionListRow = { id: string | number; name: string } & Partial<FunnelCondition>

async function fetchConditionList(): Promise<ConditionListItem[]> {
  const rows = await api.get<ApiConditionListRow[]>('/data/campaign/funnel/condition/list/')
  return rows.map((row) => ({
    idCondition: String(row.id),
    conditionName: row.name,
    ...(row.restrictToFunnelId !== undefined ? { restrictToFunnelId: row.restrictToFunnelId } : {}),
    ...(row.orTests !== undefined ? { orTests: row.orTests } : {}),
  }))
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
