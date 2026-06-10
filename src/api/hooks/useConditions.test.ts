import { describe, expect, it } from 'vitest'
import { normalizeConditionListResponse } from '@/api/hooks/useConditions'

describe('normalizeConditionListResponse', () => {
  it('maps OpenAPI IdNamePair array (id, name)', () => {
    expect(
      normalizeConditionListResponse([
        { id: '1', name: 'A' },
        { id: 2, name: 'B' },
      ]),
    ).toEqual([
      { idCondition: '1', conditionName: 'A' },
      { idCondition: '2', conditionName: 'B' },
    ])
  })

  it('accepts idCondition / conditionName keys', () => {
    expect(
      normalizeConditionListResponse([{ idCondition: 'x', conditionName: 'Global' }]),
    ).toEqual([{ idCondition: 'x', conditionName: 'Global' }])
  })

  it('unwraps { rows: [...] }', () => {
    expect(
      normalizeConditionListResponse({
        rows: [{ id: '9', name: 'Z' }],
      }),
    ).toEqual([{ idCondition: '9', conditionName: 'Z' }])
  })

  it('drops rows without id', () => {
    expect(normalizeConditionListResponse([{ name: 'nope' }])).toEqual([])
  })

  it('returns empty for unknown shapes', () => {
    expect(normalizeConditionListResponse(null)).toEqual([])
    expect(normalizeConditionListResponse({})).toEqual([])
  })
})
