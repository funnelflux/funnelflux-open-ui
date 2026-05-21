import { describe, expect, it } from 'vitest'
import { defaultClonedFunnelName } from '@/lib/funnelClone'

describe('defaultClonedFunnelName', () => {
  it('appends (copy) to the base name', () => {
    expect(defaultClonedFunnelName('Main flow')).toBe('Main flow (copy)')
  })

  it('strips a microtime clone suffix before appending (copy)', () => {
    expect(defaultClonedFunnelName('Main flow - 1710000000.1234')).toBe('Main flow (copy)')
  })
})
