import { describe, expect, it } from 'vitest'
import {
  dataRowOffsetForEntityInCategorySegments,
  pageIndexForEntityInAtomicCategorySegments,
  pageIndexForEntityInCategorySegments,
  paginateAtomicCategorySegments,
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

describe('paginateAtomicCategorySegments', () => {
  type Row = { id: string; _isCategoryHeader?: boolean }

  it('does not split a segment across pages', () => {
    const segments: CategorySegment<Row>[] = [
      {
        header: { id: 'hdr:a', _isCategoryHeader: true },
        items: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
      },
      {
        header: { id: 'hdr:b', _isCategoryHeader: true },
        items: [{ id: 'b1' }],
      },
    ]

    const page = paginateAtomicCategorySegments(segments, 0, 2)
    expect(page.pageRows.map((row) => row.id)).toEqual(['hdr:a', 'a1', 'a2', 'a3'])
    expect(pageIndexForEntityInAtomicCategorySegments(segments, 'b1', 2)).toBe(1)
  })
})
