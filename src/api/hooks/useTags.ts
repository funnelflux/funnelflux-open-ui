import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Tag } from '@/types/entities'

/** Comma-separated input → non-empty trimmed names (matches PHP `TagCreateRequest.tags`). */
export function parseTagNamesInput(input: string): string[] {
  return input
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

/** Normalizes tag list wire shapes: array of IdNamePair or `{ rows: [...] }`. */
export function normalizeTagListResponse(raw: unknown): Tag[] {
  const rows: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)
      ? ((raw as { rows: unknown[] }).rows)
      : []

  return rows.map((row): Tag => {
    if (!row || typeof row !== 'object') {
      return { id: '', name: '' }
    }
    const r = row as Record<string, unknown>
    const id = String(r.id ?? r.idTag ?? '')
    const name = String(r.name ?? '')
    return { id, name }
  }).filter((t) => t.id.length > 0)
}

export function useTags(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const raw = await api.get<unknown>('/data/tag/list/')
      return normalizeTagListResponse(raw)
    },
    enabled: options?.enabled ?? true,
  })
}

export function useSaveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: string) => {
      const tags = parseTagNamesInput(input)
      if (tags.length === 0) {
        return Promise.reject(new Error('Enter at least one tag name'))
      }
      return api.post('/data/tag/save/', { tags })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idTag, name }: { idTag: string; name: string }) =>
      api.put('/data/tag/update/', { idTag, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}
