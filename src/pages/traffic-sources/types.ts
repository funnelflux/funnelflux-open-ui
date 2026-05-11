import type { EntityGridRow } from '@/api/hooks/useEntityGrid'

export type TrafficSourceGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  _categoryId?: string
} & Record<string, unknown>
