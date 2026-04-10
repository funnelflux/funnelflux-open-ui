import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Condition } from '@/types/funnel'

/** Row from `GET /data/campaign/funnel/condition/list/` */
export type ConditionListRow = Pick<Condition, 'idCondition' | 'conditionName'>

export function useConditions() {
  return useQuery({
    queryKey: queryKeys.conditions.list(),
    queryFn: () => api.get<Condition[]>('/data/campaign/funnel/condition/list/'),
  })
}

export function useCondition(id: string) {
  return useQuery({
    queryKey: queryKeys.conditions.detail(id),
    queryFn: () =>
      api.get<Condition>('/data/campaign/funnel/condition/find/byId/', { idCondition: id }),
    enabled: !!id,
  })
}

export function useSaveCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (condition: Partial<Condition>) => {
      const isNew = !condition.idCondition || condition.idCondition === '0'
      return isNew
        ? api.post<Condition>('/data/campaign/funnel/condition/save/', condition)
        : api.put<Condition>('/data/campaign/funnel/condition/save/', condition)
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
