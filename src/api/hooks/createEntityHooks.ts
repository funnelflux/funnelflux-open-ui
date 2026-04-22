import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface EntityHookConfig {
  entityKey: string
  endpoints: {
    list: string
    detail: string
    save: string
    delete: string
    clone?: string
    archive?: string
  }
  idParam: string
}

export function createEntityHooks<TEntity, TSaveInput = { entity: Partial<TEntity>; isCreate: boolean }>(
  config: EntityHookConfig,
) {
  const keys = {
    all: [config.entityKey] as const,
    list: (params?: Record<string, string>) => [config.entityKey, 'list', params] as const,
    detail: (id: string) => [config.entityKey, 'detail', id] as const,
  }

  function useList(params?: Record<string, string>) {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => api.get<TEntity[]>(config.endpoints.list, params),
    })
  }

  function useDetail(id: string, options?: { enabled?: boolean; staleTime?: number }) {
    const hasId = !!id
    const enabled = options?.enabled !== undefined ? options.enabled && hasId : hasId
    return useQuery({
      queryKey: keys.detail(id),
      queryFn: () => api.get<TEntity>(config.endpoints.detail, { [config.idParam]: id }),
      enabled,
      staleTime: options?.staleTime,
    })
  }

  function useSave() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (input: TSaveInput) => {
        const { isCreate, ...rest } = input as Record<string, unknown>
        const entity = rest.entity ?? rest[Object.keys(rest).find(k => k !== 'isCreate') ?? '']
        return isCreate
          ? api.post<TEntity>(config.endpoints.save, entity)
          : api.put<TEntity>(config.endpoints.save, entity)
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useDelete() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (id: string) => api.delete(config.endpoints.delete, { [config.idParam]: id }),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useClone() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (id: string) => {
        if (!config.endpoints.clone) throw new Error(`Clone not supported for ${config.entityKey}`)
        return api.post(config.endpoints.clone, undefined, { [config.idParam]: id })
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  function useArchive() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, archive }: { id: string; archive: boolean }) => {
        if (!config.endpoints.archive) throw new Error(`Archive not supported for ${config.entityKey}`)
        return api.put(config.endpoints.archive, { [config.idParam]: id, archive })
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    })
  }

  return { useList, useDetail, useSave, useDelete, useClone, useArchive, keys }
}
