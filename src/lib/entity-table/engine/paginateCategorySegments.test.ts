import { describe, expect, it } from 'vitest'
import {
  dataRowOffsetForEntityInCategorySegments,
  pageIndexForEntityInCategorySegments,
  type CategorySegment,
} from './paginateCategorySegments'

describe('pageIndexForEntityInCategorySegments', () => {
  const segments: CategorySegment<{ id: string }>[] = [
    { header: null, items: [{ id: 'a' }, { id: 'b' }] },
    { header: null, items: Array.from({ length: 48 }, (_, i) => ({ id: `c${i}` })) },
    { header: null, items: [{ id: 'target' }, { id: 'z' }] },
  ]

  it('finds offset across segments', () => {
    expect(dataRowOffsetForEntityInCategorySegments(segments, 'target')).toBe(50)
    expect(dataRowOffsetForEntityInCategorySegments(segments, 'missing')).toBeNull()
  })

  it('maps offset to page index', () => {
    expect(pageIndexForEntityInCategorySegments(segments, 'b', 50)).toBe(0)
    expect(pageIndexForEntityInCategorySegments(segments, 'target', 50)).toBe(1)
  })
})
