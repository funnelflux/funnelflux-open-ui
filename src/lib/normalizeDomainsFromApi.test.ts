import { describe, expect, it } from 'vitest'
import { normalizeDomainsFromApiList, normalizeDomainValue } from './normalizeDomainsFromApi'

describe('normalizeDomainValue', () => {
  it('accepts string and object domain responses', () => {
    expect(normalizeDomainValue('track.example.com')).toBe('track.example.com')
    expect(normalizeDomainValue({ domain: 'login.example.com', webRoot: 'https://login.example.com/' })).toBe('login.example.com')
    expect(normalizeDomainValue({ webRoot: 'https://login.example.com/' })).toBe('')
  })
})

describe('normalizeDomainsFromApiList', () => {
  it('marks the tracking default from the separate default-domain response', () => {
    expect(normalizeDomainsFromApiList(['example.com', 'track.example.com'], 'track.example.com')).toEqual([
      {
        id: 'domain:0:example.com',
        domain: 'example.com',
        isDefault: false,
      },
      {
        id: 'domain:1:track.example.com',
        domain: 'track.example.com',
        isDefault: true,
      },
    ])
  })
})
