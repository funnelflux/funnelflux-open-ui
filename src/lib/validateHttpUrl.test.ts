import { describe, expect, it } from 'vitest'
import {
  getHttpUrlError,
  httpUrlStringSchema,
  isValidHttpUrl,
  optionalHttpUrlStringSchema,
} from '@/lib/validateHttpUrl'

describe('isValidHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true)
    expect(isValidHttpUrl('http://example.com/path?q=1')).toBe(true)
    expect(isValidHttpUrl('https://example.com/postback?click_id={clickid}')).toBe(true)
  })

  it('rejects malformed and non-http(s) values', () => {
    expect(isValidHttpUrl('')).toBe(false)
    expect(isValidHttpUrl('httpssfsfsfewr')).toBe(false)
    expect(isValidHttpUrl('example.com')).toBe(false)
    expect(isValidHttpUrl('ftp://example.com')).toBe(false)
  })
})

describe('httpUrlStringSchema', () => {
  it('requires a valid http(s) URL', () => {
    expect(httpUrlStringSchema.safeParse('https://example.com').success).toBe(true)
    expect(httpUrlStringSchema.safeParse('httpssfsfsfewr').success).toBe(false)
    expect(httpUrlStringSchema.safeParse('').success).toBe(false)
  })
})

describe('optionalHttpUrlStringSchema', () => {
  it('allows empty values and valid URLs only', () => {
    expect(optionalHttpUrlStringSchema.safeParse('').success).toBe(true)
    expect(optionalHttpUrlStringSchema.safeParse('https://example.com').success).toBe(true)
    expect(optionalHttpUrlStringSchema.safeParse('not-a-url').success).toBe(false)
  })
})

describe('getHttpUrlError', () => {
  it('returns messages for required and optional modes', () => {
    expect(getHttpUrlError('')).toBe('URL is required')
    expect(getHttpUrlError('', { required: false })).toBeUndefined()
    expect(getHttpUrlError('httpssfsfsfewr')).toMatch(/valid URL/)
    expect(getHttpUrlError('https://example.com')).toBeUndefined()
  })
})
