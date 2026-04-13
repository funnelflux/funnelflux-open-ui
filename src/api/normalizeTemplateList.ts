import type { Template } from '@/types/ui'

/** V2 template/list endpoints return JSON string[] of file base names, not { id, name } objects. */
export function normalizeTemplateList(raw: unknown): Template[] {
  if (!Array.isArray(raw)) return []
  if (raw.length > 0 && typeof raw[0] === 'string') {
    return (raw as string[]).map((name) => ({ id: name, name }))
  }
  return raw as Template[]
}
