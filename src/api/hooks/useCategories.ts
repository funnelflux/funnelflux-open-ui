import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'

export interface Category {
  idCategory: string
  name: string
}

const categoryQueryKeys = (queryKeys as typeof queryKeys & {
  categories: {
    all: readonly ['categories']
    list: (entityType?: string) => readonly ['categories', 'list', string | undefined]
  }
}).categories

export function useCategories(entityType: string) {
  return useQuery({
    queryKey: categoryQueryKeys.list(entityType),
    queryFn: async () => {
      const response = await api.get<Array<{ idCategory?: string; id?: string; name?: string }>>(
        '/data/categories/list/',
        { type: entityType },
      )

      return response.map((category) => ({
        idCategory: String(category.idCategory ?? category.id ?? ''),
        name: category.name ?? '',
      }))
    },
    enabled: !!entityType,
  })
}

export function useSaveCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      entityType,
      idCategory,
      name,
    }: {
      entityType: string
      idCategory?: string
      name: string
    }) => api.post('/data/categories/save/', { type: entityType, idCategory, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryQueryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ entityType, idCategory }: { entityType: string; idCategory: string }) =>
      api.delete('/data/categories/delete/', { type: entityType, idCategory }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryQueryKeys.all })
    },
  })
}
