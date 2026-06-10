import { describe, expect, it } from 'vitest'
import { isLastDrilldownGroupingDepth } from './drilldownTreeDepth'

describe('isLastDrilldownGroupingDepth', () => {
  it('treats depth N-1 as the last grouping level', () => {
    expect(isLastDrilldownGroupingDepth(0, 2)).toBe(false)
    expect(isLastDrilldownGroupingDepth(1, 2)).toBe(true)

    expect(isLastDrilldownGroupingDepth(0, 1)).toBe(true)
    expect(isLastDrilldownGroupingDepth(2, 3)).toBe(true)
    expect(isLastDrilldownGroupingDepth(1, 3)).toBe(false)
  })

  it('returns false for invalid plan length', () => {
    expect(isLastDrilldownGroupingDepth(0, 0)).toBe(false)
  })
})
