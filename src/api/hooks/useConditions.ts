import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Condition } from '@/types/funnel'

export function useConditions(scope?: 'global' | 'funnel') {
  return useQuery({
    queryKey: queryKeys.conditions.list(scope),
    queryFn: () =>
      api.get<Condition[]>(
        '/data/condition/list/',
        scope ? { scope } : undefined,
      ),
  })
}

export function useCondition(id: string) {
  return useQuery({
    queryKey: queryKeys.conditions.detail(id),
    queryFn: () => api.get<Condition>('/data/condition/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (condition: Partial<Condition>) => {
      const isNew = !condition.idCondition || condition.idCondition === '0'
      return isNew
        ? api.post<Condition>('/data/condition/save/', condition)
        : api.put<Condition>('/data/condition/save/', condition)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conditions.all })
    },
  })
}

export function useDeleteCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/condition/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conditions.all })
    },
  })
}
