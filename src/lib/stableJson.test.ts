import { describe, expect, it } from 'vitest'
import { stableStringify } from '@/lib/stableJson'

describe('stableStringify', () => {
  it('orders object keys deterministically', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })

  it('handles nested objects', () => {
    const a = { z: { b: 1, a: 2 }, x: 0 }
    const b = { x: 0, z: { a: 2, b: 1 } }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })
})
