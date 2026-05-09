import { describe, expect, it } from 'vitest'
import { normalizeTagListResponse, parseTagNamesInput } from '@/api/hooks/useTags'

describe('useTags helpers', () => {
  it('parseTagNamesInput splits comma-separated names', () => {
    expect(parseTagNamesInput(' a, b ,  c ')).toEqual(['a', 'b', 'c'])
  })

  it('normalizeTagListResponse accepts array shape', () => {
    expect(
      normalizeTagListResponse([
        { id: '1', name: 'One' },
        { idTag: '2', name: 'Two' },
      ]),
    ).toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ])
  })

  it('normalizeTagListResponse accepts wrapped rows', () => {
    expect(
      normalizeTagListResponse({
        rows: [{ id: 'x', name: 'X' }],
      }),
    ).toEqual([{ id: 'x', name: 'X' }])
  })

  it('normalizeTagListResponse drops rows without id', () => {
    expect(normalizeTagListResponse([{ name: 'nope' }])).toEqual([])
  })

  it('normalizeTagListResponse returns empty for unknown shape', () => {
    expect(normalizeTagListResponse(null)).toEqual([])
    expect(normalizeTagListResponse({})).toEqual([])
  })
})
