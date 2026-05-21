import { describe, expect, it } from 'vitest'
import { defaultClonedTrafficSourceName } from '@/lib/trafficSourceCloneDraft'

describe('defaultClonedTrafficSourceName', () => {
  it('appends (copy) to the source name', () => {
    expect(defaultClonedTrafficSourceName('Google Ads')).toBe('Google Ads (copy)')
  })
})
