import { describe, expect, it } from 'vitest'
import { FUNNEL_NAME_MAX_LEN, funnelModalSchema } from '@/schemas/funnel'

describe('funnelModalSchema', () => {
  it('accepts a valid campaign + name and trims the name', () => {
    const result = funnelModalSchema.safeParse({
      idCampaign: 'camp-1',
      funnelName: '  My Funnel  ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.funnelName).toBe('My Funnel')
  })

  it('requires a campaign', () => {
    const result = funnelModalSchema.safeParse({ idCampaign: '', funnelName: 'Funnel' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['idCampaign'])
      expect(result.error.issues[0].message).toBe('Campaign is required')
    }
  })

  it('rejects an empty or whitespace-only funnel name', () => {
    expect(funnelModalSchema.safeParse({ idCampaign: 'c', funnelName: '' }).success).toBe(false)
    expect(funnelModalSchema.safeParse({ idCampaign: 'c', funnelName: '   ' }).success).toBe(false)
  })

  it('enforces the max name length', () => {
    expect(
      funnelModalSchema.safeParse({
        idCampaign: 'c',
        funnelName: 'x'.repeat(FUNNEL_NAME_MAX_LEN),
      }).success,
    ).toBe(true)
    expect(
      funnelModalSchema.safeParse({
        idCampaign: 'c',
        funnelName: 'x'.repeat(FUNNEL_NAME_MAX_LEN + 1),
      }).success,
    ).toBe(false)
  })
})
