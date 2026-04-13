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

function categoryEndpoints(entityType: string): {
  list: string
  save: string
  delete: string
} {
  if (entityType === 'page') {
    return {
      list: '/data/page/category/list/',
      save: '/data/page/category/save/',
      delete: '/data/page/category/delete/',
    }
  }
  if (entityType === 'trafficsource') {
    return {
      list: '/data/trafficsource/category/list/',
      save: '/data/trafficsource/category/save/',
      delete: '/data/trafficsource/category/delete/',
    }
  }
  throw new Error(`Unsupported category entity type: ${entityType}`)
}

export function useCategories(entityType: string) {
  return useQuery({
    queryKey: categoryQueryKeys.list(entityType),
    queryFn: async () => {
      const { list } = categoryEndpoints(entityType)
      const response = await api.get<Array<{ idCategory?: string; id?: string; name?: string }>>(
        list,
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
    }) => {
      const { save } = categoryEndpoints(entityType)
      const isNew = !idCategory
      return isNew
        ? api.post(save, { name })
        : api.put(save, { idCategory, name })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryQueryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ entityType, idCategory }: { entityType: string; idCategory: string }) => {
      const { delete: del } = categoryEndpoints(entityType)
      return api.delete(del, { idCategory })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryQueryKeys.all })
    },
  })
}
