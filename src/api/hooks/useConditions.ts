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

export function useCondition(id: string) {
  return useQuery({
    queryKey: queryKeys.conditions.detail(id),
    queryFn: () =>
      api.get<FunnelCondition>('/data/campaign/funnel/condition/find/byId/', { idCondition: id }),
    enabled: !!id,
  })
}

export function useSaveCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (condition: FunnelCondition) => {
      const isNew = !condition.idCondition || condition.idCondition === '0'
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
