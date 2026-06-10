import { describe, expect, it } from 'vitest'
import { resolveReportingTimezone } from '@/lib/reportingTimezone'
import { normalizeTimezone } from './timezoneUtils'

describe('resolveReportingTimezone', () => {
  it('maps legacy Etc/GMT identifiers to IANA names accepted by PHP', () => {
    expect(resolveReportingTimezone('Etc/GMT-2')).toBe('Europe/Athens')
    expect(resolveReportingTimezone('Etc/GMT+8')).toBe('America/Los_Angeles')
  })

  it('passes through already-valid IANA names', () => {
    expect(resolveReportingTimezone('Europe/Athens')).toBe('Europe/Athens')
    expect(resolveReportingTimezone('UTC')).toBe('UTC')
  })
})

describe('normalizeTimezone', () => {
  it('normalizes legacy stored values to dropdown IANA ids', () => {
    expect(normalizeTimezone('Etc/GMT-2')).toBe('Europe/Athens')
  })
})
