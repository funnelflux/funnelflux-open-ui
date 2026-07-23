import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_NAME_MAX_LEN,
  campaignCreateSchema,
  campaignEditSchema,
} from '@/schemas/campaign'

describe('campaignCreateSchema', () => {
  it('accepts a valid name and trims it', () => {
    const result = campaignCreateSchema.safeParse({ campaignName: '  My Campaign  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.campaignName).toBe('My Campaign')
  })

  it('rejects an empty name', () => {
    const result = campaignCreateSchema.safeParse({ campaignName: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a whitespace-only name', () => {
    const result = campaignCreateSchema.safeParse({ campaignName: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects names longer than the max', () => {
    const result = campaignCreateSchema.safeParse({
      campaignName: 'x'.repeat(CAMPAIGN_NAME_MAX_LEN + 1),
    })
    expect(result.success).toBe(false)
  })

  it('accepts a name exactly at the max', () => {
    const result = campaignCreateSchema.safeParse({
      campaignName: 'x'.repeat(CAMPAIGN_NAME_MAX_LEN),
    })
    expect(result.success).toBe(true)
  })
})

describe('campaignEditSchema', () => {
  const valid = {
    campaignName: 'Campaign',
    customTokensText: 'token1=one\ntoken2=two',
    accumulatedParamsText: 'utm_source=fb',
  }

  it('accepts valid key=value textareas', () => {
    expect(campaignEditSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts empty textareas and blank lines', () => {
    const result = campaignEditSchema.safeParse({
      ...valid,
      customTokensText: '',
      accumulatedParamsText: 'a=1\n\n  \nb=2',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty-key ("=value") line on the offending field', () => {
    const result = campaignEditSchema.safeParse({ ...valid, customTokensText: '=orphan' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['customTokensText'])
      expect(result.error.issues[0].message).toContain('key')
    }
  })

  it('rejects duplicate keys on the offending field', () => {
    const result = campaignEditSchema.safeParse({
      ...valid,
      accumulatedParamsText: 'dup=1\ndup=2',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['accumulatedParamsText'])
      expect(result.error.issues[0].message).toContain('dup')
    }
  })

  it('treats a bare key line as valid (empty value)', () => {
    const result = campaignEditSchema.safeParse({ ...valid, customTokensText: 'justakey' })
    expect(result.success).toBe(true)
  })
})
